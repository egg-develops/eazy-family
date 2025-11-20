import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 10MB max audio size (base64 encoded is ~33% larger than raw)
const MAX_AUDIO_BASE64_SIZE = 13 * 1024 * 1024;

// Decode large base64 strings in chunks to avoid memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;

  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function padBase64(input: string) {
  const cleaned = input.replace(/\s/g, "");
  const padLen = (4 - (cleaned.length % 4)) % 4;
  return cleaned + "=".repeat(padLen);
}

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

    const { audioBase64 } = await req.json();
    
    // Validate input
    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: "No audio data provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof audioBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: "Audio data must be a base64 string" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (audioBase64.length > MAX_AUDIO_BASE64_SIZE) {
      return new Response(
        JSON.stringify({ error: "Audio file too large. Maximum 10MB allowed" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert base64 to blob for transcription (robust decoder)
    const padded = padBase64(audioBase64);
    const audioData = processBase64Chunks(padded);
    const audioBlob = new Blob([audioData], { type: "audio/webm" });

    // First, transcribe the audio using OpenAI's Whisper
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Transcription error:", transcriptionResponse.status, errorText);
      const status = transcriptionResponse.status === 429 ? 429 : 400;
      return new Response(
        JSON.stringify({ error: "Transcription failed", details: errorText }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text: transcription } = await transcriptionResponse.json();
    console.log("Transcription:", transcription);

    // Now use Lovable AI to extract shopping items from the transcription
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a helpful shopping assistant. Extract shopping items from user speech and return them as a JSON array of strings. Each item should be a simple, clear shopping item name. If the user says something that's not a shopping item, return an empty array."
          },
          {
            role: "user",
            content: transcription
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_shopping_items",
              description: "Extract shopping items from the transcribed text",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "Array of shopping items extracted from the text"
                  }
                },
                required: ["items"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_shopping_items" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const error = await aiResponse.text();
      console.error("AI error:", error);
      throw new Error("Failed to process with AI");
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData, null, 2));

    // Extract items from tool call
    let items: string[] = [];
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
      items = args.items || [];
    }

    return new Response(
      JSON.stringify({ 
        transcription,
        items 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
