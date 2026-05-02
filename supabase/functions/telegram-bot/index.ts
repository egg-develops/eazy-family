import Anthropic from "npm:@anthropic-ai/sdk@0.27.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const TELEGRAM_API = "https://api.telegram.org/bot";

const SYSTEM_PROMPT = `You are the Eazy.Family AI COO assistant — a direct, autonomous operator for the Eazy.Family project.

Project context:
- Eazy.Family is a multilingual AI-powered family organizer (React SPA + Supabase backend + Capacitor for iOS/Android)
- Tech stack: React, TypeScript, Supabase, Capacitor, Astro (marketing site), Resend (email), Anthropic Claude
- Launch strategy: Switzerland/Zurich first, then US. Competing against Cozi and FamilyWall.
- Marketing site: /Users/hq/eazy-family-web (Astro, deploys to eazy.family)
- App: /Users/hq/eazy-family (React SPA, deploys to app.eazy.family)
- Admin: /admin route in the app, analytics at Supabase
- X: @eazy_family | Email: hello@eazy.family, support@eazy.family

When the user asks for status, drafts, or operational questions, respond concisely and directly.
If they ask about tasks requiring code changes, tell them you'll handle it in the next Claude Code session.
Keep responses under 300 words. Use plain text (Telegram doesn't render markdown well).`;

async function sendMessage(token: string, chatId: number | string, text: string) {
  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function isApproved(supabase: ReturnType<typeof createClient>, chatId: number): Promise<boolean> {
  const { data } = await supabase
    .from("telegram_approved_chats")
    .select("chat_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return !!data;
}

async function approveChat(supabase: ReturnType<typeof createClient>, chatId: number): Promise<void> {
  await supabase
    .from("telegram_approved_chats")
    .upsert({ chat_id: chatId });
}

Deno.serve(async (req) => {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const pairingCode = Deno.env.get("TELEGRAM_PAIRING_CODE");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!token || !anthropicKey || !supabaseUrl || !supabaseKey) {
    return new Response("Missing env vars", { status: 500 });
  }

  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  let update: { message?: TelegramMessage; edited_message?: TelegramMessage };
  try {
    update = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const message = update?.message || update?.edited_message;
  if (!message?.text) return new Response("OK", { status: 200 });

  const chatId = message.chat.id;
  const userText = message.text.trim();

  const supabase = createClient(supabaseUrl, supabaseKey);

  const approved = await isApproved(supabase, chatId);

  if (!approved) {
    if (pairingCode && userText === pairingCode) {
      await approveChat(supabase, chatId);
      await sendMessage(token, chatId, "Paired successfully! You now have access to the Eazy.Family assistant.");
    } else {
      await sendMessage(token, chatId, "Send the pairing code to use this bot.");
    }
    return new Response("OK", { status: 200 });
  }

  const responsePromise = (async () => {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userText }],
      });

      const reply = response.content[0].type === "text"
        ? response.content[0].text
        : "Sorry, I couldn't generate a response.";

      await sendMessage(token, chatId, reply);
    } catch (err) {
      await sendMessage(token, chatId, `Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  })();

  responsePromise.catch(console.error);
  return new Response("OK", { status: 200 });
});

interface TelegramMessage {
  text?: string;
  chat: { id: number };
}
