import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, CalendarClock, Circle, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface LiveStream {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "canceled";
  scheduled_for: string | null;
  last_publish_at: string | null;
  hls_ready: boolean | null;
  playback_url: string | null;
}

const formatRelative = (iso: string | null) => {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleString();
};

const TEST_FEED_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

const Live = () => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from("live_streams") as any)
      .select("id, creator_id, title, description, status, scheduled_for, last_publish_at, hls_ready, playback_url")
      .in("status", ["scheduled", "live"])
      .eq("visibility", "public")
      .order("scheduled_for", { ascending: true })
      .limit(20);
    setStreams((data ?? []) as LiveStream[]);
  };


  useEffect(() => {
    load();
  }, []);

  const handleSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to schedule a stream");
      return;
    }
    if (!title.trim() || !scheduledFor) {
      toast.error("Title and time are required");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("live_streams") as any).insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      scheduled_for: new Date(scheduledFor).toISOString(),
      status: "scheduled",
      visibility: "public",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Stream scheduled");
    setTitle("");
    setDescription("");
    setScheduledFor("");
    setOpen(false);
    load();
  };

  const goLive = async (id: string) => {
    const { error } = await (supabase.from("live_streams") as any)
      .update({ status: "live", started_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("You're live");
    load();
  };

  const setTestFeed = async (id: string, on: boolean) => {
    const { error } = await (supabase.from("live_streams") as any)
      .update(on
        ? { status: "live", playback_url: TEST_FEED_URL, hls_ready: true, started_at: new Date().toISOString() }
        : { status: "scheduled", playback_url: null, hls_ready: false })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(on ? "Test feed started — open the stream to watch" : "Test feed stopped");
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[1100px] mx-auto px-4 md:px-6 pt-24 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Radio size={24} className="text-primary" />
            <h1 className="font-display font-bold text-2xl text-foreground">Live</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus size={16} /> Schedule stream
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule a live stream</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSchedule} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My live show" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scheduled for</label>
                  <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} required />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Schedule"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {streams.map((stream) => {
            const isOwner = user?.id === stream.creator_id;
            return (
              <Card key={stream.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <Link to={`/live/${stream.id}`} className="line-clamp-1 hover:underline">
                      {stream.title}
                    </Link>
                    {stream.status === "live" ? (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <Circle size={10} className="fill-current" /> LIVE
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock size={12} />
                        {stream.scheduled_for ? new Date(stream.scheduled_for).toLocaleString() : "Scheduled"}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{stream.description ?? "No description yet."}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                        stream.hls_ready ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                      }`}
                      title="Whether the ingest server has an active RTMP publisher and HLS output"
                    >
                      <Circle size={8} className={stream.hls_ready ? "fill-current" : ""} />
                      {stream.hls_ready ? "HLS ready" : "HLS idle"}
                    </span>
                    <span className="text-muted-foreground">
                      Last publish: {formatRelative(stream.last_publish_at)}
                    </span>
                    {stream.playback_url && (
                      <span className="text-muted-foreground truncate max-w-[220px]" title={stream.playback_url}>
                        · playback set
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/live/${stream.id}`}>Open</Link>
                    </Button>
                    {isOwner && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/live/studio/${stream.id}`}>Studio</Link>
                      </Button>
                    )}
                    {isOwner && stream.status === "scheduled" && (
                      <Button size="sm" onClick={() => goLive(stream.id)}>Go live</Button>
                    )}
                    {isOwner && (stream.playback_url === TEST_FEED_URL ? (
                      <Button size="sm" variant="secondary" onClick={() => setTestFeed(stream.id, false)}>Stop test feed</Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setTestFeed(stream.id, true)}>Start test feed</Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>


        {streams.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No active or scheduled streams yet.
          </div>
        )}
      </main>
    </div>
  );
};

export default Live;
