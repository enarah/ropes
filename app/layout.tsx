import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DashboardShell } from "@/components/dashboard-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ROPES Dashboard",
  description: "Ranger Operations Platform for Enarah Services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
