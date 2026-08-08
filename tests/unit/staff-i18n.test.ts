import { describe, expect, it } from "vitest";
import {
  actionLabelForNext,
  formatStaffWait,
  MESSAGES,
  staffErrorMessage,
} from "@/lib/staff-i18n";

describe("staff i18n", () => {
  it("covers en, hi, bn, ar dictionaries", () => {
    expect(MESSAGES.en.queue.title).toBeTruthy();
    expect(MESSAGES.hi.queue.title).toBeTruthy();
    expect(MESSAGES.bn.queue.title).toBeTruthy();
    expect(MESSAGES.ar.queue.title).toBeTruthy();
  });

  it("formats wait times per locale helpers", () => {
    expect(formatStaffWait(0, MESSAGES.en.wait)).toBe("now");
    expect(formatStaffWait(12, MESSAGES.en.wait)).toBe("12m");
    expect(formatStaffWait(75, MESSAGES.en.wait)).toBe("1h 15m");
    expect(formatStaffWait(12, MESSAGES.hi.wait)).toContain("12");
    expect(formatStaffWait(12, MESSAGES.bn.wait)).toContain("12");
  });

  it("maps primary action labels", () => {
    expect(actionLabelForNext("PREPARING", MESSAGES.en.actions)).toBe(
      "Accept order",
    );
    expect(actionLabelForNext("READY", MESSAGES.hi.actions)).toBeTruthy();
    expect(actionLabelForNext("DELIVERED", MESSAGES.bn.actions)).toBeTruthy();
  });

  it("maps staff error codes", () => {
    expect(staffErrorMessage("UNAUTHORIZED", "x", MESSAGES.en.errors)).toBe(
      MESSAGES.en.errors.UNAUTHORIZED,
    );
    expect(staffErrorMessage("NOPE", "fallback", MESSAGES.en.errors)).toBe(
      "fallback",
    );
  });
});
