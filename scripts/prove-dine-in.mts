import { createCheckoutAndPay } from "../src/server/services/checkout";
import { createServiceClient } from "../src/lib/supabase/server";

async function main() {
  const sb = createServiceClient();
  const { data: product, error: productError } = await sb
    .from("products")
    .select("id,price_minor,name_ar")
    .eq("is_available", true)
    .eq("is_active", true)
    .limit(1)
    .single();
  if (productError || !product) throw productError ?? new Error("no product");
  console.log("product", product.name_ar, product.id);

  const result = await createCheckoutAndPay({
    checkout: {
      items: [{ productId: product.id, quantity: 1, modifiers: [] }],
      phone: "0509998877",
      firstName: "اختبار",
      source: "qr",
      orderType: "DINE_IN",
      tableToken: "table_token_seed_01",
      idempotencyKey: `dinein_prove_${Date.now()}`,
      paymentMethod: "cash_on_delivery",
    },
    requestKey: "prove-dine-in",
  });

  console.log(
    JSON.stringify(
      {
        orderId: result.orderId,
        publicOrderNumber: result.publicOrderNumber,
        paymentStatus: result.paymentStatus,
      },
      null,
      2,
    ),
  );

  const { data: order } = await sb
    .from("orders")
    .select(
      "id,public_order_number,order_type,table_id,table_session_id,table_number_snapshot,source,status,car_make_model_snapshot",
    )
    .eq("id", result.orderId)
    .single();
  console.log("order row", order);

  const { data: session } = await sb
    .from("table_sessions")
    .select("*")
    .eq("id", order!.table_session_id)
    .single();
  console.log("session", session);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
