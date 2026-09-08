export type ProductCategorySeed = {
  id: string;
  name: string;
  accountId: string | null;
  targetPercent?: number;
  children: { id: string; name: string; accountId?: string | null }[];
};

/** Default purchase % of monthly forecast turnover (HQ can edit on the home tile). */
export const PARENT_CATEGORY_TARGETS: Record<string, number> = {
  pcat_produce: 3.32,
  pcat_dairy: 11.45,
  pcat_dough: 2.47,
  pcat_dry: 5.89,
  pcat_dessert: 0.7,
  pcat_drinks: 2.5,
  pcat_packaging: 3.74,
  pcat_misc: 0.54,
};

/** Two-level purchasing categories, aligned with Jonathan's food expense leaves. */
export const PRODUCT_CATEGORIES: ProductCategorySeed[] = [
  {
    id: "pcat_produce",
    name: "ירקות ופירות",
    accountId: "acc_food_produce",
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_produce,
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
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_dairy,
    children: [
      { id: "pcat_dairy_milk", name: "חלב" },
      { id: "pcat_dairy_cheese", name: "גבינות" },
      { id: "pcat_dairy_yogurt", name: "יוגורט" },
      { id: "pcat_dairy_cream", name: "שמנת" },
    ],
  },
  {
    id: "pcat_dough",
    name: "פסטות",
    accountId: "acc_food_dough",
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_dough,
    children: [
      { id: "pcat_dough_flour", name: "קמחים" },
      { id: "pcat_dough_ready", name: "בצקים מוכנים" },
    ],
  },
  {
    id: "pcat_dry",
    name: "רטבים ויבשים",
    accountId: "acc_food_dry",
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_dry,
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
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_dessert,
    children: [{ id: "pcat_dessert_choc", name: "שוקולד ואפייה" }],
  },
  {
    id: "pcat_drinks",
    name: "משקאות",
    accountId: "acc_food_drinks",
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_drinks,
    children: [{ id: "pcat_drinks_other", name: "משקאות אחרים" }],
  },
  {
    id: "pcat_packaging",
    name: "כלים ואריזות",
    accountId: "acc_food_packaging",
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_packaging,
    children: [{ id: "pcat_pack_other", name: "אריזות חד־פעמי" }],
  },
  {
    id: "pcat_misc",
    name: "שונות",
    accountId: "acc_food_misc",
    targetPercent: PARENT_CATEGORY_TARGETS.pcat_misc,
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
