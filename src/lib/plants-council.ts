/** Plants Council (מועצת הצמחים) — MVP stub.
 *
 * Live daily-list scrape is out of scope. HQ stores a manual URL and a fixed
 * percent under that list (e.g. −10%) on produce suppliers. Franchisee ordering
 * still uses the franchisee price list, not this URL.
 */
export const PLANTS_COUNCIL = {
  nameHe: "מועצת הצמחים",
  defaultUrl: "https://www.plants.org.il/",
  noteHe:
    "אין משיכה אוטומטית של מחירון יומי ב-MVP. שומרים קישור ידני ואחוז קבוע מתחת למחירון (למשל 10%−) אצל ספק תוצרת טרייה.",
} as const;
