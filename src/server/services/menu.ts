import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ModifierGroup, Product } from "@/types/database";
import type { PricingCatalog } from "@/domains/cart/pricing";

export async function getMenu() {
  // Public menu reads go through anon + RLS (active rows only)
  const supabase = await createClient();

  const [{ data: categories }, { data: products }, { data: groups }, { data: options }, { data: links }] =
    await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .is("archived_at", null)
        .order("sort_order"),
      supabase.from("modifier_groups").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("modifier_options").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("product_modifier_groups").select("*").order("sort_order"),
    ]);

  const optionsByGroup = new Map<string, typeof options>();
  for (const opt of options ?? []) {
    const list = optionsByGroup.get(opt.group_id) ?? [];
    list.push(opt);
    optionsByGroup.set(opt.group_id, list);
  }

  const groupsWithOptions: ModifierGroup[] = (groups ?? []).map((g) => ({
    ...g,
    options: optionsByGroup.get(g.id) ?? [],
  }));

  const productGroups = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = productGroups.get(link.product_id) ?? [];
    list.push(link.modifier_group_id);
    productGroups.set(link.product_id, list);
  }

  return {
    categories: categories ?? [],
    products: (products ?? []) as Product[],
    groups: groupsWithOptions,
    productGroups,
  };
}

export async function buildPricingCatalog(): Promise<PricingCatalog> {
  const supabase = createServiceClient();
  const [{ data: products }, { data: groups }, { data: options }, { data: links }, { data: store }] =
    await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("modifier_groups").select("*"),
      supabase.from("modifier_options").select("*"),
      supabase.from("product_modifier_groups").select("*"),
      supabase.from("store_settings").select("*").limit(1).maybeSingle(),
    ]);

  const productMap = new Map((products ?? []).map((p) => [p.id, p as Product]));
  const groupMap = new Map(
    (groups ?? []).map((g) => [
      g.id,
      { ...g, options: [] as never[] } as ModifierGroup,
    ]),
  );
  const optionMap = new Map((options ?? []).map((o) => [o.id, o]));
  const productGroupIds = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = productGroupIds.get(link.product_id) ?? [];
    list.push(link.modifier_group_id);
    productGroupIds.set(link.product_id, list);
  }

  return {
    products: productMap,
    groups: groupMap,
    options: optionMap,
    productGroupIds,
    taxRateBps: store?.tax_rate_bps ?? 1500,
    serviceFeeMinor: store?.service_fee_minor ?? 0,
    currency: store?.currency ?? "SAR",
  };
}
