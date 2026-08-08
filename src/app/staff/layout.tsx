import {
  Noto_Sans,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
} from "next/font/google";
import { StaffLocaleProvider } from "@/lib/staff-i18n";

const staffSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-staff-sans",
  display: "swap",
});

const staffDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-staff-deva",
  display: "swap",
});

const staffBeng = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-staff-beng",
  display: "swap",
});

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${staffSans.variable} ${staffDeva.variable} ${staffBeng.variable}`}
    >
      <StaffLocaleProvider>{children}</StaffLocaleProvider>
    </div>
  );
}
