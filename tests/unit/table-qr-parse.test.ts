import { describe, expect, it } from "vitest";
import { parseTableTokenFromScan } from "@/domains/tables/tokens";

describe("parseTableTokenFromScan", () => {
  const token = "table_token_seed_01";

  it("accepts raw opaque tokens", () => {
    expect(parseTableTokenFromScan(token)).toBe(token);
  });

  it("extracts table from menu URLs", () => {
    expect(
      parseTableTokenFromScan(
        `https://lughat-albun.vercel.app/order/menu?table=${token}`,
      ),
    ).toBe(token);
  });

  it("extracts table from enter route URLs", () => {
    expect(
      parseTableTokenFromScan(
        `https://lughat-albun.vercel.app/order/table/enter?table=${encodeURIComponent(token)}`,
      ),
    ).toBe(token);
  });

  it("rejects garbage", () => {
    expect(parseTableTokenFromScan("https://example.com")).toBeNull();
    expect(parseTableTokenFromScan("short")).toBeNull();
    expect(parseTableTokenFromScan("")).toBeNull();
  });
});
