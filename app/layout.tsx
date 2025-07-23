import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Gestión de ventas V1",
  description: "Sistema de gestión de ventas para tu negocio.",
  icons: {
    icon: "/favicon.ico",
  },
};



import { AuthGuard } from "@/components/AuthGuard";
import { ProductsProvider } from "@/components/ProductsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`bg-zinc-950 text-white min-h-screen ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Aquí se pueden renderizar toasts globales, modales, etc. */}
        <ProductsProvider>
          <AuthGuard>{children}</AuthGuard>
        </ProductsProvider>
      </body>
    </html>
  );
}
