import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { DemoBar } from "@/components/demo-bar";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InsideOut · See what's behind your food",
  description: "Peek inside restaurant kitchens before you eat. Live, time-stamped, straight from the restaurant.",
};

export const viewport: Viewport = {
  themeColor: "#f5f2ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <StoreProvider>
          {children}
          <DemoBar />
        </StoreProvider>
      </body>
    </html>
  );
}
