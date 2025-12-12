import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI-Assisted Compliance Vetting",
  description: "AI-assisted COPPA, CIPA, and FERPA compliance checks for K-12 schools.",
  openGraph: {
    title: "Legend | AI Vendor Vetting",
    description: "AI-assited compliance checks for K-12 schools.",
    siteName: "Legend",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#FDFCF8]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-[#FDFCF8]`}
      >
        {children}
      </body>
    </html>
  );
}
