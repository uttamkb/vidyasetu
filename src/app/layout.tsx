import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VidyaSetu - Personal Tutor for CBSE Class 9",
  description: "AI-powered personal tutor dashboard for CBSE Class 9 students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-sans">
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
