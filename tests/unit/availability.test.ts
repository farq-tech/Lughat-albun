import { describe, expect, it } from "vitest";
import {
  estimatePrepRange,
  getCarPickupAvailability,
} from "@/domains/store/availability";

const hours = Array.from({ length: 7 }, (_, day_of_week) => ({
  day_of_week,
  is_closed: false,
  open_time: "00:00",
  close_time: "23:59",
}));

describe("car pickup availability", () => {
  it("available when open and under capacity", () => {
    const result = getCarPickupAvailability({
      nowUtc: new Date(),
      carPickupEnabled: true,
      temporaryPause: false,
      maxActiveCarOrders: 12,
      activeCarOrders: 3,
      hours,
    });
    expect(result.available).toBe(true);
  });

  it("pauses on capacity", () => {
    const result = getCarPickupAvailability({
      nowUtc: new Date(),
      carPickupEnabled: true,
      temporaryPause: false,
      maxActiveCarOrders: 2,
      activeCarOrders: 2,
      hours,
    });
    expect(result.available).toBe(false);
    if (!result.available) expect(result.reason).toBe("CAPACITY");
  });

  it("respects temporary pause", () => {
    const result = getCarPickupAvailability({
      nowUtc: new Date(),
      carPickupEnabled: true,
      temporaryPause: true,
      maxActiveCarOrders: 12,
      activeCarOrders: 0,
      hours,
    });
    expect(result.available).toBe(false);
  });
});

describe("prep estimate", () => {
  it("returns a range not a single minute", () => {
    const range = estimatePrepRange({
      basePrepMinutes: 5,
      activePreparingOrders: 2,
      recentMedianPrepMinutes: 6,
    });
    expect(range.max).toBeGreaterThan(range.min);
    expect(range.min).toBeGreaterThanOrEqual(3);
  });
});
