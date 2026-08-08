import type { Metadata } from "next";

const sharedIcons = {
  icon: [
    { url: "/favicon.ico", sizes: "48x48" },
    { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
  ],
} as const;

export const customerAppMetadata: Metadata = {
  applicationName: "لغات البن",
  manifest: "/manifests/customer.webmanifest",
  icons: {
    ...sharedIcons,
    icon: [
      ...sharedIcons.icon,
      {
        url: "/icons/customer/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/customer/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/customer/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/icons/customer/apple-touch-icon.png"],
  },
  appleWebApp: {
    capable: true,
    title: "لغات البن",
    statusBarStyle: "black-translucent",
  },
};

export const opsAppMetadata: Metadata = {
  applicationName: "طاقم لغات البن",
  title: {
    default: "طاقم لغات البن",
    template: "%s | طاقم لغات البن",
  },
  description: "Staff and admin app — Coffee Languages",
  manifest: "/manifests/ops.webmanifest",
  icons: {
    ...sharedIcons,
    icon: [
      ...sharedIcons.icon,
      {
        url: "/icons/ops/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/ops/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/ops/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/icons/ops/apple-touch-icon.png"],
  },
  appleWebApp: {
    capable: true,
    title: "طاقم لغات البن",
    statusBarStyle: "black-translucent",
  },
};
