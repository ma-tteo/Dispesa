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
  title: "Spesa Insieme - Lista della spesa condivisa",
  description: "App moderna per gestire la lista della spesa condivisa con la tua famiglia. Sincronizzazione in tempo reale, filtri intelligenti e interfaccia intuitiva.",
  keywords: ["lista spesa", "spesa condivisa", "famiglia", "shopping list", "condivisione", "spesa insieme"],
  authors: [{ name: "Spesa Insieme Team" }],
  icons: {
    icon: "🛒",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
