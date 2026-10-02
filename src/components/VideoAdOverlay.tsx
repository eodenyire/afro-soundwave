import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveCreativeUrl } from "@/lib/adCreative";

interface ServedAd {
  campaign_id: string;
  headline: string | null;
  creative_url: string;
  click_url: string | null;
  skip_after_seconds: number;
}

interface Props {
  videoId: string;
  category?: string | null;
  isMonetized: boolean;
  isOwner: boolean;
  /** Duration of the host video in seconds — mid-rolls only run on long-form. */
  durationSeconds?: number | null;
  /** Host <video> element, used to pause/resume around ad breaks. */
  playerEl?: HTMLVideoElement | null;
  onFinished?: () => void;
}

const MIDROLL_MIN_SECONDS = 480; // 8 minutes — mirrors serve_ad()

/**
 * Ad break overlay.
 * Serving rules live in the `serve_ad` RPC (monetized creators only, no Shorts
 * or sub-60s videos, one ad per viewer per video per 30 min, mid-roll only on
 * videos over 8 minutes). This component just requests a break and renders it.
 */
const VideoAdOverlay = ({
  videoId,
  category,
  isMonetized,
  isOwner,
  durationSeconds,
  playerEl,
  onFinished,
}: Props) => {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [creativeSrc, setCreativeSrc] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const requested = useRef<Set<string>>(new Set());
  const midrollPlayed = useRef(false);

  const requestAd = useCallback(
    async (adType: "pre_roll" | "mid_roll") => {
      if (!isMonetized || isOwner || !videoId) return;
      const token = `${videoId}:${adType}`;
      if (requested.current.has(token)) return;
      requested.current.add(token);

      const { data } = await (supabase as any).rpc("serve_ad", {
        p_video_id: videoId,
        p_category: category ?? null,
        p_ad_type: adType,
      });
      const served = Array.isArray(data) ? data[0] : data;
      if (served?.creative_url) {
        const src = await resolveCreativeUrl(served.creative_url);
        if (!src) return;
        playerEl?.pause();
        setCreativeSrc(src);
        setAd(served as ServedAd);
        setRemaining(served.skip_after_seconds ?? 5);
      }
    },
    [videoId, category, isMonetized, isOwner, playerEl],
  );

  // Pre-roll
  useEffect(() => {
    requestAd("pre_roll");
  }, [requestAd]);

  // Mid-roll at the halfway point of long-form videos
  useEffect(() => {
    const el = playerEl;
    if (!el) return;
    if (!durationSeconds || durationSeconds < MIDROLL_MIN_SECONDS) return;

    const onTime = () => {
      if (midrollPlayed.current) return;
      if (el.currentTime >= durationSeconds / 2) {
        midrollPlayed.current = true;
        requestAd("mid_roll");
      }
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [playerEl, durationSeconds, requestAd]);

  useEffect(() => {
    if (!ad) return;
    const t = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [ad]);

  if (!ad || !creativeSrc) return null;

  const close = () => {
    setAd(null);
    setCreativeSrc(null);
    playerEl?.play().catch(() => undefined);
    onFinished?.();
  };

  const handleClick = async () => {
    await (supabase as any).rpc("record_ad_event", {
      p_campaign_id: ad.campaign_id,
      p_video_id: videoId,
      p_event_type: "click",
    });
    if (ad.click_url) window.open(ad.click_url, "_blank", "noopener,noreferrer");
  };

  const isVideoCreative = /\.(mp4|webm|mov)(\?|$)/i.test(ad.creative_url);

  return (
    <div className="absolute inset-0 z-20 bg-black flex flex-col">
      <button type="button" onClick={handleClick} className="flex-1 min-h-0 w-full">
        {isVideoCreative ? (
          <video
            src={creativeSrc}
            autoPlay
            muted={muted}
            playsInline
            onEnded={close}
            className="w-full h-full object-contain"
          />
        ) : (
          <img src={creativeSrc} alt={ad.headline ?? "Advertisement"} className="w-full h-full object-contain" />
        )}
      </button>
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-background/95 border-t border-border">
        <span className="text-xs text-foreground truncate">
          Ad · {ad.headline ?? "Sponsored"}
          {ad.click_url ? " · Tap to visit advertiser" : ""}
        </span>
        {isVideoCreative && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="text-xs rounded-full px-3 py-1 bg-primary text-primary-foreground font-medium"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        )}
        <button
          type="button"
          onClick={close}
          disabled={remaining > 0}
          className="text-xs rounded-full px-3 py-1 bg-primary text-primary-foreground font-medium disabled:opacity-60"
        >
          {remaining > 0 ? `Skip in ${remaining}s` : "Skip ad"}
        </button>
      </div>
    </div>
  );
};

export default VideoAdOverlay;
