import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPPING_V2_SYSTEM = `You are a shopping list parser. Extract individual shopping items from voice transcription.

IMPORTANT: Respond ONLY with valid JSON, no other text.

Categories available: Produce, Dairy, Meat, Bakery, Snacks, Pharmacy, Household, Baby, Drinks, Other

For each item:
- name: singular, lowercase item name
- category: inferred from the item
- quantity: quantity string if mentioned (e.g. "2 bags", "1 gallon"), otherwise null

If no shopping items found, set unparseable to the raw text.

Response format:
{
  "items": [
    { "name": "milk", "category": "Dairy", "quantity": null },
    { "name": "pasta", "category": "Bakery", "quantity": "2 bags" }
  ],
  "unparseable": null
}`;

const TASK_SYSTEM = (today: string) => `You are a task parser with date intelligence. Extract a task and optional due date from voice input.

IMPORTANT: Respond ONLY with valid JSON, no other text.

Today's date is ${today}.

Parse relative dates:
- "tomorrow" → next day
- "next Tuesday" → coming Tuesday
- "in 3 days" → 3 days from today
- "Friday" → this or next Friday
- No date mentioned → dueDate: null

If unclear or no task found, set unparseable to the raw text.

Response format:
{
  "task": "dentist appointment",
  "dueDate": "2026-05-27",
  "unparseable": null
}`;

const CALENDAR_V2_SYSTEM = (today: string) => `You are a calendar event parser with date and time intelligence.

IMPORTANT: Respond ONLY with valid JSON, no other text.

Today's date is ${today}.

Parse dates forward only — never return past dates:
- "next Monday" → COMING Monday (never last Monday)
- "tomorrow" → next day
- "in 3 days" → 3 days from today
- "Friday" → this or next Friday

time is HH:MM (24-hour) if mentioned, otherwise null.

If unclear or no event found, set unparseable to the raw text.

Response format:
{
  "title": "dentist appointment",
  "date": "2026-05-26",
  "time": "14:00",
  "unparseable": null
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { text, mode, today } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Legacy flat-array modes
    if (mode === 'shopping' || mode === 'task' || mode === 'shared') {
      const promptByMode: Record<string, string> = {
        shopping: `Extract every individual shopping item from this text. Each product or ingredient must be a separate entry — never combine multiple items into one string. Return ONLY a JSON array of strings. Example: ["milk", "eggs", "bread"]. If nothing found, return [].`,
        task: `Extract every individual task or to-do action from this text. Each distinct action must be a separate entry — never combine multiple tasks into one string. Return ONLY a JSON array of strings. Example: ["call the dentist", "pick up kids", "pay electricity bill"]. If nothing found, return [].`,
        shared: `Extract every individual item from this text. Each item must be a separate entry — never combine multiple items into one string. Return ONLY a JSON array of strings. Example: ["napkins", "paper plates", "juice"]. If nothing found, return [].`,
      };

      const prompt = promptByMode[mode] ?? promptByMode.shopping;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          messages: [{ role: "user", content: `${prompt}\n\nText: ${text}` }]
        }),
      });

      if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
      const aiData = await response.json();
      const rawContent = aiData.content?.[0]?.text ?? "[]";

      let items: string[] = [];
      try {
        const parsed = JSON.parse(rawContent.trim());
        if (Array.isArray(parsed)) items = parsed.filter((i): i is string => typeof i === 'string');
      } catch { items = []; }

      return new Response(
        JSON.stringify({ items, transcription: text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Structured v2 modes
    const todayStr = today || new Date().toISOString().split('T')[0];
    let systemPrompt: string;
    let userContent: string;

    if (mode === 'shopping-v2') {
      systemPrompt = SHOPPING_V2_SYSTEM;
      userContent = `Parse this voice input for shopping items: "${text}"`;
    } else if (mode === 'task-v2') {
      systemPrompt = TASK_SYSTEM(todayStr);
      userContent = `Parse this voice input as a task: "${text}"`;
    } else if (mode === 'calendar-v2') {
      systemPrompt = CALENDAR_V2_SYSTEM(todayStr);
      userContent = `Parse this voice input as a calendar event: "${text}"`;
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown mode: ${mode}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.content?.[0]?.text ?? "{}";

    let parsed: Record<string, unknown> = {};
    try {
      const clean = rawContent.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      parsed = { unparseable: text };
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
