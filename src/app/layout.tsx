import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  weight: "400 500 600 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YT Comment Manager — Safe AI Community Management",
  description: "Automate YouTube comment management safely without hallucinations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${inter.variable} font-sans antialiased text-slate-900 bg-slate-50 dark:bg-ink-950 dark:text-paper-50 transition-colors duration-200`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}