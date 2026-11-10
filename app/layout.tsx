import type { Metadata } from "next";
import { Baloo_2, Nunito_Sans, Geist_Mono } from "next/font/google";
import "@/styles/icons/tabler-icons.css";
import "./globals.css";
import Providers from "./providers";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

// Golden hour's display face: chunky and soft, for headings only.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700"],
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
      className={`${nunitoSans.variable} ${baloo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
