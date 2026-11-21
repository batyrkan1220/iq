// IQly admin ↔ ElevenLabs bridge. Only users listed in public.admins may call it.
// Actions: status | save_key | voices | models | tts
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EL = "https://api.elevenlabs.io/v1";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const email = u?.user?.email;
    if (!email) return json({ error: "unauthorized" }, 401);
    const { data: isAdm } = await admin.from("admins").select("email").eq("email", email).maybeSingle();
    if (!isAdm) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "save_key") {
      const k = String(body.key || "").trim();
      if (k.length < 20) return json({ error: "Кілт тым қысқа" }, 400);
      const t = await fetch(`${EL}/user/subscription`, { headers: { "xi-api-key": k } });
      if (!t.ok) return json({ error: "ElevenLabs кілтті қабылдамады (" + t.status + ")" }, 400);
      await admin.from("app_secrets").upsert({ name: "elevenlabs", value: k, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }

    const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "elevenlabs").maybeSingle();
    const key = sec?.value;
    if (action === "status") {
      if (!key) return json({ connected: false });
      const r = await fetch(`${EL}/user/subscription`, { headers: { "xi-api-key": key } });
      if (!r.ok) return json({ connected: false, error: "Кілт жарамсыз (" + r.status + ")" });
      const s = await r.json();
      return json({ connected: true, tier: s.tier, used: s.character_count, limit: s.character_limit, reset: s.next_character_count_reset_unix });
    }
    if (!key) return json({ error: "ElevenLabs кілті енгізілмеген" }, 400);
    const H = { "xi-api-key": key };

    if (action === "voices") {
      const r = await fetch(`${EL}/voices`, { headers: H });
      if (!r.ok) return json({ error: "voices " + r.status }, 502);
      const v = await r.json();
      return json({
        voices: (v.voices || []).map((x: any) => ({
          id: x.voice_id, name: x.name, category: x.category, labels: x.labels, preview: x.preview_url,
        })),
      });
    }
    if (action === "models") {
      const r = await fetch(`${EL}/models`, { headers: H });
      if (!r.ok) return json({ error: "models " + r.status }, 502);
      const m = await r.json();
      return json({ models: (m || []).filter((x: any) => x.can_do_text_to_speech).map((x: any) => ({ id: x.model_id, name: x.name, langs: (x.languages || []).map((l: any) => l.language_id) })) });
    }
    if (action === "tts") {
      const text = String(body.text || "").trim();
      if (!text || text.length > 5000) return json({ error: "Мәтін бос немесе 5000 таңбадан ұзын" }, 400);
      const vs = body.settings || {};
      const payload: Record<string, unknown> = {
        text,
        model_id: body.model_id || "eleven_multilingual_v2",
        voice_settings: {
          stability: vs.stability ?? 0.5,
          similarity_boost: vs.similarity ?? 0.75,
          style: vs.style ?? 0,
          speed: vs.speed ?? 1,
          use_speaker_boost: true,
        },
      };
      const r = await fetch(`${EL}/text-to-speech/${encodeURIComponent(body.voice_id)}?output_format=mp3_44100_128`, {
        method: "POST", headers: { ...H, "Content-Type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify(payload),
      });
      if (!r.ok) return json({ error: "ElevenLabs: " + r.status + " " + (await r.text()).slice(0, 300) }, 502);
      const buf = new Uint8Array(await r.arrayBuffer());
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.mp3`;
      const up = await admin.storage.from("tts").upload(path, buf, { contentType: "audio/mpeg" });
      if (up.error) return json({ error: "storage: " + up.error.message }, 500);
      const { data: job } = await admin.from("tts_jobs").insert({
        text, voice_id: body.voice_id, voice_name: body.voice_name || null, model_id: payload.model_id, chars: text.length, path, settings: vs,
      }).select().single();
      const { data: s } = await admin.storage.from("tts").createSignedUrl(path, 3600);
      return json({ ok: true, job, url: s?.signedUrl });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
