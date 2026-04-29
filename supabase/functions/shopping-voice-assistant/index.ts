import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    const { text, mode } = await req.json();

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

    const promptByMode: Record<string, string> = {
      shopping: `Extract every individual shopping item from this text. Each product or ingredient must be a separate entry — never combine multiple items into one string. Return ONLY a JSON array of strings. Example: ["milk", "eggs", "bread"]. If nothing found, return [].`,
      task: `Extract every individual task or to-do action from this text. Each distinct action must be a separate entry — never combine multiple tasks into one string. Return ONLY a JSON array of strings. Example: ["call the dentist", "pick up kids", "pay electricity bill"]. If nothing found, return [].`,
      shared: `Extract every individual item from this text. Each item must be a separate entry — never combine multiple items into one string. Return ONLY a JSON array of strings. Example: ["napkins", "paper plates", "juice"]. If nothing found, return [].`,
    };

    const prompt = promptByMode[mode] ?? promptByMode.shopping;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nText: ${text}`
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.content?.[0]?.text ?? "[]";

    let items: string[] = [];
    try {
      const parsed = JSON.parse(rawContent.trim());
      if (Array.isArray(parsed)) {
        items = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      items = [];
    }

    return new Response(
      JSON.stringify({ items, transcription: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
