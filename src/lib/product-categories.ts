export type ProductCategorySeed = {
  id: string;
  name: string;
  accountId: string | null;
  children: { id: string; name: string; accountId?: string | null }[];
};

/** Two-level purchasing categories, aligned with Jonathan's food expense leaves. */
export const PRODUCT_CATEGORIES: ProductCategorySeed[] = [
  {
    id: "pcat_produce",
    name: "ירקות ופירות",
    accountId: "acc_food_produce",
    children: [
      { id: "pcat_produce_tomato", name: "עגבניות" },
      { id: "pcat_produce_greens", name: "עלים וסלטים" },
      { id: "pcat_produce_onion", name: "בצל ושום" },
      { id: "pcat_produce_potato", name: "תפוחי אדמה" },
      { id: "pcat_produce_other", name: "ירקות אחרים" },
    ],
  },
  {
    id: "pcat_dairy",
    name: "גבינות ומוצרי חלב",
    accountId: "acc_food_dairy",
    children: [
      { id: "pcat_dairy_milk", name: "חלב" },
      { id: "pcat_dairy_cheese", name: "גבינות" },
      { id: "pcat_dairy_yogurt", name: "יוגורט" },
      { id: "pcat_dairy_cream", name: "שמנת" },
    ],
  },
  {
    id: "pcat_dough",
    name: "בצקים וקמחים",
    accountId: "acc_food_dough",
    children: [
      { id: "pcat_dough_flour", name: "קמחים" },
      { id: "pcat_dough_ready", name: "בצקים מוכנים" },
    ],
  },
  {
    id: "pcat_dry",
    name: "רטבים ויבשים",
    accountId: "acc_food_dry",
    children: [
      { id: "pcat_dry_sauce", name: "רטבים" },
      { id: "pcat_dry_oil", name: "שמנים" },
      { id: "pcat_dry_spice", name: "תבלינים ומלח" },
    ],
  },
  {
    id: "pcat_dessert",
    name: "גלידות וקינוחים",
    accountId: "acc_food_dessert",
    children: [{ id: "pcat_dessert_choc", name: "שוקולד ואפייה" }],
  },
  {
    id: "pcat_drinks",
    name: "משקאות",
    accountId: "acc_food_drinks",
    children: [{ id: "pcat_drinks_other", name: "משקאות אחרים" }],
  },
  {
    id: "pcat_packaging",
    name: "כלים ואריזות",
    accountId: "acc_food_packaging",
    children: [{ id: "pcat_pack_other", name: "אריזות חד־פעמי" }],
  },
  {
    id: "pcat_misc",
    name: "שונות מזון",
    accountId: "acc_food_misc",
    children: [{ id: "pcat_misc_other", name: "שונות" }],
  },
];

export const PRODUCT_CATEGORY_ASSIGNMENTS: Record<string, string> = {
  prd_milk: "pcat_dairy_milk",
  prd_cheese: "pcat_dairy_cheese",
  prd_cream: "pcat_dairy_cream",
  prd_yogurt: "pcat_dairy_yogurt",
  prd_ketchup: "pcat_dry_sauce",
  prd_mayo: "pcat_dry_sauce",
  prd_chocolate: "pcat_dessert_choc",
  prd_cherry: "pcat_produce_tomato",
  prd_lettuce: "pcat_produce_greens",
  prd_onion: "pcat_produce_onion",
  prd_potato: "pcat_produce_potato",
  prd_oil: "pcat_dry_oil",
  prd_flour: "pcat_dough_flour",
  prd_salt: "pcat_dry_spice",
};

export const SUPPLIER_DEFAULT_CATEGORIES: Record<string, string> = {
  sup_tnuva: "pcat_dairy",
  sup_strauss: "pcat_dry",
  sup_sharon_veg: "pcat_produce",
  sup_shuk: "pcat_dry",
};
