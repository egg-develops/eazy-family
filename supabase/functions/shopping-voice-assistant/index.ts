import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64 } = await req.json();
    
    if (!audioBase64) {
      throw new Error("No audio data provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert base64 to blob for transcription
    const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioData], { type: "audio/webm" });

    // First, transcribe the audio using Lovable AI
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text();
      console.error("Transcription error:", error);
      throw new Error("Failed to transcribe audio");
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
