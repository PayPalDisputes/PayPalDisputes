import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The seller dashboard's typeface (variable, so in-between weights like 420 render).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist Mono's digits only (unicode-range 0-9). Put first in a font stack, every number becomes
// monospaced while letters fall through to the next font. Used by the dashboard (.theme-app).
const digits = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-digits",
  weight: "100 900",
  declarations: [{ prop: "unicode-range", value: "U+0030-0039" }],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Disputes",
  description: "AI dispute assistant for PayPal sellers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${digits.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
