import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Quirra | Stop your AI from giving similar responses out",
  description: "Provenance for AI answers.",
  icons: {
    icon: [
      { url: "/logo1.png", sizes: "32x32" }, // favicon-like
      { url: "/logo1.png", sizes: "192x192" }, // high-DPI
    ],
    apple: [{ url: "/logo1.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
        <Header />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
            {children}
          </div>
        </main>
        <Footer />
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
