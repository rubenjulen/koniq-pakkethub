"use client";
import { useState } from "react";

/**
 * Privacybewuste video-embed (FR-WEB-004): laadt YouTube pas ná toestemming, via
 * youtube-nocookie. Toont daarvoor alleen een poster + play-knop; er worden geen
 * YouTube-cookies of -verzoeken gedaan tot de bezoeker klikt.
 */
export function VideoEmbed({ id, title }: { id: string; title: string }) {
  const [consented, setConsented] = useState(false);

  return (
    <div className="ph-card overflow-hidden">
      <div className="relative aspect-video bg-slate-900">
        {consented ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerator; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setConsented(true)}
            className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center"
            aria-label={`Video afspelen: ${title}`}
          >
            {/* Poster wordt pas geladen na klik? Nee — poster is nodig als preview.
                We tonen een merk-poster i.p.v. YouTube-thumbnail om óók dat verzoek te vermijden. */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg transition group-hover:scale-110">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="relative mt-3 max-w-xs px-4 text-center text-sm font-medium text-white">{title}</span>
            <span className="relative mt-1 text-xs text-slate-400">Klik om te laden — pas dan wordt YouTube geladen</span>
          </button>
        )}
      </div>
    </div>
  );
}
