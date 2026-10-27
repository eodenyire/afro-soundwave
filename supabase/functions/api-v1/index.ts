// AfriTube Public API v1
// Base URL: {SUPABASE_URL}/functions/v1/api-v1
// Auth: `Authorization: Bearer aftb_sk_...` or `x-api-key: aftb_sk_...`
// Scopes: content | analytics | ads | monetization | all (see /openapi.json)
// Versioning contract: breaking changes only in /v2; additions are non-breaking.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VERSION = "v1";
const RATE_LIMIT_PER_MINUTE = 120;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

type Ctx = {
  req: Request;
  url: URL;
  segments: string[];
  keyId: string;
  userId: string;
};

// ---------- helpers ----------

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-AfriTube-Api-Version": VERSION,
      ...extra,
    },
  });
}

function err(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  return lines.join("\n");
}

function intParam(url: URL, name: string, def: number, min: number, max: number): number | null {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

const creatorEmbed = "profiles(display_name, avatar_url)";

// ---------- scopes ----------

const SCOPE_FOR_GROUP: Record<string, string> = {
  videos: "content",
  creators: "content",
  "live-streams": "content",
  playlists: "content",
  search: "content",
  analytics: "analytics",
  earnings: "analytics",
  reports: "analytics",
  ads: "ads",
  monetization: "monetization",
};

function scopeAllows(scopes: string[], needed: string): boolean {
  return scopes.includes("all") || scopes.includes(needed);
}

// ---------- handlers (ctx.userId = key owner) ----------

async function listVideos(ctx: Ctx): Promise<Response> {
  const { url } = ctx;
  const limit = intParam(url, "limit", 12, 1, 50);
  const offset = intParam(url, "offset", 0, 0, 10000);
  if (limit === null || offset === null) return err(400, "invalid_param", "limit must be 1-50, offset must be >= 0");

  let q = admin
    .from("videos")
    .select(`*, ${creatorEmbed}`, { count: "exact" })
    .eq("is_published", true)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const category = url.searchParams.get("category");
  if (category) q = q.eq("category", category);
  const creator = url.searchParams.get("creator");
  if (creator) q = q.eq("user_id", creator);
  const isShort = url.searchParams.get("is_short");
  if (isShort === "true" || isShort === "false") q = q.eq("is_short", isShort === "true");
  const search = url.searchParams.get("q");
  if (search) q = q.ilike("title", `%${search.replace(/[%_]/g, "")}%`);

  const { data, error, count } = await q;
  if (error) return err(500, "query_failed", error.message);
  return json({ data, meta: { total: count ?? 0, limit, offset, version: VERSION } });
}

async function getVideo(ctx: Ctx): Promise<Response> {
  const id = ctx.segments[1];
  const { data, error } = await admin
    .from("videos")
    .select(`*, ${creatorEmbed}`)
    .eq("id", id)
    .eq("is_published", true)
    .eq("visibility", "public")
    .maybeSingle();
  if (error) return err(500, "query_failed", error.message);
  if (!data) return err(404, "not_found", "video not found");
  return json({ data, meta: { version: VERSION } });
}

async function listCreators(ctx: Ctx): Promise<Response> {
  const { url } = ctx;
  const limit = intParam(url, "limit", 20, 1, 50);
  const offset = intParam(url, "offset", 0, 0, 10000);
  if (limit === null || offset === null) return err(400, "invalid_param", "limit must be 1-50, offset must be >= 0");

  let q = admin
    .from("profiles")
    .select("user_id, display_name, avatar_url, bio, subscriber_count, watch_hours, is_monetized", { count: "exact" })
    .eq("is_creator", true)
    .order("subscriber_count", { ascending: false })
    .range(offset, offset + limit - 1);
  const search = url.searchParams.get("q");
  if (search) q = q.ilike("display_name", `%${search.replace(/[%_]/g, "")}%`);

  const { data, error, count } = await q;
  if (error) return err(500, "query_failed", error.message);
  return json({ data, meta: { total: count ?? 0, limit, offset, version: VERSION } });
}

async function getCreator(ctx: Ctx): Promise<Response> {
  const userId = ctx.segments[1];
  const { data: profile, error } = await admin
    .from("profiles")
    .select("user_id, display_name, avatar_url, bio, subscriber_count, watch_hours, is_monetized, is_creator")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return err(500, "query_failed", error.message);
  if (!profile) return err(404, "not_found", "creator not found");

  const { data: vids } = await admin
    .from("videos")
    .select("views")
    .eq("user_id", userId)
    .eq("is_published", true)
    .eq("visibility", "public");
  const videosCount = vids?.length ?? 0;
  const totalViews = (vids ?? []).reduce((s, v) => s + (v.views ?? 0), 0);

  return json({ data: { ...profile, videos_count: videosCount, total_views: totalViews }, meta: { version: VERSION } });
}

async function creatorVideos(ctx: Ctx): Promise<Response> {
  const userId = ctx.segments[1];
  const { url } = ctx;
  const limit = intParam(url, "limit", 12, 1, 50);
  const offset = intParam(url, "offset", 0, 0, 10000);
  if (limit === null || offset === null) return err(400, "invalid_param", "limit must be 1-50, offset must be >= 0");

  const { data, error, count } = await admin
    .from("videos")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .eq("is_published", true)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return err(500, "query_failed", error.message);
  return json({ data, meta: { total: count ?? 0, limit, offset, version: VERSION } });
}

async function listLiveStreams(ctx: Ctx): Promise<Response> {
  const { url } = ctx;
  const limit = intParam(url, "limit", 20, 1, 50);
  if (limit === null) return err(400, "invalid_param", "limit must be 1-50");

  let q = admin
    .from("live_streams")
    .select(`id, title, description, status, visibility, scheduled_for, started_at, ended_at, thumbnail_url, viewer_count, peak_viewer_count, latency_mode, ${creatorEmbed}`)
    .eq("visibility", "public")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  const status = url.searchParams.get("status");
  if (status && ["live", "scheduled", "ended", "idle"].includes(status)) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return err(500, "query_failed", error.message);
  return json({ data, meta: { count: data?.length ?? 0, version: VERSION } });
}

async function listPlaylists(ctx: Ctx): Promise<Response> {
  const { url } = ctx;
  const limit = intParam(url, "limit", 20, 1, 50);
  if (limit === null) return err(400, "invalid_param", "limit must be 1-50");

  let q = admin
    .from("playlists")
    .select(`id, title, description, cover_url, playlist_type, created_at, updated_at, ${creatorEmbed}`)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  const user = url.searchParams.get("user");
  if (user) q = q.eq("user_id", user);

  const { data, error } = await q;
  if (error) return err(500, "query_failed", error.message);
  return json({ data, meta: { count: data?.length ?? 0, version: VERSION } });
}

async function searchAll(ctx: Ctx): Promise<Response> {
  const q = (ctx.url.searchParams.get("q") || "").trim().replace(/[%_]/g, "");
  if (!q) return err(400, "invalid_param", "q is required");
  if (q.length > 100) return err(400, "invalid_param", "q must be at most 100 characters");

  const [videos, creators, playlists] = await Promise.all([
    admin
      .from("videos")
      .select(`*, ${creatorEmbed}`)
      .eq("is_published", true)
      .eq("visibility", "public")
      .ilike("title", `%${q}%`)
      .order("views", { ascending: false })
      .limit(20),
    admin
      .from("profiles")
      .select("user_id, display_name, avatar_url, bio, subscriber_count")
      .eq("is_creator", true)
      .ilike("display_name", `%${q}%`)
      .limit(20),
    admin
      .from("playlists")
      .select(`id, title, description, cover_url, playlist_type, ${creatorEmbed}`)
      .eq("is_public", true)
      .ilike("title", `%${q}%`)
      .limit(20),
  ]);

  return json({
    data: { videos: videos.data ?? [], creators: creators.data ?? [], playlists: playlists.data ?? [] },
    meta: { q, version: VERSION },
  });
}

async function analyticsOverview(ctx: Ctx): Promise<Response> {
  const userId = ctx.userId;
  const { data: profile, error } = await admin
    .from("profiles")
    .select("user_id, display_name, subscriber_count, watch_hours, is_monetized")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return err(500, "query_failed", error.message);
  if (!profile) return err(404, "not_found", "profile not found");

  const { data: vids } = await admin.from("videos").select("views, is_published").eq("user_id", userId);
  const published = (vids ?? []).filter((v) => v.is_published);
  return json({
    data: {
      ...profile,
      videos_count: published.length,
      total_views: published.reduce((s, v) => s + (v.views ?? 0), 0),
    },
    meta: { version: VERSION },
  });
}

async function analyticsVideos(ctx: Ctx): Promise<Response> {
  const days = intParam(ctx.url, "days", 28, 1, 365);
  if (days === null) return err(400, "invalid_param", "days must be 1-365");
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [{ data: vids }, { data: events }] = await Promise.all([
    admin.from("videos").select("id, title, views").eq("user_id", ctx.userId).eq("is_published", true),
    admin
      .from("watch_history")
      .select("video_id, watch_seconds")
      .eq("creator_id", ctx.userId)
      .gte("created_at", since),
  ]);

  const byVideo = new Map<string, { views: number; watch_seconds: number }>();
  for (const e of events ?? []) {
    const cur = byVideo.get(e.video_id) ?? { views: 0, watch_seconds: 0 };
    cur.views += 1;
    cur.watch_seconds += e.watch_seconds ?? 0;
    byVideo.set(e.video_id, cur);
  }

  const data = (vids ?? []).map((v) => ({
    video_id: v.id,
    title: v.title,
    total_views: v.views,
    period_views: byVideo.get(v.id)?.views ?? 0,
    watch_seconds: byVideo.get(v.id)?.watch_seconds ?? 0,
  }));
  return json({ data, meta: { days, version: VERSION } });
}

async function analyticsVideoById(ctx: Ctx): Promise<Response> {
  const id = ctx.segments[2];
  const { data: video } = await admin
    .from("videos")
    .select("id, user_id, title, views")
    .eq("id", id)
    .maybeSingle();
  if (!video) return err(404, "not_found", "video not found");
  if (video.user_id !== ctx.userId) return err(403, "forbidden", "you can only view analytics for your own videos");

  const { data: events } = await admin
    .from("watch_history")
    .select("watch_seconds")
    .eq("video_id", id);
  return json({
    data: {
      video_id: id,
      title: video.title,
      total_views: video.views,
      tracked_sessions: events?.length ?? 0,
      watch_seconds: (events ?? []).reduce((s, e) => s + (e.watch_seconds ?? 0), 0),
    },
    meta: { version: VERSION },
  });
}

async function earningsCreator(ctx: Ctx): Promise<Response> {
  const userId = ctx.userId;
  const [{ data: adEvents }, { data: superChats }] = await Promise.all([
    admin
      .from("ad_events")
      .select("event_type, revenue_cents, creator_share_cents")
      .eq("creator_id", userId),
    admin
      .from("live_super_chats")
      .select("amount_usd, live_streams!inner(creator_id)")
      .eq("live_streams.creator_id", userId),
  ]);

  const impressions = (adEvents ?? []).filter((e) => e.event_type === "impression").length;
  const clicks = (adEvents ?? []).filter((e) => e.event_type === "click").length;
  const adEarnings = (adEvents ?? []).reduce((s, e) => s + (e.creator_share_cents ?? 0), 0);
  const superChat = Math.round((superChats ?? []).reduce((s, c) => s + Number(c.amount_usd ?? 0), 0) * 70);

  return json({
    data: {
      impressions,
      clicks,
      ad_earnings_cents: adEarnings,
      super_chat_cents: superChat,
      total_cents: adEarnings + superChat,
    },
    meta: { currency: "USD", version: VERSION },
  });
}

async function adsCampaigns(ctx: Ctx): Promise<Response> {
  const { data: advertisers } = await admin.from("advertisers").select("id").eq("user_id", ctx.userId);
  const ids = (advertisers ?? []).map((a) => a.id);
  if (ids.length === 0) return json({ data: [], meta: { count: 0, version: VERSION } });

  const [{ data: campaigns }, { data: events }] = await Promise.all([
    admin
      .from("ad_campaigns")
      .select("id, name, ad_type, headline, status, budget_cents, spent_cents, cpm_cents, target_categories, starts_at, ends_at, created_at")
      .in("advertiser_id", ids)
      .order("created_at", { ascending: false }),
    admin
      .from("ad_events")
      .select("campaign_id, event_type")
      .in("campaign_id", ids),
  ]);

  const byCampaign = new Map<string, { impressions: number; clicks: number }>();
  for (const e of events ?? []) {
    const cur = byCampaign.get(e.campaign_id) ?? { impressions: 0, clicks: 0 };
    if (e.event_type === "impression") cur.impressions += 1;
    if (e.event_type === "click") cur.clicks += 1;
    byCampaign.set(e.campaign_id, cur);
  }

  const data = (campaigns ?? []).map((c) => ({
    ...c,
    impressions: byCampaign.get(c.id)?.impressions ?? 0,
    clicks: byCampaign.get(c.id)?.clicks ?? 0,
  }));
  return json({ data, meta: { count: data.length, version: VERSION } });
}

async function adsCampaignById(ctx: Ctx): Promise<Response> {
  const id = ctx.segments[2];
  const { data: campaign } = await admin
    .from("ad_campaigns")
    .select("id, advertiser_id, name, ad_type, headline, click_url, status, budget_cents, spent_cents, cpm_cents, skip_after_seconds, target_categories, starts_at, ends_at, created_at, review_note")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return err(404, "not_found", "campaign not found");

  const { data: adv } = await admin.from("advertisers").select("user_id").eq("id", campaign.advertiser_id).maybeSingle();
  if (adv?.user_id !== ctx.userId) return err(403, "forbidden", "you can only view your own campaigns");

  const { data: events } = await admin
    .from("ad_events")
    .select("event_type, revenue_cents, creator_share_cents")
    .eq("campaign_id", id);
  const impressions = (events ?? []).filter((e) => e.event_type === "impression").length;
  const clicks = (events ?? []).filter((e) => e.event_type === "click").length;

  return json({
    data: {
      ...campaign,
      impressions,
      clicks,
      spend_cents: (events ?? []).reduce((s, e) => s + (e.revenue_cents ?? 0), 0),
      creator_share_cents: (events ?? []).reduce((s, e) => s + (e.creator_share_cents ?? 0), 0),
    },
    meta: { version: VERSION },
  });
}

async function adsStatement(ctx: Ctx): Promise<Response> {
  const { url } = ctx;
  const end = url.searchParams.get("end");
  const start = url.searchParams.get("start");
  if ((start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) || (end && !/^\d{4}-\d{2}-\d{2}$/.test(end))) {
    return err(400, "invalid_param", "start and end must be YYYY-MM-DD");
  }
  const startIso = start ? new Date(`${start}T00:00:00Z`).toISOString() : new Date(0).toISOString();
  const endIso = end ? new Date(`${end}T23:59:59Z`).toISOString() : new Date().toISOString();

  const { data: advertisers } = await admin.from("advertisers").select("id, company_name, credits_cents").eq("user_id", ctx.userId);
  if (!advertisers || advertisers.length === 0) return err(404, "not_found", "no advertiser account for this key");

  const adv = advertisers[0];
  const [{ data: transactions }, { data: events }, { data: campaigns }] = await Promise.all([
    admin
      .from("advertiser_credit_transactions")
      .select("amount_cents, kind, reference, created_at")
      .eq("advertiser_id", adv.id)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false }),
    admin
      .from("ad_events")
      .select("campaign_id, event_type, revenue_cents")
      .in("campaign_id", (await admin.from("ad_campaigns").select("id").eq("advertiser_id", adv.id)).data?.map((c) => c.id) ?? [])
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    admin.from("ad_campaigns").select("id, name").eq("advertiser_id", adv.id),
  ]);

  const nameById = new Map((campaigns ?? []).map((c) => [c.id, c.name]));
  const byCampaign = new Map<string, { impressions: number; clicks: number; spend_cents: number }>();
  for (const e of events ?? []) {
    const cur = byCampaign.get(e.campaign_id) ?? { impressions: 0, clicks: 0, spend_cents: 0 };
    if (e.event_type === "impression") cur.impressions += 1;
    if (e.event_type === "click") cur.clicks += 1;
    cur.spend_cents += e.revenue_cents ?? 0;
    byCampaign.set(e.campaign_id, cur);
  }

  return json({
    data: {
      advertiser: { id: adv.id, company_name: adv.company_name, balance_cents: adv.credits_cents },
      period: { start: startIso, end: endIso },
      transactions: transactions ?? [],
      campaigns: [...byCampaign.entries()].map(([campaign_id, m]) => ({
        campaign_id,
        campaign_name: nameById.get(campaign_id) ?? "",
        ...m,
      })),
    },
    meta: { currency: "USD", version: VERSION },
  });
}

