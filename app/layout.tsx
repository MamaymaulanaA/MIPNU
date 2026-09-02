import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";

import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-rubik",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "MIPNU",
    template: "%s · MIPNU",
  },
  description:
    "Manajemen Informasi Pelajar Nahdlatul Ulama — platform manajemen organisasi IPNU & IPPNU.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F356B",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={rubik.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
