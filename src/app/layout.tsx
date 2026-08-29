import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeScript } from "@/components/ThemeScript";
import { getLocale } from "@/i18n";

export const metadata: Metadata = {
  title: {
    default: "BugaWuga — gecontroleerde corridor-crowdshipping",
    template: "%s · BugaWuga",
  },
  description:
    "BugaWuga verbindt afzenders, reizigers, hubs en logistieke partners via één gecontroleerde corridor. Aangifte, inspectie, verzegeling en veilige overdracht — met chat tussen de partijen.",
  applicationName: "BugaWuga",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BugaWuga" },
  formatDetection: { telephone: false },
  metadataBase: new URL("https://pakkethub.com"),
  robots: { index: false, follow: false }, // domein nog niet geactiveerd
};

export const viewport: Viewport = {
  themeColor: "#e9481c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head><ThemeScript /></head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
