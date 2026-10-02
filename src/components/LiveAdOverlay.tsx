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
  streamId: string;
  category?: string | null;
  isMonetized: boolean;
  isOwner: boolean;
  /** Live <video> element, paused while the ad break runs. */
  playerEl?: HTMLVideoElement | null;
  onFinished?: () => void;
}

/**
 * Ad break overlay for live streams. Serving rules live in the `serve_live_ad`
 * RPC (monetized creators only, live streams only, one ad per viewer per
 * creator per 30 minutes).
 */
const LiveAdOverlay = ({ streamId, category, isMonetized, isOwner, playerEl, onFinished }: Props) => {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [creativeSrc, setCreativeSrc] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const requested = useRef(false);

  const requestAd = useCallback(async () => {
    if (!isMonetized || isOwner || !streamId || requested.current) return;
    requested.current = true;

    const { data } = await (supabase as any).rpc("serve_live_ad", {
      p_stream_id: streamId,
      p_category: category ?? null,
      p_ad_type: "pre_roll",
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
  }, [streamId, category, isMonetized, isOwner, playerEl]);

  useEffect(() => {
    requestAd();
  }, [requestAd]);

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
      p_video_id: null,
      p_event_type: "click",
    });
    if (ad.click_url) window.open(ad.click_url, "_blank", "noopener,noreferrer");
  };

  const isVideoCreative = /\.(mp4|webm|mov)(\?|$)/i.test(ad.creative_url);

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col">
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

export default LiveAdOverlay;
