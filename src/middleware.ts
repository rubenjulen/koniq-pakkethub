import { NextRequest, NextResponse } from "next/server";

/**
 * Site-brede staging-poort. Actief zodra STAGING_PASSWORD is gezet (dus niet lokaal).
 * Bezoekers zonder geldig ph_staging-cookie worden naar /gate gestuurd.
 * Uitgezonderd: de poort zelf, statische assets, media, en de publieke API (zodat
 * compagnons de REST-API met hun API-sleutel kunnen testen).
 */
const BYPASS = [
  "/gate",
  "/api/gate",
  "/embed",         // publieke insluitbare widget (voor externe sites)
  "/api/v1",        // publieke API: eigen Bearer-auth
  "/manifest.webmanifest",
  "/robots.txt",
  "/sw.js",
  "/offline",
];

export function middleware(req: NextRequest) {
  const pass = process.env.STAGING_PASSWORD;
  if (!pass) return NextResponse.next(); // geen poort in dev / niet geconfigureerd

  const { pathname } = req.nextUrl;
  if (BYPASS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const cookie = req.cookies.get("ph_staging")?.value;
  if (cookie === pass) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Draai op alles behalve Next-internals en bestanden met een extensie (assets).
  matcher: ["/((?!_next/|icons/|media/|.*\\.[\\w]+$).*)"],
};
