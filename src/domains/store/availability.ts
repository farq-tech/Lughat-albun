export interface StoreHourRow {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface SpecialHourRow {
  date: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface AvailabilityInput {
  nowUtc: Date;
  timezone?: string;
  carPickupEnabled: boolean;
  temporaryPause: boolean;
  maxActiveCarOrders: number;
  activeCarOrders: number;
  hours: StoreHourRow[];
  specialHours?: SpecialHourRow[];
}

export type CarPickupAvailability =
  | { available: true; message: string }
  | {
      available: false;
      reason: "PAUSED" | "DISABLED" | "CAPACITY" | "CLOSED";
      message: string;
    };

function riyadhParts(nowUtc: Date, timeZone = "Asia/Riyadh") {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(nowUtc).map((p) => [p.type, p.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dayOfWeek: weekdayMap[parts.weekday!] ?? 0,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

function isOpenNow(
  hours: StoreHourRow[],
  specialHours: SpecialHourRow[] | undefined,
  nowUtc: Date,
  timeZone: string,
): boolean {
  const { dayOfWeek, date, minutes } = riyadhParts(nowUtc, timeZone);
  const special = specialHours?.find((s) => s.date === date);
  if (special) {
    if (special.is_closed) return false;
    if (!special.open_time || !special.close_time) return false;
    return isWithinWindow(minutes, special.open_time, special.close_time);
  }
  const row = hours.find((h) => h.day_of_week === dayOfWeek);
  if (!row || row.is_closed || !row.open_time || !row.close_time) return false;
  return isWithinWindow(minutes, row.open_time, row.close_time);
}

function isWithinWindow(nowMinutes: number, open: string, close: string): boolean {
  const openM = parseTimeToMinutes(open.slice(0, 5));
  const closeM = parseTimeToMinutes(close.slice(0, 5));
  if (closeM === 0 && openM > 0) {
    // closes at midnight
    return nowMinutes >= openM || nowMinutes < 24 * 60;
  }
  if (closeM <= openM) {
    // overnight window
    return nowMinutes >= openM || nowMinutes < closeM;
  }
  return nowMinutes >= openM && nowMinutes < closeM;
}

export function getCarPickupAvailability(
  input: AvailabilityInput,
): CarPickupAvailability {
  const tz = input.timezone ?? "Asia/Riyadh";

  if (!input.carPickupEnabled) {
    return {
      available: false,
      reason: "DISABLED",
      message: "خدمة السيارة متوقفة حاليًا",
    };
  }
  if (input.temporaryPause) {
    return {
      available: false,
      reason: "PAUSED",
      message: "طلبات السيارة متوقفة مؤقتًا بسبب ضغط الطلبات",
    };
  }
  if (input.activeCarOrders >= input.maxActiveCarOrders) {
    return {
      available: false,
      reason: "CAPACITY",
      message: "طلبات السيارة متوقفة مؤقتًا بسبب ضغط الطلبات",
    };
  }
  if (!isOpenNow(input.hours, input.specialHours, input.nowUtc, tz)) {
    return {
      available: false,
      reason: "CLOSED",
      message: "المقهى مغلق الآن",
    };
  }
  return { available: true, message: "طلبات السيارة متاحة الآن" };
}

/** Dine-in / in-store: open hours + pause only (no car capacity). */
export function getDineInStoreAvailability(input: {
  nowUtc: Date;
  timezone?: string;
  temporaryPause: boolean;
  hours: StoreHourRow[];
  specialHours?: SpecialHourRow[];
}): CarPickupAvailability {
  const tz = input.timezone ?? "Asia/Riyadh";
  if (input.temporaryPause) {
    return {
      available: false,
      reason: "PAUSED",
      message: "الطلبات متوقفة مؤقتًا بسبب ضغط الطلبات",
    };
  }
  if (!isOpenNow(input.hours, input.specialHours, input.nowUtc, tz)) {
    return {
      available: false,
      reason: "CLOSED",
      message: "المقهى مغلق الآن",
    };
  }
  return { available: true, message: "طلبات الطاولة متاحة الآن" };
}

export function estimatePrepRange(params: {
  basePrepMinutes: number;
  activePreparingOrders: number;
  recentMedianPrepMinutes?: number | null;
}): { min: number; max: number } {
  const base = Math.max(3, params.basePrepMinutes);
  const queueFactor = Math.min(params.activePreparingOrders, 8) * 1;
  const median = params.recentMedianPrepMinutes ?? base;
  const center = Math.round((base + median) / 2 + queueFactor);
  const min = Math.max(3, center - 1);
  const max = center + 2;
  return { min, max };
}
