# YAC — Property Listing

A bilingual (English / Arabic, RTL-aware) real-estate listing form.
Static frontend — no build step — with a **Convex** backend.

## Structure

```
yac/
├── index.html          # the form (markup only)
├── css/
│   └── styles.css      # all styles (theme, layout, validation, RTL)
├── js/
│   ├── config.js       # paste your Convex URL here
│   ├── i18n.js         # language / RTL engine + change listeners
│   ├── store.js        # data layer — the ONLY frontend file tied to the backend
│   └── form.js         # validation, conditional sections, uploads, submit
├── convex/             # the backend (TypeScript — no SQL)
│   ├── schema.ts       # the `listings` table definition (= "create tables")
│   ├── listings.ts     # submit (write) + list (read) functions
│   └── http.ts         # HTTP endpoints the browser fetch()es
└── README.md
```

The frontend scripts are plain (non-module) under a single `window.YAC`
namespace, so the page runs by just opening `index.html`.

## Run the frontend

```bash
cd yac
python3 -m http.server 8000   # then open http://localhost:8000
```

With `js/config.js` empty, the form persists to browser `localStorage`
(`yac.listings`) so it's fully testable offline. Fill in the Convex URL to send
real submissions.

## Connecting Convex

Convex is **not** SQL — there are no tables to paste anywhere. Your schema is
`convex/schema.ts`, and Convex creates the table when you run the CLI.

```bash
cd yac
npm install convex          # creates package.json + node_modules
npx convex dev              # log in, links your project, pushes convex/*, watches
```

`npx convex dev`:
- reads `convex/schema.ts` and **creates the `listings` table** automatically,
- deploys `listings.ts` + `http.ts`,
- writes `.env.local` with `CONVEX_DEPLOYMENT` and `CONVEX_URL` (used by the CLI),
- prints your deployment URLs.

Then wire the frontend:
1. Copy your **HTTP Actions URL** — it's your deployment URL ending in
   **`.convex.site`** (NOT `.convex.cloud`).
2. Paste it into [`js/config.js`](js/config.js) → `convexUrl`.
3. Submit the form — it POSTs to `…/submitListing`; check the **Data** tab in the
   Convex dashboard.

The two URLs Convex gives you:
- `…​.convex.cloud` — the client/query API (used by the official client + `CONVEX_URL`)
- `…​.convex.site` — **HTTP Actions**, which is what this app's `fetch()` calls

## Deploying (Vercel + Convex)

The Convex backend and the Vercel-hosted static site deploy separately.

1. **Deploy the backend:** `npx convex deploy` (from your machine or CI). This
   pushes to your **production** deployment and prints its URLs.
2. Put the **production** `.convex.site` URL into `js/config.js`.
3. **Deploy the frontend to Vercel** as a static site:
   - Framework Preset: **Other**, Build Command: **(none)**, Output Directory: **`.`**
   - (Convex's `node_modules` / `convex/` are dev-only; they don't affect hosting.)

**Env variables:** the frontend needs **none** on Vercel — the Convex URL isn't a
secret and lives in `config.js`. `CONVEX_DEPLOYMENT` / `CONVEX_URL` are created
locally by `convex dev` for the CLI. Only if you want Vercel to deploy Convex on
every push do you add a **`CONVEX_DEPLOY_KEY`** (Convex dashboard → Settings →
Deploy Keys) and run `npx convex deploy` in the build.

## What works today

- Full bilingual UI with a language toggle (choice remembered in `localStorage`).
- **Real validation**, bilingual and RTL-aware: required fields, email, phone
  (7–15 digits, accepts Arabic-Indic numerals), area/price positive numbers, consent.
- **Conditional logic:** *Sale* → asking price + payment required; *Rent* → monthly
  rent required and the rent block appears; installment fields for *Installments*.
- **Photo uploads:** drag-and-drop or pick, select several at once, up to 10
  JPG/PNG/WebP, remove individually, live count, object URLs revoked (no leaks).
- On submit the listing is saved via `YAC.store` (Convex if configured, else
  localStorage) and a success panel shows a reference number.

## Photos

Each photo is currently stored as `{ name, size, type, thumbnail }`, where
`thumbnail` is a small downscaled base64 JPEG (kept well under Convex's 1 MB
document limit). To store **full-resolution** originals later, use Convex
[File Storage](https://docs.convex.dev/file-storage): add a `generateUploadUrl`
mutation, upload each file from `form.js`, and store the returned `storageId`
per photo. Only `store.js` + `convex/*` change.

## Admin page (planned — not in this build)

`store.js` already exposes the read side the admin needs — `listListings()`,
`getListing(id)` (and `deleteListing` once a Convex mutation is added). Rows are
normalized to `{ id, created_at, ...fields }` regardless of backend. The flat
shape lets the admin:

- **Search** across name / phone / city / district / project / price, etc.
- **Group by** any field (operation, property type, city, finishing, status…).
- Render large records compactly — a scannable list with an expandable detail
  view and the photo thumbnails already stored per listing.

Planned: `admin.html` + `js/admin.js`, reading `GET /listings` through the same
data layer. Access control = Convex Auth on that route before production.

## Data shape

See the header comment in [`js/store.js`](js/store.js) and
[`convex/schema.ts`](convex/schema.ts) for the authoritative field list.
