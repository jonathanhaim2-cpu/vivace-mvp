import { PLANTS_COUNCIL } from "./plants-council";

export const BRANCH_BEIT_SHEMESH = "branch_beit_shemesh";
export const BRANCH_KIRYAT_YEARIM = "branch_kiryat_yearim";

export type SupplierBranchOverlay = {
  whatsappPhone?: string;
  agentName?: string;
  agentPhone?: string;
  accountingPhone?: string;
  accountingEmail?: string;
  taxId?: string;
  address?: string;
  deliveryPointNumber?: string;
  deliveryDays?: number[];
  orderDays?: number[];
  orderCutoffTime?: string;
  notes?: string;
};

export type SupplierOverlay = {
  name: string;
  taxId?: string;
  agentName?: string;
  agentPhone?: string;
  whatsappPhone?: string;
  accountingPhone?: string;
  accountingEmail?: string;
  address?: string;
  deliveryPointNumber?: string;
  documentType?: string;
  deliveryDays?: number[];
  orderDays?: number[];
  orderCutoffTime?: string;
  notes?: string;
  plantsCouncilRelevant?: boolean;
  plantsCouncilUrl?: string | null;
  plantsCouncilDiscountPct?: number | null;
  /** If set, supplier is linked only to these branches. */
  branchIds?: string[];
  branchOverrides?: Partial<Record<string, SupplierBranchOverlay>>;
};

const CBC_SHARED: Omit<SupplierOverlay, "name"> = {
  taxId: "513603324",
  agentName: "מרכש שירות לקוחות",
  whatsappPhone: "097629046",
  agentPhone: "097629046",
  accountingEmail: "hazmanot_mail1@cbccom.com",
  deliveryPointNumber: "884265",
  documentType: "TAX_INVOICE",
  deliveryDays: [2],
  orderDays: [0],
  orderCutoffTime: "13:00",
  notes:
    "הזמנות בוואטסאפ בלבד. להתחיל הודעה בשם רועי חיימוף ומספר נקודת מכירה 884265. אותם פרטי ח.פ. לקוקה קולה, טרה ו-ibbls.",
  branchOverrides: {
    [BRANCH_KIRYAT_YEARIM]: {
      deliveryDays: [2],
      orderDays: [0],
      orderCutoffTime: "13:00",
      deliveryPointNumber: "884265",
    },
    [BRANCH_BEIT_SHEMESH]: {
      deliveryDays: [3],
      orderDays: [1],
      orderCutoffTime: "14:00",
      deliveryPointNumber: "884265",
    },
  },
};

const SHABI_SHARED: Omit<SupplierOverlay, "name"> = {
  taxId: "511973596",
  address: "שמוטקין בנימין 33, ראשון לציון",
  agentName: "זאב",
  whatsappPhone: "0503680148",
  agentPhone: "0503680148",
  accountingPhone: "0503680148",
  documentType: "TAX_INVOICE",
  deliveryDays: [2],
  orderDays: [1],
  orderCutoffTime: "13:00",
  branchOverrides: {
    [BRANCH_KIRYAT_YEARIM]: {
      deliveryPointNumber: "273113",
      deliveryDays: [2],
      orderDays: [1],
      orderCutoffTime: "13:00",
    },
    [BRANCH_BEIT_SHEMESH]: {
      deliveryPointNumber: "274084",
      deliveryDays: [0],
      orderDays: [4],
      orderCutoffTime: "13:00",
    },
  },
};

const SEMORY_SHARED: Omit<SupplierOverlay, "name"> = {
  taxId: "515358430",
  address: "המקצועות 14, מודיעין",
  agentName: "גולן",
  whatsappPhone: "0502925050",
  agentPhone: "0502925050",
  documentType: "MIX_PER_PRODUCT",
  deliveryDays: [],
  orderDays: [],
  notes: "אין ימי הזמנה ואספקה קבועים. קטגוריות: כלים ומוצרים שוטפים. פעיל לשני הסניפים.",
};

