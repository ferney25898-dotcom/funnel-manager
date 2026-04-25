import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FunnelManager",
  description: "Visual launch funnel & team operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
