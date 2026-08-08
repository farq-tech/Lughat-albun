/**
 * Upload café photos to Supabase storage and replace catalog with real menu seed.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const files: { local: string; remote: string; contentType: string }[] = [
  {
    local: "/tmp/product-images/hot-drinks.jpg",
    remote: "menu/hot-drinks.jpg",
    contentType: "image/jpeg",
  },
  {
    local: "/tmp/product-images/cold-drinks.jpg",
    remote: "menu/cold-drinks.jpg",
    contentType: "image/jpeg",
  },
  {
    local: "/tmp/product-images/drip-coffee.jpg",
    remote: "menu/drip-coffee.jpg",
    contentType: "image/jpeg",
  },
  {
    local: "/tmp/product-images/cafe-hero.jpg",
    remote: "menu/cafe-hero.jpg",
    contentType: "image/jpeg",
  },
  {
    local: "/tmp/product-images/logo.png",
    remote: "menu/logo.png",
    contentType: "image/png",
  },
];

async function uploadAll() {
  for (const f of files) {
    const body = readFileSync(f.local);
    const { error } = await sb.storage.from("product-images").upload(f.remote, body, {
      contentType: f.contentType,
      upsert: true,
    });
    if (error) throw new Error(`upload ${f.remote}: ${error.message}`);
    const { data } = sb.storage.from("product-images").getPublicUrl(f.remote);
    console.log("uploaded", f.remote, data.publicUrl);
  }
}

async function replaceCatalog() {
  // Catalog should already be cleared (order FKs nulled). Soft-clear leftovers if any.
  await sb.from("product_modifier_groups").delete().gte("sort_order", 0);
  await sb.from("modifier_options").delete().gte("sort_order", 0);
  await sb.from("modifier_groups").delete().gte("sort_order", 0);
  await sb.from("products").delete().gte("sort_order", 0);
  await sb.from("categories").delete().gte("sort_order", 0);

  const categories = [
    ["a1111111-1111-4111-8111-111111111101", "hot-drinks", "المشروبات الساخنة", "Hot Drinks", 1],
    ["a1111111-1111-4111-8111-111111111102", "cold-drinks", "المشروبات الباردة", "Cold Drinks", 2],
    ["a1111111-1111-4111-8111-111111111103", "drip-coffee", "القهوة المقطرة", "Drip Coffee", 3],
    ["a1111111-1111-4111-8111-111111111104", "coffee-tea", "قهوة وشاي", "Coffee & Tea", 4],
    ["a1111111-1111-4111-8111-111111111105", "mojito", "موهيتو", "Mojito", 5],
    ["a1111111-1111-4111-8111-111111111106", "ice-tea", "آيس تي", "Ice Tea", 6],
    ["a1111111-1111-4111-8111-111111111107", "desserts", "الحلى", "Desserts", 7],
    ["a1111111-1111-4111-8111-111111111108", "croissant", "كروسان", "Croissant", 8],
    ["a1111111-1111-4111-8111-111111111109", "sandwiches", "ساندويتش", "Sandwiches", 9],
    ["a1111111-1111-4111-8111-111111111110", "water", "ماء", "Water", 10],
  ];
  const { error: cErr } = await sb.from("categories").insert(
    categories.map(([id, slug, name_ar, name_en, sort_order]) => ({
      id,
      slug,
      name_ar,
      name_en,
      sort_order,
      is_active: true,
    })),
  );
  if (cErr) throw new Error(cErr.message);
  console.log("categories inserted", categories.length);
}

async function main() {
  await uploadAll();
  // Prefer applying seed SQL via Management API isn't available; use psql-less chunk inserts from seed file with regex
  await replaceCatalog();

  // Insert products by extracting tuples from seed.sql product values
  const seed = readFileSync(resolve("supabase/seed.sql"), "utf8");
  const productBlock = seed.split("insert into public.products")[1]?.split("insert into public.modifier_groups")[0];
  if (!productBlock) throw new Error("products block missing");
  const rows = [...productBlock.matchAll(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(null|'[^']*'),\s*(\d+),\s*'([^']+)',\s*true,\s*true,\s*(true|false),\s*(\d+)\)/g)];
  console.log("parsed products", rows.length);
  const products = rows.map((m) => ({
    id: m[1],
    category_id: m[2],
    slug: m[3],
    name_ar: m[4],
    name_en: m[5],
    description_ar: m[6] === "null" ? null : m[6].replace(/^'|'$/g, ""),
    price_minor: Number(m[7]),
    image_path: m[8],
    is_active: true,
    is_available: true,
    is_featured: m[9] === "true",
    sort_order: Number(m[10]),
  }));
  const { error: pErr } = await sb.from("products").insert(products);
  if (pErr) throw new Error(`products: ${pErr.message}`);

  // modifiers
  const { error: gErr } = await sb.from("modifier_groups").insert([
    { id: "c3333333-3333-4333-8333-333333333301", slug: "size", name_ar: "الحجم", name_en: "Size", required: true, min_selection: 1, max_selection: 1, sort_order: 1, is_active: true },
    { id: "c3333333-3333-4333-8333-333333333302", slug: "milk", name_ar: "الحليب", name_en: "Milk", required: true, min_selection: 1, max_selection: 1, sort_order: 2, is_active: true },
    { id: "c3333333-3333-4333-8333-333333333303", slug: "extra-shot", name_ar: "شوت إضافي", name_en: "Extra Shot", required: false, min_selection: 0, max_selection: 2, sort_order: 3, is_active: true },
  ]);
  if (gErr) throw new Error(gErr.message);

  const { error: oErr } = await sb.from("modifier_options").insert([
    { id: "d4444444-4444-4444-8444-444444444401", group_id: "c3333333-3333-4333-8333-333333333301", slug: "regular", name_ar: "عادي", name_en: "Regular", price_delta_minor: 0, sort_order: 1, is_active: true, is_available: true },
    { id: "d4444444-4444-4444-8444-444444444402", group_id: "c3333333-3333-4333-8333-333333333301", slug: "large", name_ar: "كبير", name_en: "Large", price_delta_minor: 300, sort_order: 2, is_active: true, is_available: true },
    { id: "d4444444-4444-4444-8444-444444444403", group_id: "c3333333-3333-4333-8333-333333333302", slug: "full-fat", name_ar: "حليب كامل", name_en: "Full Fat", price_delta_minor: 0, sort_order: 1, is_active: true, is_available: true },
    { id: "d4444444-4444-4444-8444-444444444404", group_id: "c3333333-3333-4333-8333-333333333302", slug: "oat", name_ar: "شوفان", name_en: "Oat Milk", price_delta_minor: 200, sort_order: 2, is_active: true, is_available: true },
    { id: "d4444444-4444-4444-8444-444444444405", group_id: "c3333333-3333-4333-8333-333333333302", slug: "almond", name_ar: "لوز", name_en: "Almond", price_delta_minor: 200, sort_order: 3, is_active: true, is_available: true },
    { id: "d4444444-4444-4444-8444-444444444406", group_id: "c3333333-3333-4333-8333-333333333303", slug: "one-shot", name_ar: "شوت واحد", name_en: "One Shot", price_delta_minor: 300, sort_order: 1, is_active: true, is_available: true },
  ]);
  if (oErr) throw new Error(oErr.message);

  const latteSlugs = [
    "caffe-latte-hot","spanish-latte-hot","caramel-latte-hot","pistachio-latte-hot",
    "caffe-latte-cold","spanish-latte-cold","caramel-latte-cold","pistachio-latte-cold",
    "cappuccino","flat-white","mocha","white-mocha",
  ];
  const links = [];
  for (const p of products.filter((x) => latteSlugs.includes(x.slug))) {
    links.push(
      { product_id: p.id, modifier_group_id: "c3333333-3333-4333-8333-333333333301", sort_order: 1 },
      { product_id: p.id, modifier_group_id: "c3333333-3333-4333-8333-333333333302", sort_order: 2 },
      { product_id: p.id, modifier_group_id: "c3333333-3333-4333-8333-333333333303", sort_order: 3 },
    );
  }
  const { error: lErr } = await sb.from("product_modifier_groups").insert(links);
  if (lErr) throw new Error(lErr.message);

  const { count } = await sb.from("products").select("*", { count: "exact", head: true });
  console.log("DONE products=", count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
