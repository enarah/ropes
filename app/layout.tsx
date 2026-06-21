import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardAuthContext } from "@/lib/auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROPES Dashboard",
  description: "Ranger Operations Platform for Enarah Services",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authContext = await getDashboardAuthContext(
    isDatabaseConfigured() ? getPrismaClient() : undefined,
  );

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Suspense fallback={<DashboardFallback />}>
          <DashboardShell authContext={authContext}>{children}</DashboardShell>
        </Suspense>
      </body>
    </html>
  );
}

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-sand-100 px-4 py-6 text-charcoal-900">
      <p className="text-sm font-semibold">Loading ROPES demo context...</p>
    </div>
  );
}
