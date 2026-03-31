import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Royalty QR - Plataforma de Fidelización",
  description: "Gestiona programas de lealtad y recompensas mediante códigos QR. Multi-tenant, escalable y fácil de usar.",
  keywords: ["Royalty QR", "fidelización", "lealtad", "recompensas", "QR", "SaaS", "programa de puntos"],
  authors: [{ name: "Royalty QR" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Royalty QR - Plataforma de Fidelización",
    description: "Gestiona programas de lealtad y recompensas mediante códigos QR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
