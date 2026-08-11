import { describe, expect, it } from "vitest";
import {
  hashTableToken,
  isValidTableTokenFormat,
  tableDisplayLabel,
  tableOrderMenuPath,
} from "@/domains/tables/tokens";
import { canTransitionForOrderType } from "@/domains/orders/order-type";
import { customerStatusCopy } from "@/domains/orders/state-machine";
import { getDineInStoreAvailability } from "@/domains/store/availability";
import { hashToken } from "@/lib/auth/customer-token";

describe("table QR tokens", () => {
  it("hashes like customer tokens (sha256 hex)", () => {
    expect(hashTableToken("table_token_seed_01")).toBe(
      hashToken("table_token_seed_01"),
    );
    expect(hashTableToken("table_token_seed_01")).toHaveLength(64);
  });

  it("rejects short tokens", () => {
    expect(isValidTableTokenFormat("short")).toBe(false);
    expect(isValidTableTokenFormat("table_token_seed_01")).toBe(true);
  });

  it("builds menu path without exposing table number", () => {
    expect(tableOrderMenuPath("Ab7Kx92tokenXX")).toBe(
      "/order/menu?table=Ab7Kx92tokenXX",
    );
    expect(tableDisplayLabel(12)).toBe("طاولة 12");
    expect(tableDisplayLabel(3, "شرفة")).toBe("شرفة");
  });
});

describe("dine-in vs curbside transitions", () => {
  it("blocks car-arrival statuses for dine-in", () => {
    expect(
      canTransitionForOrderType("READY", "CUSTOMER_ARRIVED", "STAFF", "DINE_IN")
        .ok,
    ).toBe(false);
    expect(
      canTransitionForOrderType("READY", "OUT_FOR_DELIVERY", "STAFF", "DINE_IN")
        .ok,
    ).toBe(false);
    expect(
      canTransitionForOrderType("READY", "DELIVERED", "STAFF", "DINE_IN"),
    ).toEqual({ ok: true });
  });

  it("keeps curbside staff path READY → DELIVERED", () => {
    expect(
      canTransitionForOrderType("READY", "DELIVERED", "STAFF", "CURBSIDE"),
    ).toEqual({ ok: true });
    expect(
      canTransitionForOrderType(
        "CUSTOMER_ARRIVED",
        "OUT_FOR_DELIVERY",
        "STAFF",
        "CURBSIDE",
      ).ok,
    ).toBe(true);
    expect(
      canTransitionForOrderType(
        "CUSTOMER_ARRIVED",
        "OUT_FOR_DELIVERY",
        "STAFF",
        "DINE_IN",
      ).ok,
    ).toBe(false);
  });

  it("uses dine-in copy for READY", () => {
    expect(customerStatusCopy("READY", "DINE_IN").body).toContain("طاولة");
    expect(customerStatusCopy("READY", "CURBSIDE").body).toContain("استلام");
  });
});

describe("dine-in store availability", () => {
  const hours = [
    {
      day_of_week: 0,
      is_closed: false,
      open_time: "00:00",
      close_time: "23:59",
    },
    {
      day_of_week: 1,
      is_closed: false,
      open_time: "00:00",
      close_time: "23:59",
    },
    {
      day_of_week: 2,
      is_closed: false,
      open_time: "00:00",
      close_time: "23:59",
    },
    {
      day_of_week: 3,
      is_closed: false,
      open_time: "00:00",
      close_time: "23:59",
    },
    {
      day_of_week: 4,
      is_closed: false,
      open_time: "00:00",
      close_time: "23:59",
    },
    {
      day_of_week: 5,
      is_closed: false,
      open_time: "00:00",
      close_time: "23:59",
    },
    {
      day_of_week: 6,
      is_closed: false,
      open_time: "00:00",
      close_time: "23:59",
    },
  ];

  it("ignores car pickup capacity and allows open store", () => {
    const result = getDineInStoreAvailability({
      nowUtc: new Date(),
      temporaryPause: false,
      hours,
    });
    expect(result.available).toBe(true);
  });

  it("respects temporary pause", () => {
    const result = getDineInStoreAvailability({
      nowUtc: new Date(),
      temporaryPause: true,
      hours,
    });
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe("PAUSED");
    }
  });
});
