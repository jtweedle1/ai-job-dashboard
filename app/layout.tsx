import type { Metadata } from "next";
import { Figtree, Fraunces, Nunito, Geist_Mono } from "next/font/google";
import "@/styles/icons/tabler-icons.css";
import "./globals.css";
import Providers from "./providers";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// Trailhead's display face. SOFT rounds the serifs; opsz lets large and small sizes each look right.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wayfinder: Job Search Dashboard",
  description: "Track your job search, generate cover letters, prep for interviews, and review your pipeline — all in one place.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} ${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
