import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

// Module-level cache — permission granted status persists for the app session
let nativePermissionGranted = false;

export type SpeechRecognitionOptions = {
  lang?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
};

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);

  // Native path
  const nativeCleanupRef = useRef<(() => void) | null>(null);
  const nativeActiveRef = useRef(false);

  // Web path
  const recognitionRef = useRef<any>(null);
  const webActiveRef = useRef(false);
  const sessionIdRef = useRef(0);

  const isNative = Capacitor.isNativePlatform();

  const stop = () => {
    if (isNative) {
      nativeActiveRef.current = false;
      nativeCleanupRef.current?.();
      nativeCleanupRef.current = null;
      SpeechRecognition.stop().catch(() => {});
      setIsListening(false);
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

    if (!nativeActiveRef.current) return; // stopped before permissions resolved

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

  const start = (opts: SpeechRecognitionOptions) => {
    if (isNative) {
      nativeActiveRef.current = true;
      startNative(opts);
      return;
    }

    // Web fallback
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

  return { isListening, start, stop };
};
