import { redirect, notFound } from "next/navigation";
import { getStaffOrder } from "@/server/services/staff";
import { DomainError } from "@/server/services/checkout";
import { OrderDetailView } from "./order-detail-view";

export const dynamic = "force-dynamic";

export default async function StaffOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data;
  try {
    data = await getStaffOrder(id);
  } catch (e) {
    if (e instanceof DomainError) {
      if (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN") {
        redirect("/staff/login");
      }
      if (e.code === "ORDER_NOT_FOUND") {
        notFound();
      }
    }
    throw e;
  }
  return <OrderDetailView data={data} />;
}
