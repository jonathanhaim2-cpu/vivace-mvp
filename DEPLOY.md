# Deploy Vivac'e · פריסה ליונתן ולרועי

Hebrew first, English below. This first remote demo uses **SQLite** on a **single server with a persistent volume**. That is the path this repo can actually ship without extra cloud databases.

**Do not deploy to Vercel with the default SQLite file.** Vercel’s filesystem is ephemeral: the database and uploaded invoices will vanish. Prefer **Railway** or **Fly.io**.

---

## עברית — מה יונתן שולח לרועי

1. מעלים את האפליקציה ל-Railway (מומלץ) עם Volume קבוע.
2. מגדירים משתני סביבה (למטה).
3. יונתן שולח לרועי ב-WhatsApp:
   - הכתובת הציבורית, למשל `https://vivace-xxx.up.railway.app`
   - הסיסמה מ-`APP_PASSWORD` (או `APP_PASSWORD_ROI` אם הוגדרה סיסמה נפרדת)
4. רועי נכנס דרך **כניסה ל-Vivac'e**, ואחרי זה בוחר **רשת / סניף** כמו במשרד.
5. בלי מפתח AI יופיע באנר: **חסר מפתח AI — שיוך ידני**. עם מפתח, העלאת חשבונית מציעה כרטיס בן לאישור בלחיצה.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | SQLite path, e.g. `file:/data/dev.db` on the volume |
| `APP_PASSWORD` | yes in public deploy | Shared login for Jonathan |
| `APP_PASSWORD_ROI` | no | Same or separate password for Roi |
| `AUTH_SECRET` | recommended | Session HMAC secret (random 32+ chars) |
| `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` | for Gemini | Preferred vision provider (Flash) |
| `OPENAI_API_KEY` | for OpenAI | Used if no Google key, or if `AI_PROVIDER=openai` |
| `AI_PROVIDER` | no | `google` or `openai` (auto-detect if omitted) |
| `AI_MONTHLY_BUDGET_USD` | no | Soft cap; analysis stops when estimated spend would exceed it |
| `AI_USD_PER_CALL` | no | Override estimated USD per call |
| `GEMINI_MODEL` | no | Default `gemini-2.0-flash` |
| `OPENAI_VISION_MODEL` | no | Default `gpt-4o-mini` |
| `UPLOAD_DIR` | recommended | e.g. `/data/uploads` on the same volume |
| `PORT` | host-set | Railway/Fly set this; `npm start` respects it |

Never commit real keys. `.env` is gitignored.

### Provider order

1. If `AI_PROVIDER=google` and a Google key exists → Gemini.
2. If `AI_PROVIDER=openai` and `OPENAI_API_KEY` exists → OpenAI.
3. Else Google key → Gemini Flash.
4. Else OpenAI key → OpenAI.
5. Else manual classify + Hebrew banner.

---

## Recommended host: Railway (SQLite + volume)

1. Create a new project from this Git repo.
2. Add a **Volume**, mount at `/data`.
3. Build command: `npm ci && npm run build`
4. Start command: `npm run start:prod`
5. Set env:

```
DATABASE_URL=file:/data/dev.db
UPLOAD_DIR=/data/uploads
APP_PASSWORD=choose-a-long-shared-password
APP_PASSWORD_ROI=
AUTH_SECRET=generate-a-long-random-string
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=
AI_MONTHLY_BUDGET_USD=5
```

`start:prod` runs `db:ready` (Prisma generate + `db push` + **structural seed**: chart, category tree, tiny settings). It does **not** recreate the old Tnuva/Herzliya demo. Known demo IDs are wiped if they are still in the SQLite file. Set `SEED_DEMO=true` only if you explicitly want that catalog.

### Fly.io

Same idea: persistent volume, `DATABASE_URL=file:/data/dev.db`, `UPLOAD_DIR=/data/uploads`, `npm run start:prod`.

### Origin → Vercel (Jonathan’s connector)

`vercel.json` is in the repo (`framework: nextjs`, `prisma generate && next build`).

**SQLite will not persist on Vercel.** Each deploy/cold start can lose `dev.db` and uploaded invoices. For a real Roi demo on Vercel you need a hosted DB **before** going live:

1. Create a **Turso** (libSQL) or **Neon/Vercel Postgres** database.
2. If you switch to Postgres, change `prisma/schema.prisma` `datasource.provider` to `postgresql` and re-seed.
3. Turso can keep the current SQLite schema if you point Prisma at a `libsql://…` URL (Prisma 6 + `@prisma/adapter-libsql`).
4. Invoice files: add **Vercel Blob** (or S3) and set `UPLOAD_DIR` only on a volume host. On Vercel, `public/uploads` is ephemeral.

**If you still import the Origin repo to Vercel for a branding preview:**

1. Vercel → Add New Project → the Origin Git repo (provider `cursor-origin` if offered).
2. Root directory: repo root. Framework: Next.js (from `vercel.json`).
3. Set Production env vars (never commit them):

```
DATABASE_URL=          # hosted Turso/Postgres — not file:./dev.db
APP_PASSWORD=
APP_PASSWORD_ROI=
AUTH_SECRET=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=
AI_MONTHLY_BUDGET_USD=5
```

4. After first deploy, run seed once against the hosted DB (`npx prisma db push && npx tsx prisma/seed.ts` with that `DATABASE_URL`).
5. Send Roi the `*.vercel.app` HTTPS URL + `APP_PASSWORD`.

**Recommended for the first shared demo:** Railway/Fly + volume (SQLite above). Use Vercel once Turso/Postgres exists.

This environment’s Vercel MCP listed **no teams**, so the project was not created from here. Jonathan can import from the Vercel dashboard in one click.

---

## Local production-style check

```bash
cp .env.example .env
# set APP_PASSWORD and optional AI keys in .env
npm install
npm run build
npm run start:prod
```

Open http://127.0.0.1:43145 — you should see **כניסה ל-Vivac'e** if `APP_PASSWORD` is set.

---

## English — how Jonathan shares access with Roi

1. Deploy to Railway with a volume (see above).
2. Set `APP_PASSWORD` (and optional `APP_PASSWORD_ROI`).
3. Send Roi the HTTPS URL + the password (not in the repo, not in a screenshot of `.env`).
4. Roi logs in at **כניסה ל-Vivac'e**. The רשת/סניף toggle still works after login.
5. If no AI key is configured, classification stays manual. Settings → **שימוש ב-AI** shows call count and estimated USD.

Seed on boot (`db:ready`) upserts Jonathan’s chart of accounts and the empty category tree. It does not recreate demo suppliers, products, orders, or dishes. `SEED_DEMO=true` is opt-in and off by default.
