import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SAMAY – AICTE Intelligent Approval Workflow & Deadline Guard",
  description: "Next-generation approval routing, compliance monitoring, and backward-planning deadline guard for AICTE Regulation Bureau.",
  icons: {
    icon: "/samay-logo.png",
    apple: "/samay-logo.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSans.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-[#0B1B3A] text-[#082015] dark:text-[#FFFFFF] font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-900 dark:selection:bg-orange-900 dark:selection:text-amber-100 transition-colors duration-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
