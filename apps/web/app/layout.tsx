import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroceReal — Fresh Grocery Delivery",
  description: "GroceReal grocery delivery platform for Customers, Store Staff, and Drivers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col text-slate-900 selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
