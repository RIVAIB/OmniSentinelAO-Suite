export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OmniSentinel | RIVAIB Tech",
    template: "%s | OmniSentinel",
  },
  description: "Multi-agent orchestration & War Room — RIVAIB Health Clinic",
  robots: { index: false, follow: false },
};

import { AppLayoutWrapper } from "./AppLayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
        <Toaster />
      </body>
    </html>
  );
}
