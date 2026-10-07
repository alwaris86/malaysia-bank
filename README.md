# malaysia-bank

Names, codes and logos of banks operating in Malaysia, as plain files that any application can copy: one `banks.json`
and a folder of logos per bank. Started for the payee forms of an NGO's payment-approval app, published so anyone can use it.

**Status:** all 20 banks have a logo. Each is recorded with where it came from and whether the bank's brand rules allow it —
several are still marked **not yet confirmed**; check `usage_note` before relying on one.

## What is in `banks.json`

| Field | Meaning |
| --- | --- |
| `short_name` | The short code, unique, used to join with another system (`MAYBANK`, `PBB`, …). |
| `name` | The legal full name. Also the logo's alt text. |
| `swift_code`, `swift_suggested_unverified` | The BIC. The second is a suggestion that has **not** been checked: do not rely on it until it moves into `swift_code`. |
| `country`, `scope`, `account_lengths` | Where it operates and the valid digit counts of its account numbers. |
| `name_ms`, `aliases` | The Malay name and other names people search by. |
| `type`, `brand_color`, `website` | `commercial`, `islamic`, `investment`, `development`, `digital` or `e-wallet`; one `#RRGGBB`; the bank's site. |
| `status`, `replaced_by`, `since` | `active`, `renamed` or `merged`, and what replaced it. |
| `logo.full`, `logo.icon`, `logo.dark`, `logo.master` | Paths under `logos/`: the full logo, a square icon, a dark-mode version if the logo needs one (all PNG), and the vector master (SVG) where there is one. |
| `logo.source_url`, `retrieved_on`, `usage_note`, `checked_by` | **Where the logo came from**, when, what the bank's brand rules allow, and who looked. Required whenever a logo is present. |

## The files

**One format for everything the app uses: PNG.** Under `logos/<short_name in lower case>/`:

| File | What it is |
| --- | --- |
| `logo.png` | The logo, trimmed, on a **transparent** ground, at most 384 px on its long side. |
| `icon.png` | A 256 × 256 square for small sizes: the logo centred on a **white rounded tile**, so it reads on light and dark screens. A mark that already fills a square (BIMB, Bank Rakyat) is clipped to a rounded square instead. |
| `logo-dark.png` | Only if a bank publishes a version meant for dark screens. |
| `master.svg` | Only where the bank's own file is a true vector. It is the master the PNGs were made from, kept so they can be remade sharper; the app does not use it. |

**Why PNG and not SVG.** SVG is the better format when the source is a vector, and that is why the masters are kept. Most banks publish
only a PNG or a photo-like image, and turning one of those into an SVG means tracing or redrawing the bank's logo, which this repository does not do.
So one format that every source can reach, that every app (phone, web, PDF, e-mail) can show, and that needs no SVG library, is the standard.

A logo is **never recoloured, redrawn or given effects**. The reshaping is limited to removing a plain white background around the edge, trimming the
empty margin, and placing it on a tile. Where a source was small (under 256 px) the icon is enlarged and is a little soft.

## Rules for a file

- PNG: a real PNG; `icon.png` exactly 256 × 256 and under 64 KB; `logo.png` and `logo-dark.png` at most 512 px and 100 KB.
- `master.svg`: a `viewBox`, under 20 KB; no scripts, event handlers, `<image>`, `<foreignObject>`, `data:` addresses or references outside the file.

`node scripts/check.mjs` checks all of this and the manifest. It needs only Node, and it must pass before a change is merged.

## Using it

Copy the files at a **fixed commit or tag**, not a live link: a logo that changes under you changes what your users see.
Refer to a bank by `short_name`.

## Licence and trademarks

See [NOTICE.md](NOTICE.md). In short: the data and tools are CC0; **the logos belong to their owners** and are included only so
a person can recognise which bank they are paying.
