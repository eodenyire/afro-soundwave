import { createClient } from "npm:@supabase/supabase-js@2";
import { createLovableAiGatewayRunIdFetch } from "../_shared/run-id.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const INSTRUCTIONS = `You help admins of AfriTube, an African video platform, review creator ad-monetization applications.
Eligibility: 100+ subscribers and 1,000+ watch hours. Creators earn 55% of ad revenue.
Reply in plain Markdown with exactly these sections:
## Summary (2-4 sentences)
## Eligibility (whether thresholds are met, with numbers)
## Review considerations (bullet list: risks, content concerns, inconsistencies, missing info)
## Suggested decision (Approve, Reject, or Needs more info, with one-line reason)
Be concise (under 250 words). Do not invent facts that are not in the input.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Sign in required." }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only." }, 403);

    const { details } = await req.json();
    if (!details || typeof details !== "string" || details.length > 20000)
      return json({ error: "Provide application details (up to 20,000 characters)." }, 400);

    const gateway = createLovableAiGatewayRunIdFetch(req.headers.get("X-Lovable-AIG-Run-ID") ?? undefined);
    const res = await gateway.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCTIONS,
        input: details,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      let message = "The AI review failed. Please try again later.";
      try { message = JSON.parse(text)?.error?.message ?? JSON.parse(text)?.message ?? message; } catch { /* keep */ }
      if (res.status === 402) message = "AI credits are used up. Add credits to keep using AI reviews.";
      if (res.status === 429) message = "Too many AI requests right now. Please wait a moment and try again.";
      return json({ error: message }, res.status);
    }

    // Parse SSE stream server-side and accumulate the final text.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", output = "", streamError: string | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta") output += evt.delta ?? "";
          else if (evt.type === "error" || evt.type === "response.failed")
            streamError = evt.error?.message ?? evt.response?.error?.message ?? "AI review failed.";
        } catch { /* partial */ }
      }
    }
    if (streamError) return json({ error: streamError }, 502);
    if (!output.trim()) return json({ error: "The AI returned no review. It may have declined this request." }, 502);

    const headers: Record<string, string> = {};
    const runId = gateway.getRunId();
    if (runId) headers["X-Lovable-AIG-Run-ID"] = runId;
    return new Response(JSON.stringify({ review: output }), {
      headers: { ...cors, ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499, headers: cors });
    console.error(e);
    return json({ error: "Unexpected error running AI review." }, 500);
  }
});
