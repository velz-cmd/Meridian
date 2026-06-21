import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ArcPageTransition } from "@/components/layout/arc-page-transition";
import { AppProviders } from "@/components/providers/app-providers";
import { MERIDIAN_META_DESCRIPTION, MERIDIAN_PAGE_TITLE } from "@/lib/meridian-brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: MERIDIAN_PAGE_TITLE,
  description: MERIDIAN_META_DESCRIPTION,
  icons: {
    icon: "/meridian-logo-mark.svg",
    apple: "/meridian-logo-480.png",
  },
  openGraph: {
    title: MERIDIAN_PAGE_TITLE,
    description: MERIDIAN_META_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="arc-site min-h-full antialiased">
        <AppProviders>
          <Navbar />
          <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 [&:has([data-nexus-page])]:pb-0">
            <ArcPageTransition>{children}</ArcPageTransition>
          </main>
          <MobileBottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
