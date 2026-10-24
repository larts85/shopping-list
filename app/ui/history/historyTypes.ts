import type { PurchaseHistoryRecord } from "@/app/lib/purchaseHistory";

export type HistoryItem = PurchaseHistoryRecord & {
  id: string;
  listId: string;
  listName: string;
  canEdit: boolean;
};

export type HistoryGroup = {
  key: string;
  items: HistoryItem[];
};
