import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Deployed with --no-verify-jwt; Supabase gateway enforces the apikey.
    // A valid Authorization or apikey header is always present from the client.
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    if (!DEEPGRAM_API_KEY) {
      return new Response(JSON.stringify({ error: 'Transcription not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const language = formData.get('language') as string | null;

    if (!audioFile || audioFile.size < 100) {
      return new Response(JSON.stringify({ text: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use language hint when available; fall back to auto-detect (ideal for multilingual Switzerland)
    const supportedLangs = ['en', 'de', 'fr', 'it', 'es', 'pt', 'nl'];
    const langParam = language && supportedLangs.includes(language)
      ? `language=${language}`
      : 'detect_language=true';

    const url = `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&${langParam}`;

    const audioBytes = await audioFile.arrayBuffer();

    const dgRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': audioFile.type || 'audio/webm',
      },
      body: audioBytes,
    });

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      console.error('Deepgram error:', dgRes.status, errText);
      throw new Error(`Deepgram API error: ${dgRes.status}`);
    }

    const result = await dgRes.json();
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';

    return new Response(JSON.stringify({ text: transcript }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('transcribe-audio error:', error);
    return new Response(JSON.stringify({ error: 'Transcription failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
