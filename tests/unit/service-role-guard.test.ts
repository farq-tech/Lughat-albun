import { describe, expect, it } from "vitest";
import { assertNoServiceRoleLeak } from "@/lib/supabase/env";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, files);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("service role exposure guard", () => {
  it("detects NEXT_PUBLIC service role pattern", () => {
    expect(() =>
      assertNoServiceRoleLeak("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=x"),
    ).toThrow();
  });

  it("scans client-facing source for service role public env", () => {
    const roots = ["src/components", "src/app"].map((r) =>
      path.join(process.cwd(), r),
    );
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const src = readFileSync(file, "utf8");
        if (
          src.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY") ||
          /NEXT_PUBLIC_.*SERVICE_ROLE/.test(src)
        ) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
