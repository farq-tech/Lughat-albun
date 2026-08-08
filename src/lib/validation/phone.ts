/** Normalize Saudi phone input: Arabic digits, spaces, and local formats. */
export function normalizeSaudiPhone(raw: string): string {
  const map: Record<string, string> = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };

  let value = raw
    .trim()
    .replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d)
    .replace(/[\s\-()]/g, "");

  if (value.startsWith("00966")) value = `+966${value.slice(5)}`;
  if (value.startsWith("966")) value = `+${value}`;
  if (/^5\d{8}$/.test(value)) value = `0${value}`;
  if (value.startsWith("+9665") && value.length === 13) {
    // keep +9665xxxxxxxx
  } else if (value.startsWith("+966") && value.length === 13) {
    // +966XXXXXXXXX
  }

  return value;
}

export function isValidSaudiMobile(phone: string): boolean {
  return /^(05\d{8}|\+9665\d{8})$/.test(phone);
}
