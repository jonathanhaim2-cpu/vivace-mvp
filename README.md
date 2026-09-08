# Vivac'e · ויואצ'ה — Purchase, inventory & food cost

Hebrew RTL web app for **Vivace** / **ויואצ'ה** — Famiglia & Pizza ([vivace-pizza.com](https://vivace-pizza.com)), עוסק מורשה **204754121**, owner: Roi / רועי.  
Product owner: Jonathan Haimoff.

Brand: terracotta `#b34b3c`, cream `#F9F7F2`, capsule buttons. Logos in `public/brand/`.

Zester-like modules: בית, רכש, ספקים, קליטה, חשבוניות, מלאי, Food Cost, דוחות, הגדרות.

Remote-ready: shared-password login + optional vision LLM that proposes a **leaf** card from Jonathan’s chart of accounts.

---

## English

### Run locally

```bash
npm install
npm run dev
```

Serves [http://127.0.0.1:43145](http://127.0.0.1:43145). `predev` generates Prisma Client, pushes SQLite, and seeds demo data (idempotent upserts).

Copy `.env.example` → `.env`. With no `APP_PASSWORD`, the app stays open for local work.

```
DATABASE_URL="file:./dev.db"
```

Reset: `npm run db:reset`  
Production-style: `npm run build && npm run start:prod`

### Remote login

Set `APP_PASSWORD` (and optional `APP_PASSWORD_ROI`). Visitors hit **כניסה ל-Vivac'e**; a cookie session unlocks the app. `/login` and static assets stay public. The רשת/סניף toggle is unchanged after login.

### Invoice AI

On photo/PDF upload or pending-import analyze:

- Extract supplier, date, total when visible
- Propose the best **leaf** from the full chart (parents are in the prompt; assignment is leaf-only)
- UI shows suggestion + confidence; one-tap confirm
- Confidence under 55% asks the user to review (Roi’s request)
- Provider: `AI_PROVIDER=openai|google`. Prefers Gemini Flash if `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` is set, else OpenAI
- No key → manual classify + banner **חסר מפתח AI — שיוך ידני**
- Settings page logs AI call count and estimated USD; `AI_MONTHLY_BUDGET_USD` is a soft cap

Secrets are env-only. Never commit keys.

### What works now

**Purchasing**
1. Suppliers + products CRUD, delivery windows, WhatsApp order deep link.
2. Goods receipt vs invoice, photo required, price-change approval (רשת / סניף toggle).

**Accountant + chart of accounts**
3. Jonathan’s hierarchical chart is seeded (leaf assignment, parent rollup).
4. Classify invoice photos to a **leaf** card; unclassified imports wait in a queue.
5. Manual upload + **ייבוא מתיקייה**, with AI suggestion when a key is set.
6. **חיבור מייל** settings stub (no Gmail OAuth).
7. Monthly **accountant package**: ZIP + Hebrew mailto.
8. **דוח תחילת חודש** (defaults to previous month). Seeded sample: August 2026.

**Inventory + food cost**
9. Per-branch inventory counts.
10. Dishes / intermediates with a BOM.
11. Theoretical food cost vs a standard %. **TODO:** Tabit sales import.

**Catalog (Roi feedback)**
12. Two-level product categories with dashboard fill vs target % of forecast turnover.
13. Home tiles: forecast fill, price/document anomalies, goods to receive, orders to place.
14. Supplier active flag (hidden from franchisee ordering), per-branch availability, payment/accounting/partner fields.
15. Franchisee vs network price lists — branch never sees HQ rebate/plus.
16. Excel/CSV product import under a supplier. Plants Council URL + fixed % is a **manual stub** (no live scrape).
17. Goods-receipt scan: upload a delivery note to prefill qty/prices. No AI key → heuristic (ordered qty) + banner. Qty stays integer.

### Database + Vercel

SQLite file (`prisma/dev.db`) is the first remote-demo store. On Railway/Fly put it on a **persistent volume** (`DATABASE_URL=file:/data/dev.db`, `UPLOAD_DIR=/data/uploads`).

`vercel.json` is ready for Origin → Vercel, but **do not use `file:./dev.db` on Vercel** (ephemeral FS). Use Turso or Postgres + Blob for invoices. See **[DEPLOY.md](./DEPLOY.md)**.

### Out of scope

- Real Gmail/IMAP OAuth
- Tabit sales import
- Franchise P&L
- WhatsApp Business API

### Stack

Next.js 16 App Router · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 · SQLite

---

## עברית

### הרצה

```bash
npm install
npm run dev
```

פורט **43145**. הדמו כולל ספקים, הזמנות, כרטיסי הנה״ח, חשבוניות לאוגוסט 2026, ספירת מלאי בהרצליה, ומנות Food Cost.

לשיתוף עם רועי: ראו `DEPLOY.md` — סיסמה ב-`APP_PASSWORD`, כתובת HTTPS, ומפתח AI אופציונלי.

### מה יש

- רכש וקליטה כמו קודם
- כניסה בסיסמה משותפת (כשיש `APP_PASSWORD`)
- ניתוח חשבונית ב-AI + אישור בלחיצה, או שיוך ידני
- סיווג לכרטיס בן, חבילת ZIP להנה״ח, דוח חודשי
- ספירות מלאי ו-Food Cost תיאורטי

Toggle **סניף** להזמנות וספירות; **רשת** לאישור מחירון. חודש הדוגמה להנה״ח: **אוגוסט 2026**.
