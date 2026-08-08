import { createServiceClient } from "@/lib/supabase/server";
import { requireStaff } from "./staff";

export async function getAdminDashboardStats() {
  await requireStaff("MANAGER");
  const supabase = createServiceClient();

  const now = new Date();
  const riyadhOffset = 3 * 60;
  const local = new Date(now.getTime() + riyadhOffset * 60_000);
  const dayStart = new Date(local);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartIso = new Date(
    dayStart.getTime() - riyadhOffset * 60_000,
  ).toISOString();

  try {
    const [{ count }, { data: paidOrders }] = await Promise.all([
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dayStartIso)
        .neq("status", "PENDING_PAYMENT"),
      supabase
        .from("orders")
        .select("total_minor")
        .gte("paid_at", dayStartIso)
        .not("paid_at", "is", null),
    ]);

    const todayRevenueMinor = (paidOrders ?? []).reduce(
      (sum, o) => sum + (o.total_minor ?? 0),
      0,
    );

    return {
      todayOrders: count ?? 0,
      todayRevenueMinor,
      statsAvailable: true as const,
    };
  } catch {
    return {
      todayOrders: null,
      todayRevenueMinor: null,
      statsAvailable: false as const,
    };
  }
}

export async function getAdminMenu() {
  await requireStaff("MANAGER");
  const supabase = createServiceClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("products")
      .select("*")
      .is("archived_at", null)
      .order("sort_order"),
  ]);

  return {
    categories: categories ?? [],
    products: products ?? [],
  };
}

export async function setProductAvailability(
  productId: string,
  isAvailable: boolean,
) {
  await requireStaff("MANAGER");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable })
    .eq("id", productId);

  if (error) throw error;
  return { ok: true as const };
}
