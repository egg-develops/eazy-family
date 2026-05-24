import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { supabase } from "@/integrations/supabase/client";

// Module-level cache — permission granted status persists for the app session
let nativePermissionGranted = false;

// Use MediaRecorder + Whisper on mobile web (iOS Safari has no Web Speech API;
// mobile Chrome's Web Speech API is unreliable). Desktop keeps Web Speech API.
function shouldUseWhisper(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const hasSpeechAPI = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  return isMobile || !hasSpeechAPI;
}

function getBestMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

export type SpeechRecognitionOptions = {
  lang?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
};

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Native path
  const nativeCleanupRef = useRef<(() => void) | null>(null);
  const nativeActiveRef = useRef(false);

  // Web Speech API path (desktop only)
  const recognitionRef = useRef<any>(null);
  const webActiveRef = useRef(false);
  const sessionIdRef = useRef(0);

  // MediaRecorder + Whisper path (mobile web)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcribeAbortRef = useRef<AbortController | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const useWhisper = !isNative && shouldUseWhisper();

  const stop = () => {
    if (isNative) {
      nativeActiveRef.current = false;
      nativeCleanupRef.current?.();
      nativeCleanupRef.current = null;
      SpeechRecognition.stop().catch(() => {});
      setIsListening(false);
    } else if (useWhisper) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop(); // triggers onstop → transcription
      } else {
        // Stopped before recording started or already done
        transcribeAbortRef.current?.abort();
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
        setIsListening(false);
        setIsTranscribing(false);
      }
    } else {
      webActiveRef.current = false;
      sessionIdRef.current++;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  const startNative = async (opts: SpeechRecognitionOptions) => {
    if (!nativePermissionGranted) {
      try {
        const { speechRecognition: current } = await SpeechRecognition.checkPermissions();
        if (current === 'granted') {
          nativePermissionGranted = true;
        } else {
          const { speechRecognition } = await SpeechRecognition.requestPermissions();
          if (speechRecognition !== 'granted') {
            opts.onError?.('not-allowed');
            return;
          }
          nativePermissionGranted = true;
        }
        const { available } = await SpeechRecognition.available();
        if (!available) {
          opts.onError?.('not-supported');
          return;
        }
      } catch {
        opts.onError?.('not-supported');
        return;
      }
    }

    if (!nativeActiveRef.current) return;

    setIsListening(true);

    let partialHandle: any = null;
    let stateHandle: any = null;
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      partialHandle?.remove();
      stateHandle?.remove();
      nativeCleanupRef.current = null;
      setIsListening(false);
    };

    nativeCleanupRef.current = cleanup;

    partialHandle = await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
      if (!nativeActiveRef.current || cleanedUp) return;
      const transcript = data.matches?.[0] ?? '';
      if (transcript) opts.onResult(transcript, false);
    });

    stateHandle = await SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
      if (data.status === 'stopped' && !cleanedUp) {
        cleanup();
        if (nativeActiveRef.current) {
          opts.onEnd?.();
        }
      }
    });

    try {
      await SpeechRecognition.start({
        language: opts.lang ?? 'en-US',
        partialResults: true,
        maxResults: 1,
        popup: false,
      });
    } catch (e: any) {
      if (!cleanedUp) {
        cleanup();
        const msg = (e?.message ?? '').toLowerCase();
        opts.onError?.(msg.includes('permiss') || msg.includes('denied') ? 'not-allowed' : 'unknown');
      }
    }
  };

  const startMediaRecorder = async (opts: SpeechRecognitionOptions) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getBestMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsListening(false);

        const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
        if (totalSize < 500) {
          opts.onEnd?.();
          return;
        }

        setIsTranscribing(true);
        const abort = new AbortController();
        transcribeAbortRef.current = abort;

        try {
          const ext = mimeType.includes('mp4') || mimeType.includes('aac') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          const { data: { session } } = await supabase.auth.getSession();
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

          const fd = new FormData();
          fd.append('audio', blob, `recording.${ext}`);
          fd.append('language', (opts.lang ?? 'en-US').split('-')[0]);

          const res = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token ?? anonKey}`,
              'apikey': anonKey,
            },
            body: fd,
            signal: abort.signal,
          });

          if (res.ok) {
            const data = await res.json();
            const transcript = (data.text ?? '').trim();
            if (transcript) opts.onResult(transcript, true);
          }
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            console.error('[useSpeechRecognition] Whisper transcription failed:', err);
          }
        }

        setIsTranscribing(false);
        opts.onEnd?.();
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsListening(true);

    } catch (err: any) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      opts.onError?.(denied ? 'not-allowed' : 'unknown');
    }
  };

  const start = (opts: SpeechRecognitionOptions) => {
    if (isNative) {
      nativeActiveRef.current = true;
      startNative(opts);
      return;
    }

    if (useWhisper) {
      startMediaRecorder(opts);
      return;
    }

    // Desktop: Web Speech API
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      opts.onError?.('not-supported');
      return;
    }

    webActiveRef.current = false;
    sessionIdRef.current++;
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    webActiveRef.current = true;
    setIsListening(true);

    const sessionId = sessionIdRef.current;
    const r = new SR();
    r.lang = opts.lang ?? 'en-US';
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      if (sessionIdRef.current !== sessionId) return;
      let sessionText = '';
      for (let i = 0; i < e.results.length; i++) {
        sessionText += e.results[i][0].transcript;
      }
      opts.onResult(sessionText, true);
    };

    r.onerror = (e: any) => {
      if (sessionIdRef.current !== sessionId) return;
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      webActiveRef.current = false;
      setIsListening(false);
      opts.onError?.(e.error);
    };

    r.onend = () => {
      if (sessionIdRef.current !== sessionId) return;
      setIsListening(false);
      if (webActiveRef.current) {
        opts.onEnd?.();
      }
    };

    try {
      r.start();
      recognitionRef.current = r;
    } catch {
      webActiveRef.current = false;
      setIsListening(false);
    }
  };

  return { isListening, isTranscribing, start, stop };
};
