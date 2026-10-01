import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, Music, BookOpen, Eye, Users, Clock,
  DollarSign, Edit2, Upload, BarChart3, Loader2, Trash2, ListVideo, Bell, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import EditProfileDialog from "@/components/EditProfileDialog";
import { formatCents, formatHours } from "@/lib/earnings";
import CreatorMonetizationPanel from "@/components/CreatorMonetizationPanel";

interface CreatorEarnings {
  impressions: number;
  clicks: number;
  ad_earnings_cents: number;
  super_chat_cents: number;
  total_cents: number;
}

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  views: number;
  category: string;
  created_at: string;
  description: string | null;
  visibility: "public" | "unlisted" | "private";
  publish_at: string | null;
  processing_status: "processing" | "ready" | "failed" | null;
}

interface AudioItem {
  id: string;
  title: string;
  artist_name: string | null;
  cover_url: string | null;
  streams: number;
  genre: string;
  created_at: string;
}

interface BlogItem {
  id: string;
  title: string;
  cover_url: string | null;
  likes: number;
  comments_count: number;
  category: string;
  created_at: string;
}

interface RecommendationStats {
  searchQueries: number;
  resultClicks: number;
  watchStarts: number;
  watchCompletions: number;
}

interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface PremiumSubscription {
  id: string;
  plan: "monthly" | "yearly";
  status: "active" | "canceled" | "expired";
  current_period_end: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const videoCategories = ["General", "Music", "Comedy", "Tech", "Food", "Travel", "Education", "Sports", "Fashion", "Documentary"];

const Dashboard = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [editVisibility, setEditVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [editPublishAt, setEditPublishAt] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [recommendationStats, setRecommendationStats] = useState<RecommendationStats>({
    searchQueries: 0,
    resultClicks: 0,
    watchStarts: 0,
    watchCompletions: 0,
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [premiumSubscription, setPremiumSubscription] = useState<PremiumSubscription | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumActionLoading, setPremiumActionLoading] = useState<"" | "monthly" | "yearly" | "cancel">("");
  const [recommendationCategorySignals, setRecommendationCategorySignals] = useState<Record<string, number>>({});
  const [lastAnalyticsUpdatedAt, setLastAnalyticsUpdatedAt] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchContent = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [vRes, aRes, bRes] = await Promise.all([
      supabase.from("videos").select("id, title, thumbnail_url, views, category, created_at, description, visibility, publish_at, processing_status").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("audio_tracks").select("id, title, artist_name, cover_url, streams, genre, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("blog_posts").select("id, title, cover_url, likes, comments_count, category, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setVideos((vRes.data ?? []) as any);
    setAudios((aRes.data ?? []) as any);
    setBlogs((bRes.data ?? []) as any);
    setLoading(false);
    setLastAnalyticsUpdatedAt(new Date().toISOString());
  }, [user]);

  const fetchRecommendationStats = useCallback(async () => {
    if (!user) return;
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await (supabase as any)
      .from("recommendation_events")
      .select("event_type, context, videos(category)")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgoIso)
      .limit(2000);

    const counts: RecommendationStats = {
      searchQueries: 0,
      resultClicks: 0,
      watchStarts: 0,
      watchCompletions: 0,
    };
    const categorySignals: Record<string, number> = {};

    (data ?? []).forEach((event: any) => {
      if (event.event_type === "search_query") counts.searchQueries += 1;
      if (event.event_type === "search_result_click") counts.resultClicks += 1;
      if (event.event_type === "watch_start") counts.watchStarts += 1;
      if (event.event_type === "watch_complete") counts.watchCompletions += 1;

      const category = event.videos?.category ?? event.context?.category ?? null;
      if (!category || typeof category !== "string") return;
      const weight = event.event_type === "watch_complete"
        ? 5
        : event.event_type === "watch_start"
          ? 3
          : event.event_type === "search_result_click"
            ? 2
            : 1;
      categorySignals[category] = (categorySignals[category] ?? 0) + weight;
    });

    setRecommendationStats(counts);
    setRecommendationCategorySignals(categorySignals);
    setLastAnalyticsUpdatedAt(new Date().toISOString());
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchContent();
  }, [user, fetchContent]);

  useEffect(() => {
    if (!user) return;
    fetchRecommendationStats();
  }, [user, fetchRecommendationStats]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).rpc("get_creator_earnings");
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setEarnings({
          impressions: Number(row.impressions ?? 0),
          clicks: Number(row.clicks ?? 0),
          ad_earnings_cents: Number(row.ad_earnings_cents ?? 0),
          super_chat_cents: Number(row.super_chat_cents ?? 0),
          total_cents: Number(row.total_cents ?? 0),
        });
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const refreshAll = async () => {
      await Promise.all([fetchContent(), fetchRecommendationStats(), refreshProfile()]);
    };

    const channel = supabase
      .channel(`dashboard-analytics-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "videos", filter: `user_id=eq.${user.id}` }, () => {
        void refreshAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "audio_tracks", filter: `user_id=eq.${user.id}` }, () => {
        void refreshAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts", filter: `user_id=eq.${user.id}` }, () => {
        void refreshAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "recommendation_events", filter: `user_id=eq.${user.id}` }, () => {
        void fetchRecommendationStats();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => {
        void refreshProfile();
      })
      .subscribe();

    const pollId = window.setInterval(() => {
      void refreshAll();
    }, 60000);

    return () => {
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [user, fetchContent, fetchRecommendationStats, refreshProfile]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      setNotificationsLoading(true);
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id, notification_type, title, body, entity_type, entity_id, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      setNotifications((data ?? []) as NotificationItem[]);
      setNotificationsLoading(false);
    };
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchPremium = async () => {
      setPremiumLoading(true);
      const { data } = await (supabase as any).rpc("get_my_premium_subscription");
      const row = (data ?? [])[0];
      setPremiumSubscription(row ?? null);
      setPremiumLoading(false);
    };
    fetchPremium();
  }, [user]);

  const handleDelete = async (table: "videos" | "audio_tracks" | "blog_posts", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    if (table === "videos") setVideos(prev => prev.filter(v => v.id !== id));
    else if (table === "audio_tracks") setAudios(prev => prev.filter(a => a.id !== id));
    else setBlogs(prev => prev.filter(b => b.id !== id));
    toast({ title: "Deleted successfully" });
  };

  const toLocalDatetimeInput = (iso: string | null) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const openEditVideo = (video: VideoItem) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description ?? "");
    setEditCategory(video.category || "General");
    setEditVisibility(video.visibility);
    setEditPublishAt(toLocalDatetimeInput(video.publish_at));
  };

  const closeEditDialog = () => {
    if (savingEdit) return;
    setEditingVideo(null);
  };

  const handleSaveVideoEdit = async () => {
    if (!user || !editingVideo) return;
    if (!editTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (editPublishAt && Number.isNaN(new Date(editPublishAt).getTime())) {
      toast({ title: "Invalid schedule time", description: "Please choose a valid date/time.", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    const payload = {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      category: editCategory || "General",
      visibility: editVisibility,
      publish_at: editPublishAt ? new Date(editPublishAt).toISOString() : null,
    };
    const { error } = await supabase
      .from("videos")
      .update(payload)
      .eq("id", editingVideo.id)
      .eq("user_id", user.id);
    setSavingEdit(false);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    setVideos((prev) =>
      prev.map((video) => (video.id === editingVideo.id ? { ...video, ...payload } : video)),
    );
    toast({ title: "Video updated" });
    setEditingVideo(null);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const subscriberProgress = Math.min((profile?.subscriber_count ?? 0) / 100 * 100, 100);
  const watchHoursProgress = Math.min((profile?.watch_hours ?? 0) / 1000 * 100, 100);
  const isEligible = profile?.is_monetized || (subscriberProgress >= 100 && watchHoursProgress >= 100);
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalStreams = audios.reduce((s, a) => s + a.streams, 0);
  const clickRate = recommendationStats.searchQueries > 0
    ? Math.round((recommendationStats.resultClicks / recommendationStats.searchQueries) * 100)
    : 0;
  const completionRate = recommendationStats.watchStarts > 0
    ? Math.round((recommendationStats.watchCompletions / recommendationStats.watchStarts) * 100)
    : 0;
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  const activatePremiumPlan = async (plan: "monthly" | "yearly") => {
    setPremiumActionLoading(plan);
    const { data, error } = await (supabase as any).rpc("activate_premium_subscription", { p_plan: plan });
    if (error) {
      toast({ title: "Could not activate premium", description: error.message, variant: "destructive" });
      setPremiumActionLoading("");
      return;
    }
    setPremiumSubscription((data ?? [])[0] ?? null);
    toast({ title: `Premium ${plan} plan activated` });
    setPremiumActionLoading("");
  };

  const cancelPremiumPlan = async () => {
    setPremiumActionLoading("cancel");
    const { data, error } = await (supabase as any).rpc("cancel_premium_subscription");
    if (error) {
      toast({ title: "Could not cancel premium", description: error.message, variant: "destructive" });
      setPremiumActionLoading("");
      return;
    }
    setPremiumSubscription((data ?? [])[0] ?? null);
    toast({ title: "Premium subscription canceled" });
    setPremiumActionLoading("");
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (unread.length === 0) return;
    const nowIso = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true, read_at: nowIso })
      .in("id", unread)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Could not mark notifications as read", description: error.message, variant: "destructive" });
      return;
    }

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    toast({ title: "All notifications marked as read" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-5xl mx-auto px-4">
        <motion.div {...fadeUp}>
          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xl font-bold font-display">
                  {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground truncate">
                {profile?.display_name || "Creator"}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {profile?.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <EditProfileDialog onUpdated={refreshProfile} />
              <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => navigate("/playlists")}>
                <ListVideo size={14} /> Playlists
              </Button>
              <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => navigate("/upload")}>
                <Upload size={14} /> Upload
              </Button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard icon={<Users size={18} />} label="Subscribers" value={profile?.subscriber_count ?? 0} />
            <StatCard icon={<Clock size={18} />} label="Watch Hours" value={formatHours(profile?.watch_hours)} />
            <StatCard icon={<Eye size={18} />} label="Total Views" value={totalViews} />
            <StatCard icon={<BarChart3 size={18} />} label="Total Streams" value={totalStreams} />
          </div>

          <Card className="mb-8 bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground">Recommendation Activity (30d)</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MiniStat label="Searches" value={recommendationStats.searchQueries} />
                <MiniStat label="Result Clicks" value={recommendationStats.resultClicks} />
                <MiniStat label="Watch Starts" value={recommendationStats.watchStarts} />
                <MiniStat label="Completions" value={recommendationStats.watchCompletions} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Search → Click rate</p>
                  <p className="font-display text-xl font-bold text-foreground">{clickRate}%</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Start → Completion rate</p>
                  <p className="font-display text-xl font-bold text-foreground">{completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground">Premium Subscription</h2>
                {premiumSubscription?.status === "active" && (
                  <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary">
                    Active
                  </span>
                )}
              </div>
              {premiumLoading ? (
                <p className="text-sm text-muted-foreground">Loading premium status...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {premiumSubscription?.status === "active"
                      ? `You are on the ${premiumSubscription.plan} plan until ${new Date(premiumSubscription.current_period_end).toLocaleDateString()}.`
                      : "Unlock premium benefits: ad-light viewing, early access features, and priority support."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-gold text-primary-foreground hover:opacity-90"
                      disabled={premiumActionLoading !== ""}
                      onClick={() => activatePremiumPlan("monthly")}
                    >
                      Monthly plan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={premiumActionLoading !== ""}
                      onClick={() => activatePremiumPlan("yearly")}
                    >
                      Yearly plan
                    </Button>
                    {premiumSubscription?.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={premiumActionLoading !== ""}
                        onClick={cancelPremiumPlan}
                      >
                        Cancel premium
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8 bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={18} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground">Notifications</h2>
                {unreadNotifications > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary">
                    {unreadNotifications} unread
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto rounded-full"
                  disabled={unreadNotifications === 0}
                  onClick={markAllNotificationsRead}
                >
                  Mark all read
                </Button>
              </div>
              {notificationsLoading ? (
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((item) => (
                    <div key={item.id} className={`rounded-lg border p-3 ${item.is_read ? "border-border" : "border-primary/30 bg-primary/5"}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          {item.body ? <p className="text-xs text-muted-foreground mt-0.5">{item.body}</p> : null}
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">{formatRelativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monetization card */}
          <Card className="mb-8 bg-card border-border overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground">Monetization Progress</h2>
                {isEligible && (
                  <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary">
                    Eligible ✓
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Subscribers</span>
                    <span className="font-medium text-foreground">{profile?.subscriber_count ?? 0} / 100</span>
                  </div>
                  <Progress value={subscriberProgress} className="h-2.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Watch Hours</span>
                    <span className="font-medium text-foreground">{formatHours(profile?.watch_hours)} / 1,000</span>
                  </div>
                  <Progress value={watchHoursProgress} className="h-2.5" />
                </div>
              </div>

              {earnings && (
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-secondary/60 p-3">
                    <p className="text-xs text-muted-foreground">Ad impressions</p>
                    <p className="text-lg font-semibold text-foreground">{earnings.impressions.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-3">
                    <p className="text-xs text-muted-foreground">Ad earnings (55%)</p>
                    <p className="text-lg font-semibold text-foreground">{formatCents(earnings.ad_earnings_cents)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-3">
                    <p className="text-xs text-muted-foreground">Super chats (70%)</p>
                    <p className="text-lg font-semibold text-foreground">{formatCents(earnings.super_chat_cents)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs text-muted-foreground">Total earnings</p>
                    <p className="text-lg font-semibold text-primary">{formatCents(earnings.total_cents)}</p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {!isEligible ? (
                  <p className="text-xs text-muted-foreground">
                    Reach 100 subscribers and 1,000 watch hours to start earning from ads on your content.
                  </p>
                ) : profile?.is_monetized ? (
                  <>
                    <p className="text-xs text-muted-foreground flex-1">
                      Ads are running on your content. You can pause monetization at any time.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={async () => {
                        const { error } = await supabase.rpc("disable_creator_ads");
                        if (error) toast({ title: "Could not pause ads", description: error.message, variant: "destructive" });
                        else { toast({ title: "Ads paused" }); refreshProfile(); }
                      }}
                    >
                      Pause ads
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground flex-1">
                      You're eligible! Turn on ads to start earning from your content.
                    </p>
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-gold text-primary-foreground hover:opacity-90"
                      onClick={async () => {
                        const { error } = await supabase.rpc("enable_creator_ads");
                        if (error) toast({ title: "Could not enable ads", description: error.message, variant: "destructive" });
                        else { toast({ title: "Ads enabled — start earning!" }); refreshProfile(); }
                      }}
                    >
                      <DollarSign size={14} className="mr-1" /> Enable ads
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <CreatorMonetizationPanel onApplied={refreshProfile} />

          {/* Content tabs */}
          <Tabs defaultValue="videos" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-secondary">
              <TabsTrigger value="videos" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <Video size={14} /> Videos ({videos.length})
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <Music size={14} /> Audio ({audios.length})
              </TabsTrigger>
              <TabsTrigger value="blogs" className="data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground gap-1.5">
                <BookOpen size={14} /> Blogs ({blogs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="mt-4">
              {loading ? <LoadingState /> : videos.length === 0 ? (
                <EmptyState icon={<Video size={36} />} text="No videos yet" cta="Upload Video" onClick={() => navigate("/upload")} />
              ) : (
                <div className="space-y-3">
                  {videos.map(v => (
                    <ContentRow key={v.id}
                      image={v.thumbnail_url}
                      title={v.title}
                      meta={`${v.views.toLocaleString()} views · ${v.category}`}
                      date={v.created_at}
                      status={getVideoStatus(v)}
                      onEdit={() => openEditVideo(v)}
                      onDelete={() => handleDelete("videos", v.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="mt-4">
              {loading ? <LoadingState /> : audios.length === 0 ? (
                <EmptyState icon={<Music size={36} />} text="No tracks yet" cta="Upload Track" onClick={() => navigate("/upload")} />
              ) : (
                <div className="space-y-3">
                  {audios.map(a => (
                    <ContentRow key={a.id}
                      image={a.cover_url}
                      title={a.title}
                      meta={`${a.streams.toLocaleString()} streams · ${a.genre}${a.artist_name ? ` · ${a.artist_name}` : ""}`}
                      date={a.created_at}
                      onDelete={() => handleDelete("audio_tracks", a.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="blogs" className="mt-4">
              {loading ? <LoadingState /> : blogs.length === 0 ? (
                <EmptyState icon={<BookOpen size={36} />} text="No blog posts yet" cta="Write a Post" onClick={() => navigate("/upload")} />
              ) : (
                <div className="space-y-3">
                  {blogs.map(b => (
                    <ContentRow key={b.id}
                      image={b.cover_url}
                      title={b.title}
                      meta={`${b.likes} likes · ${b.comments_count} comments · ${b.category}`}
                      date={b.created_at}
                      onDelete={() => handleDelete("blog_posts", b.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <Dialog open={!!editingVideo} onOpenChange={(nextOpen) => { if (!nextOpen) closeEditDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit video</DialogTitle>
            <DialogDescription>Update metadata and publishing settings for this video.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-video-title">Title</Label>
              <Input id="edit-video-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="edit-video-description">Description</Label>
              <Textarea id="edit-video-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1.5" rows={4} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {videoCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={editVisibility} onValueChange={(value: "public" | "unlisted" | "private") => setEditVisibility(value)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-video-publish-at">Schedule publish (optional)</Label>
              <Input
                id="edit-video-publish-at"
                type="datetime-local"
                value={editPublishAt}
                onChange={(e) => setEditPublishAt(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={savingEdit}>Cancel</Button>
            <Button onClick={handleSaveVideoEdit} disabled={savingEdit} className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              {savingEdit ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Saving...</> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function formatRelativeTime(iso: string) {
  const thenMs = new Date(iso).getTime();
  if (Number.isNaN(thenMs)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - thenMs) / 1000));
  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
        <p className="font-display text-xl font-bold text-foreground">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

function ContentRow({ image, title, meta, date, status, onEdit, onDelete }: {
  image: string | null;
  title: string;
  meta: string;
  date: string;
  status?: "draft" | "scheduled" | "processing" | "failed" | "live";
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const statusClass: Record<NonNullable<typeof status>, string> = {
    live: "bg-emerald-500/15 text-emerald-500",
    draft: "bg-slate-500/15 text-slate-500",
    scheduled: "bg-amber-500/15 text-amber-500",
    processing: "bg-sky-500/15 text-sky-500",
    failed: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
      <div className="w-16 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
        {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Video size={16} /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {status && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusClass[status]}`}>
              {status}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">{new Date(date).toLocaleDateString()}</span>
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
            <Edit2 size={14} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

function getVideoStatus(video: VideoItem): "draft" | "scheduled" | "processing" | "failed" | "live" {
  if (video.processing_status === "failed") return "failed";
  if (video.processing_status === "processing") return "processing";
  if (video.visibility === "private") return "draft";
  if (video.publish_at && new Date(video.publish_at).getTime() > Date.now()) return "scheduled";
  return "live";
}

function EmptyState({ icon, text, cta, onClick }: { icon: React.ReactNode; text: string; cta: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="text-muted-foreground mb-3">{icon}</div>
      <p className="text-muted-foreground mb-4">{text}</p>
      <Button onClick={onClick} className="bg-gradient-gold text-primary-foreground rounded-full px-6 hover:opacity-90">
        <Upload size={16} className="mr-1.5" /> {cta}
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );
}

export default Dashboard;
