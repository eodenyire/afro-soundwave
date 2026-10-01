/**
 * Creator earnings maths — kept pure so it can be unit tested and so the
 * client always agrees with the `serve_ad` / `get_creator_earnings` SQL.
 */

/** Share of ad revenue paid to the creator. */
export const CREATOR_AD_SHARE = 0.55;
/** Share of a super chat paid to the creator (platform keeps 30%). */
export const CREATOR_SUPER_CHAT_SHARE = 0.7;

/** Ad rules — mirrored in the `serve_ad` database function. */
export const AD_RULES = {
  /** No ads on videos shorter than this (also excludes Shorts). */
  minVideoSeconds: 60,
  /** Mid-rolls only on videos at least this long. */
  midrollMinSeconds: 480,
  /** One ad per signed-in viewer per video within this window. */
  frequencyCapMinutes: 30,
} as const;

/** Revenue booked for one impression, from the campaign's CPM (cost per 1000). */
export const impressionRevenueCents = (cpmCents: number) =>
  Math.max(1, Math.floor(cpmCents / 1000));

/** Creator's cut of a single ad impression. */
export const creatorAdShareCents = (revenueCents: number) =>
  Math.round(revenueCents * CREATOR_AD_SHARE);

/** Creator's cut of a super chat, in cents. */
export const creatorSuperChatCents = (amountUsd: number) =>
  Math.round(Math.round(amountUsd * 100) * CREATOR_SUPER_CHAT_SHARE);

export interface EarningsInput {
  impressions: number;
  cpmCents: number;
  superChatsUsd: number[];
}

export interface EarningsBreakdown {
  adEarningsCents: number;
  superChatCents: number;
  totalCents: number;
}

export const calculateEarnings = ({
  impressions,
  cpmCents,
  superChatsUsd,
}: EarningsInput): EarningsBreakdown => {
  const perImpression = creatorAdShareCents(impressionRevenueCents(cpmCents));
  const adEarningsCents = perImpression * Math.max(0, impressions);
  const superChatCents = superChatsUsd.reduce((sum, amt) => sum + creatorSuperChatCents(amt), 0);
  return { adEarningsCents, superChatCents, totalCents: adEarningsCents + superChatCents };
};

/** Should an ad break be requested for this video at all? */
export const isAdEligible = (opts: {
  isMonetized: boolean;
  isOwner: boolean;
  isShort: boolean;
  durationSeconds: number;
  adType: "pre_roll" | "mid_roll";
}) => {
  if (!opts.isMonetized || opts.isOwner) return false;
  if (opts.isShort || opts.durationSeconds < AD_RULES.minVideoSeconds) return false;
  if (opts.adType === "mid_roll" && opts.durationSeconds < AD_RULES.midrollMinSeconds) return false;
  return true;
};

export const formatCents = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Display-only rounding for watch hours; keep the raw value for calculations. */
export const formatHours = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  return v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1);
};
