import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const APP_NAME = "NutriIA";
const APP_DESCRIPTION = "Rastreamento nutricional com inteligência artificial";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body>
          {children}
          <RegisterSW />
        </body>
      </html>
    </ClerkProvider>
  );
}
