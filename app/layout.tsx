import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthGuard } from "../components/AuthGuard";
import { ProductsProvider } from "../components/ProductsProvider";
import { ThemeProvider } from "../contexts/ThemeContext";
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
  title: "Gestión de Ventas V1 - Sistema POS",
  description: "Sistema profesional de punto de venta para gestionar tu negocio. Optimizado para móviles y tablets.",
  keywords: ["punto de venta", "POS", "gestión", "ventas", "negocio", "móvil"],
  authors: [{ name: "Gestión de Ventas V1" }],
  creator: "Gestión de Ventas V1",
  publisher: "Gestión de Ventas V1",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gestión de Ventas V1",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Gestión de Ventas V1",
    "application-name": "Gestión de Ventas V1",
    "msapplication-TileColor": "#2d89ef",
    "msapplication-config": "/browserconfig.xml"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export const themeColor = [
  { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  { media: "(prefers-color-scheme: dark)", color: "#09090b" }
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gestión de Ventas V1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthGuard>
            <ProductsProvider>
              {children}
            </ProductsProvider>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
