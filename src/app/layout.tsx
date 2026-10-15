import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import LiveLocationTracker from "@/components/LiveLocationTracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://badamsudheerreddy1-printweb.vercel.app"),
  title: {
    default: "PRINT DOCKER | Online Printing Service - Badam Sudheer Reddy",
    template: "%s | PRINT DOCKER",
  },
  description:
    "PRINT DOCKER — Professional online printing service by Badam Sudheer Reddy. Fast PDF printing, instant cost calculation, live order tracking, and high-quality document delivery.",
  applicationName: "PRINT DOCKER",
  keywords: [
    "PRINT DOCKER",
    "Print Docker",
    "PrintDocker",
    "PRINT DOCKER online printing",
    "print docker website",
    "Badam Sudheer Reddy",
    "printing service",
    "online printing",
    "PDF printing",
    "print management",
    "document printing",
  ],
  authors: [{ name: "Badam Sudheer Reddy" }],
  creator: "PRINT DOCKER",
  publisher: "PRINT DOCKER",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "458x458", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://badamsudheerreddy1-printweb.vercel.app",
    siteName: "PRINT DOCKER",
    title: "PRINT DOCKER | Online Printing Service - Badam Sudheer Reddy",
    description:
      "Professional online printing service by Badam Sudheer Reddy. Upload PDFs, track orders, and get prints quickly.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "PRINT DOCKER Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PRINT DOCKER | Online Printing Service",
    description:
      "Professional online printing service by Badam Sudheer Reddy. Upload PDFs, track orders, and get prints quickly.",
    images: ["/logo.png"],
  },
  verification: {
    google: "google55b2a982846d5d43.html",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://badamsudheerreddy1-printweb.vercel.app/#website",
      "url": "https://badamsudheerreddy1-printweb.vercel.app",
      "name": "PRINT DOCKER",
      "alternateName": [
        "Print Docker",
        "PrintDocker",
        "PRINT DOCKER | BADAM SUDHEER REDDY"
      ],
      "description": "Smart Online Printing Management System",
      "inLanguage": "en"
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://badamsudheerreddy1-printweb.vercel.app/#organization",
      "name": "PRINT DOCKER",
      "alternateName": "PRINT DOCKER | BADAM SUDHEER REDDY",
      "url": "https://badamsudheerreddy1-printweb.vercel.app",
      "logo": "https://badamsudheerreddy1-printweb.vercel.app/logo.png",
      "image": "https://badamsudheerreddy1-printweb.vercel.app/logo.png",
      "description": "Professional online printing management system by Badam Sudheer Reddy. Upload PDFs, track orders, and get instant delivery.",
      "telephone": "+918688509699",
      "email": "badamsudheerreddy1@gmail.com",
      "priceRange": "₹",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "IN"
      }
    }
  ]
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2D63FF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1D3A" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LiveLocationTracker />
            {children}
            <Toaster
              position="top-right"
              theme="light"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "#ffffff",
                  border: "1px solid #E2E6EF",
                  color: "#0B1D3A",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
