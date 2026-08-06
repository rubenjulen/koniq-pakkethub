import { SiteHeader, SiteFooter, StagedBanner } from "@/components/SiteChrome";
import { getLocale, getMessages } from "@/i18n";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StagedBanner m={m} />
      <SiteHeader m={m} locale={locale} />
      <div className="flex-1">{children}</div>
      <SiteFooter m={m} />
    </div>
  );
}
