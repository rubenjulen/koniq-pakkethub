import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { queryOne } from "@/db/client";
import { getPublicProfile, type ProfileRating, type ProfileBadge } from "@/lib/profile";
import { getMessages } from "@/i18n";
import { Stars } from "@/components/Stars";
import { Chip } from "@/components/ui";
import { dateNL } from "@/lib/format";
import { followAction, unfollowAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profiel" };

function Avatar({ name, url, size = 72 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" width={size} height={size} className="rounded-2xl object-cover" style={{ width: size, height: size }} />;
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-2xl bg-orange-100 font-bold text-orange-700"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</div>
  );
}

function RatingList({ ratings, empty }: { ratings: ProfileRating[]; empty: string }) {
  if (ratings.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="divide-y divide-slate-100">
      {ratings.map((r, i) => (
        <div key={i} className="flex gap-3 py-3">
          <Avatar name={r.rater_name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{r.rater_name}</span>
              {r.rater_verified && <span className="text-xs text-orange-600">✓</span>}
              <Stars value={r.stars} size={14} />
            </div>
            {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Badges({ badges, t, empty }: { badges: ProfileBadge[]; t: Awaited<ReturnType<typeof getMessages>>["prof"]; empty: string }) {
  if (badges.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  const groups: [string, string, string][] = [["ELITE", t.elite, t.elite_sub], ["PRO", t.pro, t.pro_sub], ["STANDARD", t.standard, t.standard_sub]];
  return (
    <div className="space-y-5">
      {groups.map(([tier, title, sub]) => {
        const list = badges.filter((b) => b.tier === tier);
        if (list.length === 0) return null;
        return (
          <div key={tier}>
            <div className="text-sm font-semibold text-slate-800">{title}</div>
            <div className="text-xs text-slate-500">{sub}</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {list.map((b) => (
                <div key={b.code} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xl ring-1 ring-orange-200">{b.icon ?? "🏅"}</div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800">{b.name}</div>
                    <div className="text-xs text-slate-500">{b.description}</div>
                    <div className="text-[11px] text-slate-400">{t.earned} {dateNL(b.earned_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function ProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await requireSession();
  const { id } = await params;
  const { tab = "carrier" } = await searchParams;
  const t = (await getMessages()).prof;
  const p = await getPublicProfile(viewer.tenantId, id);
  if (!p) notFound();

  const isFollowing = await queryOne<{ x: number }>(
    `SELECT 1 AS x FROM follows WHERE follower_id=$1 AND followee_id=$2`, [viewer.id, id]);
  const isSelf = viewer.id === id;
  const verified = p.user.kyc_status === "VERIFIED";
  const tabLink = (k: string) => `/app/u/${id}?tab=${k}`;
  const tabCls = (k: string) => `border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-orange-500 text-orange-700" : "border-transparent text-slate-500 hover:text-slate-700"}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/marketplace" className="text-sm text-orange-600 hover:underline">{t.back}</Link>

      {/* Kop */}
      <section className="ph-card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={p.user.name} url={p.user.avatar_url} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{p.user.name}</h1>
              {verified && <Chip tone="ok">✓ {t.verified}</Chip>}
            </div>
            {p.user.bio && <p className="mt-1 max-w-lg text-sm text-slate-600">{p.user.bio}</p>}
            <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex justify-between sm:block"><span className="text-slate-500">{t.member_since}: </span><span className="font-medium">{dateNL(p.user.created_at)}</span></div>
              <div className="flex justify-between sm:block"><span className="text-slate-500">{t.based_in}: </span><span className="font-medium">{[p.user.city, p.user.country].filter(Boolean).join(", ") || "—"}</span></div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-2"><span className="text-slate-500">{t.rating_carrier}: </span><span className="flex items-center gap-1"><Stars value={p.carrierAvg} size={14} /><span className="text-xs text-slate-400">({p.carrierN})</span></span></div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-2"><span className="text-slate-500">{t.rating_client}: </span><span className="flex items-center gap-1"><Stars value={p.clientAvg} size={14} /><span className="text-xs text-slate-400">({p.clientN})</span></span></div>
              <div className="flex justify-between sm:block"><span className="text-slate-500">{t.trips_n}: </span><span className="font-medium">{p.tripsN}</span></div>
              <div className="flex justify-between sm:block"><span className="text-slate-500">{t.shipments_n}: </span><span className="font-medium">{p.shipmentsN}</span></div>
            </div>
          </div>
          {!isSelf && (
            <div className="flex flex-col gap-2">
              {isFollowing ? (
                <form action={unfollowAction}><input type="hidden" name="user_id" value={id} /><button className="ph-btn ph-btn-ghost text-sm">✓ {t.following}</button></form>
              ) : (
                <form action={followAction}><input type="hidden" name="user_id" value={id} /><button className="ph-btn ph-btn-primary text-sm">+ {t.follow}</button></form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <Link href={tabLink("carrier")} className={tabCls("carrier")}>{t.tab_carrier}</Link>
        <Link href={tabLink("client")} className={tabCls("client")}>{t.tab_client}</Link>
        <Link href={tabLink("badges")} className={tabCls("badges")}>{t.tab_badges}</Link>
      </div>

      <section className="ph-card p-5">
        {tab === "carrier" && <RatingList ratings={p.carrierRatings} empty={t.no_ratings} />}
        {tab === "client" && <RatingList ratings={p.clientRatings} empty={t.no_ratings} />}
        {tab === "badges" && <Badges badges={p.badges} t={t} empty={t.no_badges} />}
      </section>
    </div>
  );
}
