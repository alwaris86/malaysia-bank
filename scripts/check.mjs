#!/usr/bin/env node
/**
 * scripts/check.mjs — is this repository safe to copy into the app?
 *
 *   node scripts/check.mjs
 *
 * No dependencies. Exits 1 and says why when something is wrong, so it can run in CI
 * before a release is tagged.
 *
 * It checks banks.json against the files, and every SVG and PNG against the rules in README.md:
 * a viewBox; under 20 KB; no scripts, no event handlers, no <image>, no <foreignObject>,
 * no data: URIs, no references to anything outside the file. An SVG can carry code, and
 * these files end up inside an application that handles money.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];
const fail = (msg) => problems.push(msg);

// ------------------------------------------------------------------ the SVGs
const MAX_BYTES = 20 * 1024;
const FORBIDDEN = [
  [/<script/i, 'a <script> element'],
  [/\son[a-z]+\s*=/i, 'an event handler attribute (onload, onclick…)'],
  [/<image[\s>]/i, 'an <image> element (embedded or linked raster)'],
  [/<foreignObject/i, 'a <foreignObject>'],
  [/data:/i, 'a data: URI'],
  [/javascript:/i, 'a javascript: address'],
  [/(?:href|src)\s*=\s*["'](?!#)/i, 'a reference outside the file (href or src that is not #id)'],
  [/@import|url\(\s*["']?(?!#)/i, 'a CSS import or url() that is not #id'],
  [/<!ENTITY/i, 'an XML entity declaration'],
];

function files(dir, ext) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p, ext));
    else if (name.toLowerCase().endsWith(ext)) out.push(p);
  }
  return out;
}
const svgs = (dir) => files(dir, '.svg');
const pngs = (dir) => files(dir, '.png');

for (const file of svgs(join(root, 'logos'))) {
  const rel = file.slice(root.length + 1);
  const text = readFileSync(file, 'utf8');
  if (Buffer.byteLength(text) > MAX_BYTES) fail(`${rel}: over 20 KB`);
  if (!/<svg[^>]*\sviewBox\s*=/i.test(text)) fail(`${rel}: no viewBox`);
  for (const [re, what] of FORBIDDEN) if (re.test(text)) fail(`${rel}: contains ${what}`);
}

// ------------------------------------------------------------------ the PNGs
// Used where a bank publishes no SVG. logo.png is the trimmed logo on a transparent ground,
// icon.png a 256 square tile. Real PNGs only, small, and no bigger than a screen icon needs.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const file of pngs(join(root, 'logos'))) {
  const rel = file.slice(root.length + 1);
  const buf = readFileSync(file);
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) { fail(`${rel}: not a PNG file`); continue; }
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const isIcon = /icon\.png$/i.test(file);
  if (isIcon && (w !== 256 || h !== 256)) fail(`${rel}: an icon is 256x256, this is ${w}x${h}`);
  if (!isIcon && (w > 512 || h > 512)) fail(`${rel}: over 512 px (${w}x${h})`);
  const limit = isIcon ? 96 * 1024 : 100 * 1024;
  if (buf.length > limit) fail(`${rel}: ${(buf.length / 1024).toFixed(0)} KB, over the ${limit / 1024} KB limit`);
}

// ------------------------------------------------------------- the manifest
let manifest;
try {
  manifest = JSON.parse(readFileSync(join(root, 'banks.json'), 'utf8'));
} catch (e) {
  fail(`banks.json: ${e.message}`);
}

if (manifest) {
  const seen = new Set();
  for (const b of manifest.banks ?? []) {
    const who = b.short_name || '(no short_name)';
    if (!b.short_name) fail('a bank has no short_name');
    if (seen.has(b.short_name)) fail(`${who}: listed twice`);
    seen.add(b.short_name);
    for (const kind of ['full', 'icon', 'dark', 'master']) {
      const path = b.logo?.[kind];
      if (!path) continue;
      // what the app uses is PNG; the one SVG a bank may have is kept as the master it was made from
      const want = kind === 'master' ? /\.svg$/i : /\.png$/i;
      if (!want.test(path)) fail(`${who}: logo.${kind} must be ${kind === 'master' ? 'an .svg' : 'a .png'}`);
      else if (!existsSync(join(root, 'logos', path))) fail(`${who}: logo.${kind} points at logos/${path}, which does not exist`);
    }
    if (b.logo?.full || b.logo?.icon || b.logo?.dark) {
      if (!b.logo.source_url) fail(`${who}: a logo with no source_url`);
      if (!b.logo.retrieved_on) fail(`${who}: a logo with no retrieved_on date`);
      if (!b.logo.usage_note) fail(`${who}: a logo with no usage_note`);
      // where it came from, provably: a web address, the time, and a hash of the bytes received
      if (b.logo.source_kind) {
        if (!/^https:\/\//.test(b.logo.source_url ?? '')) fail(`${who}: source_url is not an https address`);
        if (!/^[0-9a-f]{64}$/.test(b.logo.original_sha256 ?? '')) fail(`${who}: no original_sha256 (SHA-256 of the file as received)`);
        if (!b.logo.retrieved_at) fail(`${who}: no retrieved_at`);
      } else {
        notes.push(`${who}: source not recorded to the standard (no address, time and hash) — replace it from the bank's own page`);
      }
    }
    if (b.brand_color && !/^#[0-9a-fA-F]{6}$/.test(b.brand_color)) fail(`${who}: brand_color is not #RRGGBB`);
  }
}

if (notes.length) console.log(notes.map((n) => `note: ${n}`).join('\n'));
if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`ok — ${manifest?.banks?.length ?? 0} banks, ${svgs(join(root, 'logos')).length} SVG and ${pngs(join(root, 'logos')).length} PNG file(s) checked.`);
