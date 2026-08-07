import type { OrderRecord, OrderStatus } from "@/types/database";

export type StaffQueueOrder = OrderRecord & {
  order_items?: { id: string }[];
  itemCount: number;
  primaryAction: {
    label: string;
    next: OrderStatus;
  } | null;
};