/** Real commercial names + PDF contacts. Keys are stable catalog supplier ids. */
export const REAL_SUPPLIER_DETAILS: Record<string, SupplierOverlay> = {
  sup_softdrinks: {
    name: "החברה המרכזית קוקה קולה",
    ...CBC_SHARED,
  },
  sup_dairy_drinks: {
    name: "טרה",
    ...CBC_SHARED,
  },
  sup_alcohol: {
    name: "ibbls",
    ...CBC_SHARED,
  },
  sup_cohen: {
    name: "אחים כהן ד.א יבוא ושיווק מזון בע״מ",
    taxId: "512404104",
    address: "מפעלי נחם הר טוב 9",
    agentName: "מוטי",
    whatsappPhone: "0525804979",
    agentPhone: "0525804979",
    accountingEmail: "Fin2@cohenb.com",
    documentType: "TAX_INVOICE",
    deliveryDays: [0, 2, 4],
    orderDays: [4, 1, 3],
    orderCutoffTime: "14:00",
    branchOverrides: {
      [BRANCH_BEIT_SHEMESH]: {
        deliveryPointNumber: "36112",
        deliveryDays: [1, 3],
        orderDays: [0, 2],
        orderCutoffTime: "14:00",
      },
      [BRANCH_KIRYAT_YEARIM]: {
        deliveryPointNumber: "36114",
        deliveryDays: [0, 2, 4],
        orderDays: [4, 1, 3],
        orderCutoffTime: "14:00",
      },
    },
  },
  sup_coffee: {
    name: "דרים טעמים בע״מ",
    taxId: "513816595",
    address: "המלאכה 2, אזור התעשייה החדש נתניה",
    agentName: "שרון",
    whatsappPhone: "0522552227",
    agentPhone: "0522552227",
    accountingEmail: "info@smadar.app",
    documentType: "TAX_INVOICE",
    deliveryDays: [],
    orderDays: [],
    notes: "יום אספקה משתנה, לא קבוע.",
  },
  sup_produce: {
    name: "גלילה תוצרת חקלאית בע״מ",
    taxId: "514242445",
    agentName: "יהודה",
    whatsappPhone: "0503055818",
    agentPhone: "0503055818",
    accountingPhone: "0508959134",
    accountingEmail: "galilashvok@gmail.com",
    documentType: "DELIVERY_NOTE",
    deliveryDays: [0, 1, 2, 3, 4],
    orderDays: [0, 1, 2, 3, 4],
    orderCutoffTime: "17:00",
    plantsCouncilRelevant: true,
    plantsCouncilUrl: PLANTS_COUNCIL.defaultUrl,
    plantsCouncilDiscountPct: 10,
    branchIds: [BRANCH_KIRYAT_YEARIM],
    notes: "מספק רק לקרית יערים. הזמנה יום קודם עד 17:00. לשלוח הזמנות והנה״ח גם לעדינה.",
  },
  sup_shabi: {
    name: "י.שבי שיווק מזון בע״מ",
    ...SHABI_SHARED,
  },
  sup_dry_kitchen: {
    name: "י.שבי שיווק מזון בע״מ",
    ...SHABI_SHARED,
  },
  sup_icecream: {
    name: "מוצרי איכות אמריקאיים בע״מ",
    taxId: "558127692",
    address: "הקציר ת.ד 1325, קרית מלאכי",
    agentName: "תמיר",
    whatsappPhone: "0536701680",
    agentPhone: "0536701680",
    documentType: "TAX_INVOICE",
    deliveryDays: [],
    orderDays: [],
    notes: "ימי אספקה משתנים. קרית יערים — תמיר; בית שמש — אבישי.",
    branchOverrides: {
      [BRANCH_KIRYAT_YEARIM]: {
        agentName: "תמיר",
        whatsappPhone: "0536701680",
        agentPhone: "0536701680",
      },
      [BRANCH_BEIT_SHEMESH]: {
        agentName: "אבישי",
        whatsappPhone: "0505858939",
        agentPhone: "0505858939",
      },
    },
  },
  sup_cheese: {
    name: "מחלבות גד ו/או שי עד",
    taxId: "558397915",
    address: "הרותם 18, מעלה אדומים",
    agentName: "דור",
    whatsappPhone: "0543332428",
    agentPhone: "0543332428",
    accountingPhone: "0543332428",
    documentType: "TAX_INVOICE",
    deliveryDays: [0, 1, 2, 3, 4, 5],
    orderDays: [0, 1, 2, 3, 4, 5],
    orderCutoffTime: "20:00",
    notes: "בקרית יערים: שי עד ו/או מחלבות גד. בבית שמש: אור מוהיני ו/או מחלבות גד (ע.מ נפרד).",
    branchOverrides: {
      [BRANCH_KIRYAT_YEARIM]: {
        agentName: "דור",
        whatsappPhone: "0543332428",
        agentPhone: "0543332428",
        accountingPhone: "0543332428",
        taxId: "558397915",
        address: "הרותם 18, מעלה אדומים",
        deliveryDays: [0, 1, 2, 3, 4, 5],
        orderDays: [0, 1, 2, 3, 4, 5],
        orderCutoffTime: "20:00",
        notes: "שי עד ו/או מחלבות גד. כל יום אספקה, הזמנה יום קודם עד 20:00.",
      },
      [BRANCH_BEIT_SHEMESH]: {
        agentName: "אור",
        whatsappPhone: "0546999389",
        agentPhone: "0546999389",
        accountingPhone: "0546999389",
        taxId: "038017224",
        address: "נחל צאלים 80, כפר אדומים",
        deliveryDays: [0, 1, 3],
        orderDays: [5, 0, 2],
        orderCutoffTime: "14:00",
        notes: "אור מוהיני ו/או מחלבות גד. אספקה א׳/ב׳/ד׳.",
      },
    },
  },
  sup_sweet: {
    name: "מתוק וטעים בע״מ",
    taxId: "513488593",
    address: "אזור התעשייה טירה",
    agentName: "ואדים",
    whatsappPhone: "0528057843",
    agentPhone: "0528057843",
    accountingEmail: "acc2@matokvetaeem.co.il",
    documentType: "TAX_INVOICE",
    deliveryDays: [2, 4],
    orderDays: [1, 3],
    orderCutoffTime: "12:00",
    notes: "הזמנות גם ל-matok.orders@gmail.com.",
    branchOverrides: {
      [BRANCH_KIRYAT_YEARIM]: {
        deliveryDays: [2, 4],
        orderDays: [1, 3],
        orderCutoffTime: "12:00",
      },
      [BRANCH_BEIT_SHEMESH]: {
        deliveryDays: [0],
        orderDays: [3],
        orderCutoffTime: "14:00",
      },
    },
  },
  sup_semory: {
    name: "סמורי בע״מ",
    ...SEMORY_SHARED,
  },
  sup_tapuza: {
    name: "גרופר אורגני בע״מ",
    taxId: "515889442",
    agentName: "לירון",
    whatsappPhone: "0527747477",
    agentPhone: "0527747477",
    accountingEmail: "growper@growper.co.il",
    documentType: "TAX_INVOICE",
    deliveryDays: [3],
    orderDays: [0],
    orderCutoffTime: "17:00",
    notes: "אספקה יום רביעי, הזמנה יום ראשון עד 17:00. פעיל בשני הסניפים.",
  },
  sup_yarden: {
    name: "שיווק ירדן בע״מ",
    taxId: "513846659",
    address: "יד חרוצים 14, ירושלים",
    agentName: "מתי",
    whatsappPhone: "0525682535",
    agentPhone: "0525682535",
    accountingPhone: "0525682535",
    accountingEmail: "Syarden8@gmail.com",
    documentType: "TAX_INVOICE",
    deliveryDays: [3],
    orderDays: [1],
    orderCutoffTime: "14:00",
    branchIds: [BRANCH_KIRYAT_YEARIM],
    notes: "קרית יערים בלבד. אספקה רביעי, הזמנות יום שני עד 14:00.",
  },
  sup_flour: {
    name: "קמח מלכים בע״מ",
    taxId: "515233021",
    agentName: "משה הניג",
    whatsappPhone: "0527126412",
    agentPhone: "0527126412",
    documentType: "DELIVERY_NOTE",
    deliveryDays: [2],
    orderDays: [0],
    orderCutoffTime: "14:00",
    branchOverrides: {
      [BRANCH_BEIT_SHEMESH]: {
        deliveryDays: [1],
        orderDays: [4],
        orderCutoffTime: "13:00",
      },
      [BRANCH_KIRYAT_YEARIM]: {
        deliveryDays: [2],
        orderDays: [0],
        orderCutoffTime: "14:00",
      },
    },
  },
  sup_milano: {
    name: "דרום מעלים בע״מ",
  },
};

export const FILE_LABEL_SUPPLIER_NAMES = [
  "vivac'e קרית יערים",
  "vivac'e_42869",
  "vivac'e_42893",
  "vivac'e_71319",
  "vivac'e_72014",
  "קרית יערים",
] as const;

export function looksLikeFileLabelName(name: string) {
  const trimmed = name.trim();
  if (/^vivac['’]?e([_\s]|$)/i.test(trimmed)) return true;
  return (FILE_LABEL_SUPPLIER_NAMES as readonly string[]).includes(trimmed);
}

export function displaySupplierName(supplierId: string, fallbackName: string) {
  const overlay = REAL_SUPPLIER_DETAILS[supplierId];
  const name = overlay?.name?.trim() || fallbackName.trim();
  return name;
}
