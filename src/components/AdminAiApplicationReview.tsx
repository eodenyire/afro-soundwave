import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export interface AiReviewPrefill {
  display_name: string | null;
  subscriber_count: number;
  watch_hours: number;
  note: string | null;
  created_at: string;
}

export const buildApplicationDetails = (a: AiReviewPrefill) =>
  [
    `Creator: ${a.display_name ?? "Unknown"}`,
    `Subscribers: ${a.subscriber_count}`,
    `Watch hours: ${Number(a.watch_hours ?? 0).toFixed(1)}`,
    `Applied: ${new Date(a.created_at).toLocaleDateString()}`,
    `Creator's note: ${a.note ?? "(none)"}`,
    `Channel details: `,
  ].join("\n");

/** Admin tool: paste application + channel details, get an AI summary and review flags. */
const AdminAiApplicationReview = ({ details, onDetailsChange }: { details: string; onDetailsChange: (v: string) => void }) => {
  const [review, setReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    setReview(null);
    const { data, error } = await supabase.functions.invoke("review-monetization-ai", { body: { details } });
    setLoading(false);
    if (error) {
      let msg = error.message;
      try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ }
      return setError(msg);
    }
    if (data?.error) return setError(data.error);
    setReview(data?.review ?? "");
  };

  return (
    <Card className="mb-8 border-primary/40">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles size={18} className="text-primary" /> AI application review
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Paste a creator's application and channel details (or pick "AI review" on an application above). AI summarizes it and flags things to check. It doesn't decide for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={8}
          value={details}
          onChange={(e) => onDetailsChange(e.target.value)}
          placeholder="Creator name, subscribers, watch hours, channel topic, content samples, the creator's note..."
        />
        <Button className="rounded-full gap-1" onClick={run} disabled={loading || !details.trim()}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Summarize & flag
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {review && (
          <div className="rounded-xl bg-secondary/60 p-4 text-sm text-foreground whitespace-pre-wrap">{review}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAiApplicationReview;
