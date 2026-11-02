import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { brand } from "@klimacin/config";
import "@klimacin/ui/styles.css";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
});

const sans = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: `${brand.name} — İşletme paneli`,
  description: brand.slogan,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
