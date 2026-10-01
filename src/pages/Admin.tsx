import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, BookOpen, Check, Eye, Heart, Loader2, Music, ShieldCheck, Trash2, Users, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import AdminCampaignReview from "@/components/AdminCampaignReview";
import AdminMonetizationApplications from "@/components/AdminMonetizationApplications";

interface CreatorProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  subscriber_count: number;
  watch_hours: number;
  is_monetized: boolean;
  created_at: string;
}

interface VideoRow {
  id: string;
  user_id: string;
  title: string;
  views: number;
  created_at: string;
}

interface AudioRow {
  id: string;
  user_id: string;
  title: string;
  streams: number;
  created_at: string;
}

interface BlogRow {
  id: string;
  user_id: string;
  title: string;
  likes: number;
  comments_count: number;
  created_at: string;
}

interface CreatorMetrics {
  userId: string;
  name: string;
  subscribers: number;
  watchHours: number;
  monetized: boolean;
  videos: number;
  audios: number;
  blogs: number;
  totalViews: number;
  totalStreams: number;
  totalLikes: number;
}

const formatNumber = (value: number) => value.toLocaleString();
const formatDate = (value: string) => new Date(value).toLocaleDateString();

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<CreatorMetrics[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [audios, setAudios] = useState<AudioRow[]>([]);
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const creatorNames = useMemo(
    () => new Map(creators.map((creator) => [creator.userId, creator.name])),
    [creators],
  );

  const summary = useMemo(() => {
    const totalViews = creators.reduce((sum, c) => sum + c.totalViews, 0);
    const totalStreams = creators.reduce((sum, c) => sum + c.totalStreams, 0);
    const totalLikes = creators.reduce((sum, c) => sum + c.totalLikes, 0);
    return {
      creators: creators.length,
      videos: creators.reduce((sum, c) => sum + c.videos, 0),
      audios: creators.reduce((sum, c) => sum + c.audios, 0),
      blogs: creators.reduce((sum, c) => sum + c.blogs, 0),
      totalViews,
      totalStreams,
      totalLikes,
    };
  }, [creators]);

  const MONETIZATION_MIN_SUBS = 100;
  const MONETIZATION_MIN_HOURS = 1000;

  const pendingReview = useMemo(
    () =>
      creators.filter(
        (c) =>
          !c.monetized &&
          c.subscribers >= MONETIZATION_MIN_SUBS &&
          c.watchHours >= MONETIZATION_MIN_HOURS,
      ),
    [creators],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [profilesRes, videosRes, audiosRes, blogsRes, likesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url, subscriber_count, watch_hours, is_monetized, created_at"),
      supabase.from("videos").select("id, user_id, title, views, created_at"),
      supabase.from("audio_tracks").select("id, user_id, title, streams, created_at"),
      supabase.from("blog_posts").select("id, user_id, title, likes, comments_count, created_at"),
      supabase.from("video_reactions").select("video_id").eq("reaction_type", "like"),
    ]);

    const profiles = (profilesRes.data ?? []) as CreatorProfile[];
    const videoRows = (videosRes.data ?? []) as VideoRow[];
    const audioRows = (audiosRes.data ?? []) as AudioRow[];
    const blogRows = (blogsRes.data ?? []) as BlogRow[];
    const likes = likesRes.data ?? [];

    const likesByVideoId = likes.reduce<Record<string, number>>((acc, like) => {
      const id = like.video_id as string;
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});

    const metricsByUser = new Map<string, Omit<CreatorMetrics, "userId" | "name" | "subscribers" | "watchHours" | "monetized">>();
    const ensureMetrics = (userId: string) => {
      if (!metricsByUser.has(userId)) {
        metricsByUser.set(userId, {
          videos: 0,
          audios: 0,
          blogs: 0,
          totalViews: 0,
          totalStreams: 0,
          totalLikes: 0,
        });
      }
      return metricsByUser.get(userId)!;
    };

    videoRows.forEach((video) => {
      const metrics = ensureMetrics(video.user_id);
      metrics.videos += 1;
      metrics.totalViews += video.views ?? 0;
      metrics.totalLikes += likesByVideoId[video.id] ?? 0;
    });

    audioRows.forEach((audio) => {
      const metrics = ensureMetrics(audio.user_id);
      metrics.audios += 1;
      metrics.totalStreams += audio.streams ?? 0;
    });

    blogRows.forEach((blog) => {
      const metrics = ensureMetrics(blog.user_id);
      metrics.blogs += 1;
      metrics.totalLikes += blog.likes ?? 0;
    });

    const creatorRows = profiles.map((profile) => {
      const metrics = metricsByUser.get(profile.user_id) ?? {
        videos: 0,
        audios: 0,
        blogs: 0,
        totalViews: 0,
        totalStreams: 0,
        totalLikes: 0,
      };
      return {
        userId: profile.user_id,
        name: profile.display_name ?? "Unknown Creator",
        subscribers: profile.subscriber_count ?? 0,
        watchHours: profile.watch_hours ?? 0,
        monetized: profile.is_monetized ?? false,
        ...metrics,
      };
    });

    setCreators(creatorRows.sort((a, b) => b.totalViews - a.totalViews));
    setVideos(videoRows);
    setAudios(audioRows);
    setBlogs(blogRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadData();
  }, [user, isAdmin, loadData]);

  const handleDelete = async (table: "videos" | "audio_tracks" | "blog_posts", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Content removed" });
    loadData();
  };

  const handleToggleMonetized = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_monetized: !current }).eq("user_id", userId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: current ? "Monetization revoked" : "Creator monetized" });
    loadData();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex flex-col items-center justify-center text-center px-4">
          <ShieldCheck size={40} className="text-muted-foreground mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">Admin access only</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            You do not have permission to view this panel. Please contact support if you need access.
          </p>
          <Button className="mt-6 rounded-full" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">Manage creators, content, and platform insights.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => navigate("/admin/monitoring")}>
              Monitoring
            </Button>
            <Button variant="outline" className="rounded-full" onClick={loadData}>Refresh</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users size={16} /> Creators
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatNumber(summary.creators)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Video size={16} /> Videos
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatNumber(summary.videos)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Music size={16} /> Audio Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatNumber(summary.audios)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen size={16} /> Blog Posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatNumber(summary.blogs)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Music size={16} /> Total Streams
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatNumber(summary.totalStreams)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye size={16} /> Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatNumber(summary.totalViews)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart size={16} /> Total Likes
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatNumber(summary.totalLikes)}</CardContent>
              </Card>
            </div>

            <AdminCampaignReview />

            <AdminMonetizationApplications />

            <Card className="mb-8 border-primary/40">
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BadgeCheck size={18} className="text-primary" /> Monetization Review
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Creators meeting the ads threshold ({MONETIZATION_MIN_SUBS}+ subscribers &amp; {formatNumber(MONETIZATION_MIN_HOURS)}+ watch hours).
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {pendingReview.length} pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {pendingReview.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No creators awaiting monetization review right now.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead>Subscribers</TableHead>
                        <TableHead>Watch Hours</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Uploads</TableHead>
                        <TableHead className="text-right">Decision</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingReview.map((creator) => (
                        <TableRow key={creator.userId}>
                          <TableCell className="font-medium">
                            <button
                              className="hover:underline text-left"
                              onClick={() => navigate(`/creator/${creator.userId}`)}
                            >
                              {creator.name}
                            </button>
                          </TableCell>
                          <TableCell>{formatNumber(creator.subscribers)}</TableCell>
                          <TableCell>{formatNumber(creator.watchHours)}</TableCell>
                          <TableCell>{formatNumber(creator.totalViews)}</TableCell>
                          <TableCell>{creator.videos + creator.audios + creator.blogs}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                className="rounded-full gap-1"
                                onClick={() => handleToggleMonetized(creator.userId, false)}
                              >
                                <Check size={14} /> Approve for ads
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full gap-1"
                                onClick={() =>
                                  toast({
                                    title: "Review deferred",
                                    description: `${creator.name} will remain unmonetized until re-reviewed.`,
                                  })
                                }
                              >
                                <X size={14} /> Defer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">All Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Subscribers</TableHead>
                      <TableHead>Watch Hours</TableHead>
                      <TableHead>Uploads</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Monetized</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creators.map((creator) => (
                      <TableRow key={creator.userId}>
                        <TableCell className="font-medium">{creator.name}</TableCell>
                        <TableCell>{formatNumber(creator.subscribers)}</TableCell>
                        <TableCell>{formatNumber(creator.watchHours)}</TableCell>
                        <TableCell>{creator.videos + creator.audios + creator.blogs}</TableCell>
                        <TableCell>{formatNumber(creator.totalViews)}</TableCell>
                        <TableCell>{formatNumber(creator.totalLikes)}</TableCell>
                        <TableCell>
                          <Button
                            variant={creator.monetized ? "default" : "outline"}
                            size="sm"
                            className="rounded-full"
                            onClick={() => handleToggleMonetized(creator.userId, creator.monetized)}
                          >
                            {creator.monetized ? "Monetized" : "Set Monetized"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Library</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="videos">
                  <TabsList className="grid grid-cols-3 bg-secondary">
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {videos.map((video) => {
                          const creatorName = creatorNames.get(video.user_id);
                          return (
                            <TableRow key={video.id}>
                              <TableCell className="max-w-[240px] truncate">{video.title}</TableCell>
                              <TableCell>{creatorName ?? "Unknown Creator"}</TableCell>
                              <TableCell>{formatNumber(video.views)}</TableCell>
                              <TableCell>{formatDate(video.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDelete("videos", video.id)}>
                                  <Trash2 size={16} className="text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="audio" className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Streams</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audios.map((audio) => {
                          const creatorName = creatorNames.get(audio.user_id);
                          return (
                            <TableRow key={audio.id}>
                              <TableCell className="max-w-[240px] truncate">{audio.title}</TableCell>
                              <TableCell>{creatorName ?? "Unknown Creator"}</TableCell>
                              <TableCell>{formatNumber(audio.streams)}</TableCell>
                              <TableCell>{formatDate(audio.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDelete("audio_tracks", audio.id)}>
                                  <Trash2 size={16} className="text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="blogs" className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Likes</TableHead>
                          <TableHead>Comments</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blogs.map((blog) => {
                          const creatorName = creatorNames.get(blog.user_id);
                          return (
                            <TableRow key={blog.id}>
                              <TableCell className="max-w-[240px] truncate">{blog.title}</TableCell>
                              <TableCell>{creatorName ?? "Unknown Creator"}</TableCell>
                              <TableCell>{formatNumber(blog.likes)}</TableCell>
                              <TableCell>{formatNumber(blog.comments_count)}</TableCell>
                              <TableCell>{formatDate(blog.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDelete("blog_posts", blog.id)}>
                                  <Trash2 size={16} className="text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
