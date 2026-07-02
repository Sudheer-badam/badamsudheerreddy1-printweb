import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Antigravity - Smart Online Printing Management",
    template: "%s | Antigravity",
  },
  description:
    "Professional online printing management system. Upload PDFs, track orders, manage payments, and get real-time status updates.",
  keywords: [
    "printing service",
    "online printing",
    "PDF printing",
    "print management",
    "Antigravity",
  ],
  authors: [{ name: "Antigravity" }],
  creator: "Antigravity",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: "Antigravity - Smart Online Printing Management",
    description:
      "Professional online printing management system. Upload PDFs, track orders, manage payments.",
    siteName: "Antigravity",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              theme="dark"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "rgba(15, 15, 25, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
