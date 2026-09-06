export type AccountKind = "EXPENSE" | "INCOME";

export type ChartChild = {
  id: string;
  name: string;
};

export type ChartParent = {
  id: string;
  name: string;
  kind: AccountKind;
  children: ChartChild[];
};

/**
 * Jonathan's accountant chart of accounts for Vivac'e.
 * Order is significant: expenses follow this card structure exactly.
 * Assignment is always a leaf; parents exist for rollup reporting.
 */
export const CHART_OF_ACCOUNTS: ChartParent[] = [
  {
    id: "acc_food",
    name: "עלויות מזון",
    kind: "EXPENSE",
    children: [
      { id: "acc_food_produce", name: "ירקות ופירות" },
      { id: "acc_food_dough", name: "בצקים וקמחים" },
      { id: "acc_food_dairy", name: "גבינות ומוצרי חלב" },
      { id: "acc_food_pasta", name: "פסטות" },
      { id: "acc_food_dry", name: "רטבים ויבשים" },
      { id: "acc_food_dessert", name: "גלידות וקינוחים" },
      { id: "acc_food_misc", name: "שונות מזון" },
      { id: "acc_food_drinks", name: "משקאות" },
      { id: "acc_food_packaging", name: "כלים ואריזות" },
    ],
  },
  {
    id: "acc_payroll",
    name: "הוצאות שכר",
    kind: "EXPENSE",
    children: [
      { id: "acc_payroll_managers", name: "מנהלים" },
      { id: "acc_payroll_severance", name: "פיצויים" },
      { id: "acc_payroll_kitchen", name: "עובדי מטבח" },
      { id: "acc_payroll_kashrut", name: "משגיחי כשרות" },
      { id: "acc_payroll_counter", name: "עובדי דלפק" },
      { id: "acc_payroll_owner", name: "שכר בעלים" },
      { id: "acc_payroll_taxis", name: "מוניות להסעת העובדים" },
    ],
  },
  {
    id: "acc_shipping",
    name: "עלויות שילוח",
    kind: "EXPENSE",
    children: [
      { id: "acc_shipping_co1", name: "שירותי שליחויות חברה 1" },
      { id: "acc_shipping_co2", name: "שירותי שליחויות חברה 2" },
    ],
  },
  {
    id: "acc_commissions",
    name: "עמלות מהמכירות",
    kind: "EXPENSE",
    children: [
      { id: "acc_comm_credit", name: "עמלות אשראי" },
      { id: "acc_comm_cash", name: "עמלות הפקדת מזומן והמחאות" },
      { id: "acc_comm_tenbis", name: "עמלות תן ביס" },
      { id: "acc_comm_cibus", name: "עמלות סיבוס" },
      { id: "acc_comm_goodi", name: "עמלות גודיס" },
      { id: "acc_comm_wolt_delivery", name: "עמלות וולט משלוחים" },
      { id: "acc_comm_wolt", name: "עמלות וולט" },
      { id: "acc_comm_deposits", name: "הכנסות מפקדונות" },
    ],
  },
  {
    id: "acc_premises",
    name: "הוצאות שטח",
    kind: "EXPENSE",
    children: [
      { id: "acc_premises_store_rent", name: "שכר דירה חנות" },
      { id: "acc_premises_warehouse_rent", name: "שכר דירה מחסן" },
      { id: "acc_premises_mgmt", name: "דמי ניהול" },
      { id: "acc_premises_arnona", name: "ארנונה ושילוט" },
    ],
  },
  {
    id: "acc_ads",
    name: "הוצאות פרסום",
    kind: "EXPENSE",
    children: [
      { id: "acc_ads_local", name: "פרסום ושיווק מקומי" },
      { id: "acc_ads_fund", name: "קרן פרסום" },
      { id: "acc_ads_music", name: "מוסיקה ותמלוגים" },
      { id: "acc_ads_print", name: "דפוס ושונות" },
    ],
  },
  {
    id: "acc_it",
    name: "הוצאות מחשוב ותקשורת",
    kind: "EXPENSE",
    children: [
      { id: "acc_it_pos", name: "קופות ותוכנות ניהול" },
      { id: "acc_it_software", name: "תוכנות ומחשוב" },
      { id: "acc_it_telecom", name: "תקשורת אינטרנט וטלפוניה" },
    ],
  },
  {
    id: "acc_energy",
    name: "הוצאות אנרגיה ומים",
    kind: "EXPENSE",
    children: [
      { id: "acc_energy_electricity", name: "חשמל" },
      { id: "acc_energy_gas", name: "גז" },
      { id: "acc_energy_water", name: "מים" },
    ],
  },
  {
    id: "acc_maintenance",
    name: "הוצאות אחזקה",
    kind: "EXPENSE",
    children: [
      { id: "acc_maint_cleaning", name: "חומרי ניקוי שלא כלולים בחד פעמי [יש להפריד]" },
      { id: "acc_maint_repairs", name: "אחזקה ותיקונים" },
      { id: "acc_maint_uniforms", name: "ביגוד" },
      { id: "acc_maint_kitchenware", name: "קניית כלים וצרכי מטבח" },
      { id: "acc_maint_pest", name: "הדברה" },
      { id: "acc_maint_dishwasher", name: "מדיח כלים" },
    ],
  },
  {
    id: "acc_admin",
    name: "הנהלה וכלליות",
    kind: "EXPENSE",
    children: [
      { id: "acc_admin_accounting", name: "הנהלת חשבונות ודוח שנתי" },
      { id: "acc_admin_legal", name: "משפטיות" },
      { id: "acc_admin_consulting", name: "ייעוץ מקצועי" },
      { id: "acc_admin_network_fee", name: "דמי ניהול רשת" },
      { id: "acc_admin_office", name: "ציוד משרדי" },
      { id: "acc_admin_fees", name: "אגרות" },
      { id: "acc_admin_insurance", name: "ביטוח" },
    ],
  },
  {
    id: "acc_income",
    name: 'הכנסות ללא מע"מ',
    kind: "INCOME",
    children: [
      { id: "acc_inc_credit", name: "אשראי" },
      { id: "acc_inc_cash", name: "הפקדת מזומן והמחאות" },
      { id: "acc_inc_hakafa", name: "הקפה" },
      { id: "acc_inc_tenbis_dine", name: "תן ביס ישיבה" },
      { id: "acc_inc_cibus_dine", name: "סיבוס ישיבה" },
      { id: "acc_inc_goodi_dine", name: "גודיס ישיבה" },
      { id: "acc_inc_tenbis_delivery", name: "תן ביס משלוחים" },
      { id: "acc_inc_scoober", name: "סקובר" },
      { id: "acc_inc_cibus_delivery", name: "סיבוס משלוחים" },
      { id: "acc_inc_wolt_delivery", name: "וולט משלוחים" },
      { id: "acc_inc_wolt_ta", name: "וולט TA" },
      { id: "acc_inc_goodi_delivery", name: "גודיס משלוחים" },
      { id: "acc_inc_other", name: "אחר" },
    ],
  },
];

export const DEFAULT_EXPENSE_LEAF_ID = "acc_food_misc";

export function flattenChartLeaves() {
  return CHART_OF_ACCOUNTS.flatMap((parent, parentIndex) =>
    parent.children.map((child, childIndex) => ({
      ...child,
      parentId: parent.id,
      parentName: parent.name,
      kind: parent.kind,
      parentSort: parentIndex,
      sortOrder: parentIndex * 100 + childIndex + 1,
    })),
  );
}

export function flattenChartParents() {
  return CHART_OF_ACCOUNTS.map((parent, parentIndex) => ({
    id: parent.id,
    name: parent.name,
    kind: parent.kind,
    sortOrder: parentIndex * 100,
  }));
}

export function isChartLeafId(id: string) {
  return CHART_OF_ACCOUNTS.some((parent) => parent.children.some((child) => child.id === id));
}

export function accountPathLabel(leafId: string | null | undefined) {
  if (!leafId) return "ללא כרטיס";
  for (const parent of CHART_OF_ACCOUNTS) {
    const child = parent.children.find((item) => item.id === leafId);
    if (child) return `${child.name} · ${parent.name}`;
  }
  return leafId;
}
