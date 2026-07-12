import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "HelmAssured — Policy Administration",
  description: "South African insurance PAS — real backend, no mock data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-panel text-slate-900">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
