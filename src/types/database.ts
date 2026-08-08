export type StaffRole = "ADMIN" | "MANAGER" | "STAFF";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "CUSTOMER_ARRIVED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethod =
  | "ELECTRONIC"
  | "APPLE_PAY"
  | "MADA"
  | "VISA"
  | "MASTERCARD"
  | "CASH_ON_DELIVERY";

export type ActorType = "CUSTOMER" | "STAFF" | "SYSTEM" | "PAYMENT_PROVIDER";
export type OrderSource = "qr" | "link" | "repeat" | "admin";

export type CustomerPresence =
  | "none"
  | "on_the_way"
  | "outside"
  | "claimed_received";

export type MoneyMinor = number;

export interface StoreSettings {
  id: string;
  name_ar: string;
  name_en: string;
  timezone: string;
  currency: string;
  tax_rate_bps: number;
  service_fee_minor: number;
  base_prep_minutes: number;
  car_pickup_enabled: boolean;
  temporary_pause: boolean;
  max_active_car_orders: number;
  phone: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price_minor: number;
  image_path: string | null;
  is_active: boolean;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  required: boolean;
  min_selection: number;
  max_selection: number;
  sort_order: number;
  is_active: boolean;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  group_id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  price_delta_minor: number;
  is_active: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface CartModifierSelection {
  groupId: string;
  optionId: string;
}

export interface CartLineInput {
  productId: string;
  quantity: number;
  modifiers: CartModifierSelection[];
}

export interface PricedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDeltaMinor: number;
}

export interface PricedCartLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  modifiers: PricedModifier[];
  lineTotalMinor: number;
  available: boolean;
}

export interface CartTotals {
  subtotalMinor: number;
  taxAmountMinor: number;
  serviceFeeMinor: number;
  totalMinor: number;
  currency: string;
  priceChanged: boolean;
  /** Products the admin marked unavailable (sold out). */
  unavailableItems: string[];
  /** Cart/config problems — not inventory. */
  invalidItems: string[];
}

export interface VehicleInput {
  makeModel: string;
  color: string;
  plateHint?: string | null;
}

export interface OrderRecord {
  id: string;
  public_order_number: number;
  phone: string;
  customer_name: string | null;
  status: OrderStatus;
  car_make_model_snapshot: string | null;
  car_color_snapshot: string | null;
  plate_hint_snapshot: string | null;
  location_hint: string | null;
  flasher_confirmed: boolean;
  customer_on_the_way: boolean;
  /** Present after customer_presence migration; treat missing as "none". */
  customer_presence?: CustomerPresence | null;
  customer_presence_updated_at?: string | null;
  location_help_requested: boolean;
  subtotal_minor: number;
  tax_amount_minor: number;
  service_fee_minor: number;
  total_minor: number;
  currency: string;
  source: OrderSource;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod | null;
  estimated_prep_min: number | null;
  estimated_prep_max: number | null;
  created_at: string;
  paid_at: string | null;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  on_my_way_at: string | null;
  customer_arrived_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
}
