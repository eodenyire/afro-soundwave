import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const HOST_KEY = "afritube_ingest_host";

const StreamSetup = () => {
  const { user } = useAuth();
  const [host, setHost] = useState(() => localStorage.getItem(HOST_KEY) ?? "");
  const [streams, setStreams] = useState<{ id: string; title: string; status: string }[]>([]);
  const [streamId, setStreamId] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [health, setHealth] = useState<"unknown" | "ok" | "down">("unknown");

  useEffect(() => {
    if (!user) return;
    (supabase.from("live_streams") as any)
      .select("id,title,status").eq("creator_id", user.id).neq("status", "ended")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setStreams(data ?? []));
  }, [user]);

  useEffect(() => {
    setStreamKey("");
    if (!streamId) return;
    (supabase.rpc as any)("get_stream_key", { p_stream_id: streamId }).then(({ data }: any) => setStreamKey(data ?? ""));
  }, [streamId]);

  const clean = host.trim().replace(/^\w+:\/\//, "").replace(/[:/].*$/, "");
  const rtmp = clean ? `rtmp://${clean}:1935/live` : "";
  const playback = clean && streamKey ? `http://${clean}:8080/hls/${streamKey}/index.m3u8` : "";

  const checkHealth = async () => {
    localStorage.setItem(HOST_KEY, host);
    try {
      const r = await fetch(`http://${clean}:8080/health`, { cache: "no-store" });
      setHealth(r.ok ? "ok" : "down");
    } catch {
      setHealth("down");
    }
  };

  const save = async () => {
    const { error } = await (supabase.from("live_streams") as any)
      .update({ ingest_url: rtmp, playback_url: playback }).eq("id", streamId);
    if (error) return toast.error(error.message);
    localStorage.setItem(HOST_KEY, host);
    toast.success("Saved. Start streaming from OBS and the stream goes live automatically.");
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  if (!user) return (<div className="min-h-screen bg-background"><Navbar /><p className="pt-32 text-center text-muted-foreground">Sign in to set up streaming.</p></div>);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-[800px] mx-auto px-4 pt-24 pb-20 space-y-6">
        <h1 className="font-display font-bold text-2xl text-foreground">Stream from your own server</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">1. Your streaming server</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Run the AfriTube ingest server (included in the project's <code>ingest</code> folder) on any server with ports 1935 and 8080 open, then enter its address.</p>
            <div className="flex gap-2">
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="stream.example.com or 203.0.113.10" />
              <Button variant="outline" onClick={checkHealth} disabled={!clean}>Check</Button>
            </div>
            {health !== "unknown" && (
              <p className={`text-sm ${health === "ok" ? "text-primary" : "text-destructive"}`}>
                {health === "ok" ? "Server is reachable." : "Can't reach the server. Check it's running and port 8080 is open. Browsers on https pages may block plain http servers — put the server behind https."}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">2. Pick a stream</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={streamId} onValueChange={setStreamId}>
              <SelectTrigger><SelectValue placeholder={streams.length ? "Choose a stream" : "No streams yet"} /></SelectTrigger>
              <SelectContent>{streams.map((s) => <SelectItem key={s.id} value={s.id}>{s.title} ({s.status})</SelectItem>)}</SelectContent>
            </Select>
            {!streams.length && <Button asChild size="sm" variant="outline"><Link to="/live">Schedule a stream</Link></Button>}
          </CardContent>
        </Card>
        {rtmp && streamKey && (
          <Card>
            <CardHeader><CardTitle className="text-base">3. Paste into OBS (Settings → Stream → Custom)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[["Server", rtmp], ["Stream key", streamKey], ["Viewer playback link", playback]].map(([l, v]) => (
                <div key={l} className="space-y-1">
                  <Label>{l}</Label>
                  <div className="flex gap-2"><Input readOnly value={v} type={l === "Stream key" ? "password" : "text"} /><Button variant="outline" onClick={() => copy(v)}>Copy</Button></div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={save}>Save to stream</Button>
                <Button asChild variant="outline"><Link to={`/live/${streamId}`}>Open viewer page</Link></Button>
              </div>
              <p className="text-xs text-muted-foreground">Press "Start Streaming" in OBS. The stream switches to live on its own and ends when you stop. Open the viewer page signed out (or in a private window) to see the ad play on a monetized channel.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default StreamSetup;
