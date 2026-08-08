import { redirect } from "next/navigation";
import { listStaffQueue } from "@/server/services/staff";
import { DomainError } from "@/server/services/checkout";
import { StaffQueueView } from "./staff-queue-view";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  let orders;
  try {
    orders = await listStaffQueue();
  } catch (e) {
    if (
      e instanceof DomainError &&
      (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN")
    ) {
      redirect("/staff/login");
    }
    throw e;
  }
  return <StaffQueueView initialOrders={orders} />;
}
