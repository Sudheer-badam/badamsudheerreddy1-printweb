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
    default: "Sudheer Reddy Print - Smart Online Printing Management",
    template: "%s | Sudheer Reddy Print",
  },
  description:
    "Sudheer Reddy Print — Professional online printing management. Upload PDFs, track orders, manage payments, and get real-time status updates.",
  keywords: [
    "printing service",
    "online printing",
    "PDF printing",
    "print management",
    "Sudheer Reddy Print",
  ],
  authors: [{ name: "Sudheer Reddy Print" }],
  creator: "Sudheer Reddy Print",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: "Sudheer Reddy Print - Smart Online Printing Management",
    description:
      "Professional online printing management system. Upload PDFs, track orders, manage payments.",
    siteName: "Sudheer Reddy Print",
  },
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
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
