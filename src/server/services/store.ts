import { getCarPickupAvailability } from "@/domains/store/availability";
import { createClient } from "@/lib/supabase/server";

export async function getStoreAvailability() {
  // Store settings/hours are public via RLS. Active order count uses RPC.
  const supabase = await createClient();
  const [{ data: store }, { data: hours }, { data: special }, { data: activeCount }] =
    await Promise.all([
      supabase.from("store_settings").select("*").limit(1).maybeSingle(),
      supabase.from("store_hours").select("*"),
      supabase.from("store_special_hours").select("*"),
      supabase.rpc("active_car_order_count"),
    ]);
  const count =
    typeof activeCount === "number" ? activeCount : Number(activeCount ?? 0);

  if (!store) {
    return {
      store: null,
      availability: {
        available: false as const,
        reason: "DISABLED" as const,
        message: "خدمة السيارة متوقفة حاليًا",
      },
    };
  }

  const availability = getCarPickupAvailability({
    nowUtc: new Date(),
    timezone: store.timezone,
    carPickupEnabled: store.car_pickup_enabled,
    temporaryPause: store.temporary_pause,
    maxActiveCarOrders: store.max_active_car_orders,
    activeCarOrders: count ?? 0,
    hours: hours ?? [],
    specialHours: special ?? [],
  });

  return { store, availability };
}
