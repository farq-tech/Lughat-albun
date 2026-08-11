import {
  getCarPickupAvailability,
  getDineInStoreAvailability,
} from "@/domains/store/availability";
import { createServiceClient } from "@/lib/supabase/server";

async function loadStoreContext() {
  // Service client: checkout/availability run outside cookie-bound RSC context too.
  const supabase = createServiceClient();
  const [{ data: store }, { data: hours }, { data: special }, { data: activeCount }] =
    await Promise.all([
      supabase.from("store_settings").select("*").limit(1).maybeSingle(),
      supabase.from("store_hours").select("*"),
      supabase.from("store_special_hours").select("*"),
      supabase.rpc("active_car_order_count"),
    ]);
  const count =
    typeof activeCount === "number" ? activeCount : Number(activeCount ?? 0);
  return { store, hours: hours ?? [], special: special ?? [], count };
}

export async function getStoreAvailability() {
  const { store, hours, special, count } = await loadStoreContext();

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
    hours,
    specialHours: special,
  });

  return { store, availability };
}

export async function getDineInOrderingAvailability() {
  const { store, hours, special } = await loadStoreContext();

  if (!store) {
    return {
      store: null,
      availability: {
        available: false as const,
        reason: "DISABLED" as const,
        message: "المقهى غير متاح حاليًا",
      },
    };
  }

  const availability = getDineInStoreAvailability({
    nowUtc: new Date(),
    timezone: store.timezone,
    temporaryPause: store.temporary_pause,
    hours,
    specialHours: special,
  });

  return { store, availability };
}
