export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
    <html
      lang="es"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-dvh bg-background text-foreground overflow-x-hidden">
        {/* Ambient background gradient */}
        <div
          className="fixed inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(34,211,238,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 0%, rgba(139,92,246,0.06) 0%, transparent 50%)",
          }}
        />
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
