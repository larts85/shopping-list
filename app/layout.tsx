import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import { SessionProvider } from "next-auth/react";
import SessionRedirect from "./ui/sessionRedirect";
import { sessionMaxAgeInSeconds } from "./lib/authConfig";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lista de compra",
  description: "Listas de compras compartidas y organizadas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SessionProvider refetchInterval={sessionMaxAgeInSeconds}>
          <SessionRedirect />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

RootLayout.displayName = 'RootLayout';
