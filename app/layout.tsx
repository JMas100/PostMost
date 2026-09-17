import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
// Marketing display type and large numerals both use Manrope (the "font-display" Tailwind
// utility) -- it's aliased to this same loaded instance in globals.css (--font-display: var
// (--font-heading)) rather than loading a second display face.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "postmost — Post once. Sell everywhere.",
  description: "Post once. Sell everywhere. The operating system for selling on every marketplace you use.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#090B0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", inter.variable, manrope.variable)}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
