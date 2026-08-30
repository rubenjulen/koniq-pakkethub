import { SiteHeader, SiteFooter, StagedBanner } from "@/components/SiteChrome";
import { getLocale, getMessages } from "@/i18n";
import { getTenantId } from "@/lib/tenant";
import { getPublicStats } from "@/lib/market";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [m, locale, tenantId] = await Promise.all([getMessages(), getLocale(), getTenantId()]);
  // Live signaal: hoeveel routes + verzoeken staan er publiek open (voor de "Ontdek"-teller).
  const stats = await getPublicStats(tenantId);
  const discoverCount = stats.totalRoutes + stats.totalRequests;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StagedBanner m={m} />
      <SiteHeader m={m} locale={locale} discoverCount={discoverCount} />
      <div className="flex-1">{children}</div>
      <SiteFooter m={m} discoverCount={discoverCount} />
    </div>
  );
}
