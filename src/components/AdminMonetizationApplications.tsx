import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminAiApplicationReview, { buildApplicationDetails } from "@/components/AdminAiApplicationReview";

interface Application {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string;
  subscriber_count: number;
  watch_hours: number;
  subscriber_count_at_apply: number;
  watch_hours_at_apply: number;
  note: string | null;
  review_note: string | null;
  is_monetized: boolean;
  created_at: string;
  reviewed_at: string | null;
}

const hours = (v: number) => Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

/** Admin review queue for creators applying to earn ad revenue. */
const AdminMonetizationApplications = () => {
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [aiDetails, setAiDetails] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("list_monetization_applications", { _status: status });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Application[]);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await (supabase as any).rpc("review_monetization_application", {
      _application_id: id,
      _approve: approve,
      _note: notes[id] ?? null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Application approved" : "Application rejected");
    load();
  };

  return (
    <>
    <Card className="mb-8 border-primary/40">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BadgeCheck size={18} className="text-primary" /> Monetization Applications
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Creators who applied to earn ad revenue. Approving unlocks their ads switch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="icon" variant="outline" className="rounded-full" onClick={load} aria-label="Refresh">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 flex justify-center text-muted-foreground">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No {status} applications right now.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3 flex-wrap">
                  {row.avatar_url ? (
                    <img src={row.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary" />
                  )}
                  <div className="min-w-[180px]">
                    <p className="font-semibold text-foreground">{row.display_name ?? "Creator"}</p>
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(row.created_at).toLocaleDateString()} · {row.subscriber_count_at_apply} subs ·{" "}
                      {hours(row.watch_hours_at_apply)} hours at the time
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      Now: {row.subscriber_count} subs · {hours(row.watch_hours)} h
                    </Badge>
                    {row.is_monetized && <Badge className="rounded-full">Ads on</Badge>}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full gap-1"
                      onClick={() => {
                        setAiDetails(buildApplicationDetails(row));
                        document.getElementById("ai-application-review")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <Sparkles size={14} /> AI review
                    </Button>
                  </div>
                </div>

                {row.note && <p className="text-sm text-muted-foreground italic">“{row.note}”</p>}
                {row.review_note && <p className="text-sm text-muted-foreground">Review note: {row.review_note}</p>}

                {row.status === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Note to the creator (optional)"
                      value={notes[row.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-full gap-1"
                        disabled={busy === row.id}
                        onClick={() => review(row.id, true)}
                      >
                        <Check size={14} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full gap-1"
                        disabled={busy === row.id}
                        onClick={() => review(row.id, false)}
                      >
                        <X size={14} /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    <div id="ai-application-review">
      <AdminAiApplicationReview details={aiDetails} onDetailsChange={setAiDetails} />
    </div>
    </>
  );
};

export default AdminMonetizationApplications;
