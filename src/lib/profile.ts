import "server-only";
import { query, queryOne } from "@/db/client";

export type ProfileRating = {
  stars: number; comment: string | null; created_at: string;
  rater_name: string; rater_verified: boolean; rater_id: string;
};
export type ProfileBadge = {
  code: string; name: string; description: string | null; tier: string; icon: string | null; earned_at: string;
};

export async function getPublicProfile(tenantId: string, userId: string) {
  const user = await queryOne<any>(
    `SELECT id, name, first_name, city, country, avatar_url, bio, kyc_status,
            created_at, rating::float8 AS rating
       FROM users WHERE id=$1 AND tenant_id=$2 AND active=true`,
    [userId, tenantId]
  );
  if (!user) return null;

  const agg = await queryOne<any>(
    `SELECT
       (SELECT round(avg(stars)::numeric,1)::float8 FROM ratings WHERE ratee_id=$1 AND role='CARRIER') AS carrier_avg,
       (SELECT count(*)::int FROM ratings WHERE ratee_id=$1 AND role='CARRIER') AS carrier_n,
       (SELECT round(avg(stars)::numeric,1)::float8 FROM ratings WHERE ratee_id=$1 AND role='CLIENT') AS client_avg,
       (SELECT count(*)::int FROM ratings WHERE ratee_id=$1 AND role='CLIENT') AS client_n,
       (SELECT count(*)::int FROM trips WHERE traveler_id=$1) AS trips_n,
       (SELECT count(*)::int FROM shipments WHERE sender_id=$1) AS shipments_n`,
    [userId]
  );

  const ratingsRows = await query<ProfileRating & { role: string }>(
    `SELECT r.role, r.stars, r.comment, r.created_at,
            u.name AS rater_name, u.id AS rater_id, (u.kyc_status='VERIFIED') AS rater_verified
       FROM ratings r JOIN users u ON u.id=r.rater_id
      WHERE r.ratee_id=$1 ORDER BY r.created_at DESC`,
    [userId]
  );
  const carrierRatings = ratingsRows.filter((r) => r.role === "CARRIER");
  const clientRatings = ratingsRows.filter((r) => r.role === "CLIENT");

  const badges = await query<ProfileBadge>(
    `SELECT b.code, b.name, b.description, b.tier, b.icon, ub.earned_at
       FROM user_badges ub JOIN badges b ON b.id=ub.badge_id
      WHERE ub.user_id=$1 ORDER BY CASE b.tier WHEN 'ELITE' THEN 0 WHEN 'PRO' THEN 1 ELSE 2 END, b.sort_order`,
    [userId]
  );

  return {
    user,
    carrierAvg: agg?.carrier_avg ?? null, carrierN: agg?.carrier_n ?? 0,
    clientAvg: agg?.client_avg ?? null, clientN: agg?.client_n ?? 0,
    tripsN: agg?.trips_n ?? 0, shipmentsN: agg?.shipments_n ?? 0,
    carrierRatings, clientRatings, badges,
  };
}
