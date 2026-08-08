const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function productImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath || !SUPABASE_URL) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const cleaned = imagePath.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${cleaned}`;
}
