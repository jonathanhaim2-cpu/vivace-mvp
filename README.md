# Vivac'e · ויואצ'ה — Purchase, inventory & food cost

Hebrew RTL web app for **Vivac'e** (עוסק מורשה **204754121**, owner: Roi / רועי).  
Product owner: Jonathan.

Zester-like modules: בית, רכש, ספקים, קליטה, חשבוניות, מלאי, Food Cost, דוחות.

---

## English

### Run locally

```bash
npm install
npm run dev
```

Serves [http://127.0.0.1:43145](http://127.0.0.1:43145). `predev` generates Prisma Client, pushes SQLite, and seeds demo data (idempotent upserts).

```
DATABASE_URL="file:./dev.db"
```

Reset: `npm run db:reset`

### What works now

**Purchasing (original MVP)**
1. Suppliers + products CRUD, delivery windows, WhatsApp order deep link.
2. Goods receipt vs invoice, photo required, price-change approval (רשת / סניף toggle).

**Accountant + chart of accounts**
3. Jonathan’s hierarchical chart is seeded (leaf assignment, parent rollup).
4. Classify invoice photos to a **leaf** card; unclassified bulk imports wait in a queue.
5. Manual upload + **ייבוא מתיקייה** (inbox-pull stand-in).
6. **חיבור מייל** settings stub (no Gmail OAuth in this slice).
7. Monthly **accountant package**: ZIP of classified files + Hebrew mailto with parent/leaf totals.
8. **דוח תחילת חודש** for a selected month (defaults to previous month). Seeded sample: August 2026.

**Inventory + food cost**
9. Per-branch inventory count sessions (open / submitted).
10. Dishes and intermediates with a BOM (raw product **or** another dish).
11. Theoretical food cost from agreed supplier prices; cost % vs a configurable standard. Flag if over.
12. **TODO** placeholder: ייבוא מכירות מ-Tabit.

### Out of scope

- Real Gmail/IMAP OAuth (flag left off on purpose)
- Tabit sales import
- AI reports / franchise P&L
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

פורט **43145**. הדמו כולל ספקים, הזמנות, כרטיסי הנה״ח, חשבוניות לאוגוסט 2026, ספירת מלאי פתוחה בהרצליה, בצק+רוטב+פיצה מרגריטה וסלט.

### מה יש

- רכש וקליטה כמו קודם
- סיווג לכרטיס בן, חבילת ZIP להנה״ח, דוח חודשי
- ייבוא מרובה במקום סנכרון מייל
- ספירות מלאי
- Food Cost תיאורטי עם מנות ביניים

### מה אין

OAuth למייל, Tabit, דוחות AI, רווחיות זכיין.

---

Toggle **סניף** להזמנות וספירות; **רשת** לאישור מחירון. חודש הדוגמה להנה״ח: **אוגוסט 2026**.
