import { WHATSAPP_STATUS } from "@/lib/constants";

export function whatsappStatusLabel(status: string) {
  switch (status) {
    case WHATSAPP_STATUS.PENDING:
      return "לא נשלח לספק";
    case WHATSAPP_STATUS.SENT:
      return "נשלח";
    case WHATSAPP_STATUS.DELIVERED:
      return "התקבלה";
    case WHATSAPP_STATUS.READ:
      return "נקראה";
    default:
      return "סטטוס לא ידוע";
  }
}

export function whatsappTickCount(status: string) {
  if (status === WHATSAPP_STATUS.READ || status === WHATSAPP_STATUS.DELIVERED) return 2;
  if (status === WHATSAPP_STATUS.SENT) return 1;
  return 0;
}

export function whatsappTickTone(status: string): "muted" | "sent" | "read" {
  if (status === WHATSAPP_STATUS.READ) return "read";
  if (status === WHATSAPP_STATUS.DELIVERED || status === WHATSAPP_STATUS.SENT) return "sent";
  return "muted";
}
