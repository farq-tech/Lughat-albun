export const STAFF_LOCALES = ["en", "hi", "bn", "ar"] as const;

export type StaffLocale = (typeof STAFF_LOCALES)[number];

export type StaffMessages = {
  brand: string;
  login: {
    panelTitle: string;
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    invalidCredentials: string;
  };
  queue: {
    title: string;
    live: string;
    soundOn: string;
    soundOff: string;
    refresh: string;
    empty: string;
    items: string;
    plate: string;
    since: string;
    updateFailed: string;
    sectionNew: string;
    sectionPreparing: string;
    sectionReady: string;
    sectionLegacy: string;
  };
  wait: {
    now: string;
    minutes: (n: number) => string;
    hours: (h: number) => string;
    hoursMinutes: (h: number, m: number) => string;
  };
  actions: {
    accept: string;
    markReady: string;
    markDelivered: string;
    cannotLocate: string;
    helpRequested: string;
    backToQueue: string;
  };
  detail: {
    car: string;
    plate: string;
    locationNote: string;
    phone: string;
    name: string;
    flasherOn: string;
    items: string;
    subtotal: string;
    tax: string;
    serviceFee: string;
    history: string;
  };
  payment: {
    cod: string;
    paid: string;
  };
  presence: {
    none: string;
    on_the_way: string;
    outside: string;
    claimed_received: string;
  };
  status: {
    PAID: string;
    ACCEPTED: string;
    PREPARING: string;
    READY: string;
    CUSTOMER_ARRIVED: string;
    OUT_FOR_DELIVERY: string;
    DELIVERED: string;
    CANCELLED: string;
    REFUNDED: string;
    PENDING_PAYMENT: string;
  };
  events: {
    PAYMENT_CONFIRMED: string;
    ACCEPTED: string;
    PREPARING: string;
    READY: string;
    CUSTOMER_ARRIVED: string;
    OUT_FOR_DELIVERY: string;
    DELIVERED: string;
    CUSTOMER_ON_THE_WAY: string;
    CUSTOMER_OUTSIDE: string;
    CUSTOMER_CLAIMED_RECEIVED: string;
    LOCATION_HELP_REQUESTED: string;
    CANCELLED: string;
    REFUNDED: string;
  };
  errors: {
    UNKNOWN: string;
    UNAUTHORIZED: string;
    FORBIDDEN: string;
    ORDER_TRANSITION_CONFLICT: string;
    generic: string;
  };
  language: {
    label: string;
    en: string;
    hi: string;
    bn: string;
    ar: string;
  };
};

export const LOCALE_META: Record<
  StaffLocale,
  { dir: "ltr" | "rtl"; nativeLabel: string; timeLocale: string }
> = {
  en: { dir: "ltr", nativeLabel: "English", timeLocale: "en-GB" },
  hi: { dir: "ltr", nativeLabel: "हिन्दी", timeLocale: "hi-IN" },
  bn: { dir: "ltr", nativeLabel: "বাংলা", timeLocale: "bn-BD" },
  ar: { dir: "rtl", nativeLabel: "العربية", timeLocale: "ar-SA" },
};