async function monetizationStatus(ctx: Ctx): Promise<Response> {
  const [{ data: profile }, { data: apps }] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, display_name, is_creator, is_monetized, subscriber_count, watch_hours")
      .eq("user_id", ctx.userId)
      .maybeSingle(),
    admin
      .from("monetization_applications")
      .select("id, status, note, review_note, created_at, reviewed_at")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (!profile) return err(404, "not_found", "profile not found");

  const application = apps?.[0] ?? null;
  return json({
    data: {
      ...profile,
      eligibility: {
        subscribers_required: 100,
        watch_hours_required: 1000,
        subscribers_met: profile.subscriber_count >= 100,
        watch_hours_met: profile.watch_hours >= 1000,
      },
      latest_application: application,
    },
    meta: { version: VERSION },
  });
}

async function reportsDaily(ctx: Ctx): Promise<Response> {
  const { url } = ctx;
  const type = url.searchParams.get("type");
  if (type && type !== "creator" && type !== "advertiser") {
    return err(400, "invalid_param", "type must be 'creator' or 'advertiser'");
  }
  const from = url.searchParams.get("from") ?? url.searchParams.get("date");
  const to = url.searchParams.get("to") ?? from;
  for (const d of [from, to]) {
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return err(400, "invalid_param", "from/to must be YYYY-MM-DD");
  }
  const fromDate = from ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const toDate = to ?? fromDate;

  let q = admin
    .from("daily_reports")
    .select("report_date, subject_type, subject_id, metrics")
    .gte("report_date", fromDate)
    .lte("report_date", toDate)
    .order("report_date", { ascending: false })
    .limit(400);

  const { data: advertisers } = await admin.from("advertisers").select("id").eq("user_id", ctx.userId);
  const advIds = (advertisers ?? []).map((a) => a.id);

  if (type === "creator") {
    q = q.eq("subject_type", "creator").eq("subject_id", ctx.userId);
  } else if (type === "advertiser") {
    if (advIds.length === 0) return json({ data: [], meta: { from: fromDate, to: toDate, format: "json", version: VERSION } });
    q = q.eq("subject_type", "advertiser").in("subject_id", advIds);
  } else {
    // both: creator rows owned by the key owner, advertiser rows owned via their advertiser accounts
    const conds = [`and(subject_type.eq.creator,subject_id.eq.${ctx.userId})`];
    if (advIds.length > 0) conds.push(`and(subject_type.eq.advertiser,subject_id.in.(${advIds.join(",")}))`);
    q = q.or(conds.join(","));
  }

  const { data, error } = await q;
  if (error) return err(500, "query_failed", error.message);

  if (url.searchParams.get("format") === "csv") {
    const rows = (data ?? []).map((r) => ({
      date: r.report_date,
      subject_type: r.subject_type,
      subject_id: r.subject_id,
      ...(r.metrics as Record<string, unknown>),
    }));
    return new Response(toCsv(rows), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="afritube-daily-report-${fromDate}_${toDate}.csv"`,
        "X-AfriTube-Api-Version": VERSION,
      },
    });
  }

  return json({ data, meta: { from: fromDate, to: toDate, format: "json", version: VERSION } });
}

// ---------- public (no auth) ----------

function apiIndex(): Response {
  return json({
    data: {
      name: "AfriTube Public API",
      version: VERSION,
      documentation: `${SUPABASE_URL}/functions/v1/api-v1/openapi.json`,
      auth: "Send your API key as `Authorization: Bearer <key>` or `x-api-key: <key>`",
      scopes: ["content", "analytics", "ads", "monetization", "all"],
      endpoints: [
        "GET /videos", "GET /videos/{id}",
        "GET /creators", "GET /creators/{id}", "GET /creators/{id}/videos",
        "GET /live-streams", "GET /playlists", "GET /search?q=",
        "GET /analytics/overview", "GET /analytics/videos", "GET /analytics/videos/{id}",
        "GET /earnings/creator",
        "GET /ads/campaigns", "GET /ads/campaigns/{id}", "GET /ads/statement?start=&end=",
        "GET /monetization/status",
        "GET /reports/daily?from=&to=&type=&format=json|csv",
      ],
    },
  });
}

function openApiSpec(): Response {
  const server = `${SUPABASE_URL}/functions/v1/api-v1`;
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "AfriTube Public API",
      version: "1.0.0",
      description:
        "Stable, versioned API for AfriTube integrations and reporting. Keys are issued per user with scopes; requests are limited to 120/minute per key. Breaking changes ship only under a new version prefix.",
    },
    servers: [{ url: server }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/videos": {
        get: {
          summary: "List public videos",
          description: "Requires scope: content (or all).",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 12 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Title search" },
            { name: "creator", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "is_short", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          ],
          responses: { "200": { description: "Videos with creator info and pagination meta" }, "401": { description: "Missing or invalid key" }, "403": { description: "Key lacks scope" } },
        },
      },
      "/videos/{id}": {
        get: { summary: "Get a public video", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Video" }, "404": { description: "Not found" } } },
      },
      "/creators": {
        get: {
          summary: "List creators",
          description: "Requires scope: content (or all).",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
            { name: "q", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Creators" } },
        },
      },
      "/creators/{id}": {
        get: { summary: "Get a creator profile", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Creator with counts" }, "404": { description: "Not found" } } },
      },
      "/creators/{id}/videos": {
        get: { summary: "List a creator's public videos", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Videos" } } },
      },
      "/live-streams": {
        get: {
          summary: "List public live streams",
          parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["live", "scheduled", "ended", "idle"] } }],
          responses: { "200": { description: "Live streams" } },
        },
      },
      "/playlists": {
        get: { summary: "List public playlists", parameters: [{ name: "user", in: "query", schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Playlists" } } },
      },
      "/search": {
        get: { summary: "Search videos, creators and playlists", parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Grouped results" }, "400": { description: "Missing q" } } },
      },
      "/analytics/overview": {
        get: { summary: "Key owner's channel overview", description: "Requires scope: analytics (or all).", responses: { "200": { description: "Subscribers, watch hours, videos, total views" } } },
      },
      "/analytics/videos": {
        get: { summary: "Per-video analytics for the key owner", parameters: [{ name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 365, default: 28 } }], responses: { "200": { description: "Per-video views and watch time" } } },
      },
      "/analytics/videos/{id}": {
        get: { summary: "Analytics for one of the key owner's videos", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Video analytics" }, "403": { description: "Not your video" } } },
      },
      "/earnings/creator": {
        get: { summary: "Key owner's ad and Super Chat earnings", responses: { "200": { description: "Earnings breakdown in USD cents" } } },
      },
      "/ads/campaigns": {
        get: { summary: "List the key owner's ad campaigns", description: "Requires scope: ads (or all).", responses: { "200": { description: "Campaigns with impressions, clicks, spend" } } },
      },
      "/ads/campaigns/{id}": {
        get: { summary: "Get one of the key owner's campaigns", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Campaign detail" }, "403": { description: "Not your campaign" } } },
      },
      "/ads/statement": {
        get: {
          summary: "Billing statement for the key owner's advertiser account",
          parameters: [
            { name: "start", in: "query", schema: { type: "string", format: "date" } },
            { name: "end", in: "query", schema: { type: "string", format: "date" } },
          ],
          responses: { "200": { description: "Transactions, per-campaign spend, balance" } },
        },
      },
      "/monetization/status": {
        get: { summary: "Key owner's monetization status and eligibility", responses: { "200": { description: "Monetization status" } } },
      },
      "/reports/daily": {
        get: {
          summary: "Daily reports (JSON or CSV)",
          description: "Nightly aggregated creator/advertiser metrics. Requires scope: analytics (or all).",
          parameters: [
            { name: "from", in: "query", schema: { type: "string", format: "date" } },
            { name: "to", in: "query", schema: { type: "string", format: "date" } },
            { name: "type", in: "query", schema: { type: "string", enum: ["creator", "advertiser"] } },
            { name: "format", in: "query", schema: { type: "string", enum: ["json", "csv"], default: "json" } },
          ],
          responses: { "200": { description: "Daily report rows" } },
        },
      },
      "/openapi.json": {
        get: { summary: "This specification (no key required)", security: [], responses: { "200": { description: "OpenAPI 3.0 document" } } },
      },
    },
  };
  return json(spec);
}

// ---------- router ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return err(405, "method_not_allowed", "Only GET is supported in API v1");

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean).slice(1); // drop 'api-v1'
  const group = segments[0] ?? "";
  const endpointPath = `/${segments.join("/")}`;

  try {
    // Unauthenticated endpoints
    if (group === "" || group === "openapi.json") {
      return group === "" ? apiIndex() : openApiSpec();
    }

    // --- API key auth ---
    const authHeader = req.headers.get("authorization") || "";
    const apiKeyHeader = req.headers.get("x-api-key") || "";
    const rawKey = apiKeyHeader || (authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "");
    if (!rawKey) return err(401, "missing_key", "Provide your API key via `Authorization: Bearer <key>` or `x-api-key`");

    const keyHash = await sha256Hex(rawKey);
    const { data: key } = await admin
      .from("api_keys")
      .select("id, user_id, scopes, status")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (!key || key.status !== "active") return err(401, "invalid_key", "API key is invalid or revoked");

    // --- rate limit (rolling 60s per key) ---
    const { count: recent } = await admin
      .from("api_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("api_key_id", key.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if ((recent ?? 0) >= RATE_LIMIT_PER_MINUTE) {
      return err(429, "rate_limited", `Rate limit of ${RATE_LIMIT_PER_MINUTE} requests/minute exceeded`, );
    }

    // --- scope check ---
    const needed = SCOPE_FOR_GROUP[group];
    if (!needed) return err(404, "not_found", `Unknown resource '${group}'. See GET / for the endpoint list.`);
    if (!scopeAllows(key.scopes as string[], needed)) {
      return err(403, "scope_required", `This key needs the '${needed}' scope for /${group}`);
    }

    const ctx: Ctx = { req, url, segments, keyId: key.id, userId: key.user_id };

    let response: Response;
    if (group === "videos") {
      response = segments.length === 1 ? await listVideos(ctx) : await getVideo(ctx);
    } else if (group === "creators") {
      if (segments.length === 1) response = await listCreators(ctx);
      else if (segments[2] === "videos") response = await creatorVideos(ctx);
      else response = await getCreator(ctx);
    } else if (group === "live-streams") {
      response = await listLiveStreams(ctx);
    } else if (group === "playlists") {
      response = await listPlaylists(ctx);
    } else if (group === "search") {
      response = await searchAll(ctx);
    } else if (group === "analytics") {
      if (segments[1] === "overview") response = await analyticsOverview(ctx);
      else if (segments[1] === "videos" && segments.length === 3) response = await analyticsVideoById(ctx);
      else if (segments[1] === "videos") response = await analyticsVideos(ctx);
      else response = err(404, "not_found", `Unknown analytics endpoint '/${segments.join("/")}'`);
    } else if (group === "earnings") {
      response = segments[1] === "creator" ? await earningsCreator(ctx) : err(404, "not_found", `Unknown earnings endpoint`);
    } else if (group === "ads") {
      if (segments[1] === "campaigns" && segments.length === 3) response = await adsCampaignById(ctx);
      else if (segments[1] === "campaigns") response = await adsCampaigns(ctx);
      else if (segments[1] === "statement") response = await adsStatement(ctx);
      else response = err(404, "not_found", `Unknown ads endpoint`);
    } else if (group === "monetization") {
      response = segments[1] === "status" ? await monetizationStatus(ctx) : err(404, "not_found", `Unknown monetization endpoint`);
    } else if (group === "reports") {
      response = segments[1] === "daily" ? await reportsDaily(ctx) : err(404, "not_found", `Unknown reports endpoint`);
    } else {
      response = err(404, "not_found", `Unknown resource '${group}'`);
    }

    // --- usage logging (fire and forget) ---
    admin
      .from("api_request_logs")
      .insert({ api_key_id: key.id, endpoint: endpointPath, status_code: response.status })
      .then(() => {}, () => {});
    admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", key.id)
      .then(() => {}, () => {});

    return response;
  } catch (e) {
    console.error("[api-v1] unhandled error", e);
    return err(500, "internal_error", "Unexpected server error");
  }
});
