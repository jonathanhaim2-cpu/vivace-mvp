# Vivac'e · ויואצ'ה — Purchase & inventory MVP

Hebrew RTL web app for **Vivac'e** (עוסק מורשה **204754121**, owner: Roi / רועי).  
Product owner: Jonathan. This repository is the approved MVP slice: purchasing, goods receipt, and invoice capture for the network back office and each branch phone.

The UX follows a Zester-like information architecture (בית, רכש, ספקים, קליטת סחורה, חשבוניות) without copying Zester as a product.

---

## English

### Run locally

```bash
npm install
npm run dev
```

`npm run dev` generates Prisma Client, pushes the SQLite schema, seeds demo data if needed, and starts Next.js on [http://127.0.0.1:43145](http://127.0.0.1:43145).

Copy `.env.example` to `.env` if you do not already have one:

```
DATABASE_URL="file:./dev.db"
```

Reset demo data:

```bash
npm run db:reset
```

### What the MVP includes

1. **Suppliers CRUD** — company, tax id, agent, document type (tax invoice / delivery note / mix per product), WhatsApp number for orders, driver, delivery days, cutoff time + reminder hours (shown in UI), optional weekly order budget per franchisee.
2. **Products per supplier** — name, SKU, notes, stock standard between deliveries (used to suggest order qty), agreed price, discount %, carton→bags→units, VAT included/excluded.
3. **Orders** — pick supplier (delivery window status), pick products + qty, summary + driver notes, persist. **Send via WhatsApp** opens `https://wa.me/<phone>?text=<Hebrew summary>`.
4. **Goods receipt** — against an order, edit qty/price, flag missing / wrong price. Price change → pending back-office approval (רשת). Approve writes the new fixed price; reject marks credit-request needed. Invoice/delivery-note photo is required and stored under `public/uploads`. “Forward to accountant” is a stub: queued flag + mailto + ZIP download.
5. **Expense stub** — categories עלות מזון / עובדים / חשמל / אחר, assign a photo to a category, optional short “voice note” transcript field. Manual upload path only.

Simple **רשת / סניף** role toggle (cookie). No real auth.

### Out of scope (do not expect these)

- Foodcost recipes / BOM
- Tabit POS integration
- AI reports
- Franchise profit statements
- Real WhatsApp Business API
- Email inbox sync for invoices (explicit TODO on the Invoices screen)
- Push reminders at cutoff

### Suggested next phases

1. Real auth + branch membership
2. Email inbox / accountant forwarding
3. Foodcost recipes and theoretical vs actual
4. Tabit sales hook
5. Franchise P&L and network reports

### Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 · SQLite

---

## עברית

### הרצה מקומית

```bash
npm install
npm run dev
```

השרת עולה על פורט **43145**. הדמו נזרע אוטומטית (סניף הרצליה / תל אביב, תנובה, שטראוס, ירקות השרון, מחסני השוק, הזמנה פתוחה וקליטה שממתינה לאישור מחיר).

### מה יש ב-MVP

- ספקים ומוצרים בעברית, כולל ימי אספקה, שעת סגירה, וואטסאפ ונהג
- הזמנה נוחה לנייד + קישור וואטסאפ עם טקסט מוכן
- קליטת סחורה מול הזמנה, צילום חובה, אישור שינוי מחיר במשרד הרשת
- חשבוניות: העלאה ידנית ושיוך לקטגוריית הוצאה. **סנכרון תיבת מייל — מחוץ ל-MVP**

### מה אין

מתכוני Foodcost, Tabit, דוחות AI, רווחיות זכיין, API אמיתי לוואטסאפ.

---

Built for Vivac'e operations. Toggle **סניף** to place orders; toggle **רשת** to approve price changes on the seeded תנובה receipt.
