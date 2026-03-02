import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dispensa - La tua spesa, organizzata",
  description: "App moderna per gestire la lista della spesa condivisa con la tua famiglia. Sincronizzazione in tempo reale, filtri intelligenti e interfaccia intuitiva.",
  keywords: ["lista spesa", "spesa condivisa", "famiglia", "shopping list", "condivisione", "dispensa"],
  authors: [{ name: "Dispensa Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dispensa",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#98D8AA" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <link rel="apple-touch-icon" href="/logo.svg" />
        </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
