import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthGuard } from "@/components/AuthGuard";
import { ProductsProvider } from "@/components/ProductsProvider";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ 
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        overflow: 'auto'
      }}>
        <AuthGuard>
          <ProductsProvider>
            <div style={{
              minHeight: '100vh',
              padding: '20px',
              boxSizing: 'border-box'
            }}>
              {children}
            </div>
          </ProductsProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
