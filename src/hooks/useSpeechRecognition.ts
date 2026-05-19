import { useRef, useState } from "react";

export type SpeechRecognitionOptions = {
  lang?: string;
  continuous?: boolean;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
};

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef('');
  const capturedRef = useRef('');

  const stop = () => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    baseTextRef.current = '';
    capturedRef.current = '';
    setIsListening(false);
  };

  const start = (opts: SpeechRecognitionOptions) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      opts.onError?.('not-supported');
      return;
    }

    isListeningRef.current = true;
    baseTextRef.current = '';
    capturedRef.current = '';
    setIsListening(true);

    const spawnSession = (): any => {
      const r = new SR();
      r.lang = opts.lang ?? 'en-US';
      r.interimResults = opts.continuous ?? false;
      r.continuous = opts.continuous ?? false;
      r.maxAlternatives = 1;

      r.onresult = (e: any) => {
        let sessionText = '';
        for (let i = 0; i < e.results.length; i++) {
          sessionText += e.results[i][0].transcript;
        }
        const combined = baseTextRef.current
          ? `${baseTextRef.current} ${sessionText}`
          : sessionText;
        capturedRef.current = combined;
        const isFinal = !opts.continuous || (e.results[e.results.length - 1]?.isFinal ?? false);
        opts.onResult(combined, isFinal);
      };

      r.onerror = (e: any) => {
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        isListeningRef.current = false;
        setIsListening(false);
        opts.onError?.(e.error);
      };

      r.onend = () => {
        if (!isListeningRef.current) {
          setIsListening(false);
          opts.onEnd?.();
          return;
        }
        if (opts.continuous) {
          // iOS kills continuous sessions — restart synchronously (setTimeout blocks on iOS)
          baseTextRef.current = capturedRef.current;
          try {
            const next = spawnSession();
            recognitionRef.current = next;
          } catch {
            setIsListening(false);
            opts.onEnd?.();
          }
        } else {
          setIsListening(false);
          opts.onEnd?.();
        }
      };

      try {
        r.start();
      } catch {
        isListeningRef.current = false;
        setIsListening(false);
      }
      return r;
    };

    recognitionRef.current = spawnSession();
  };

  return { isListening, start, stop };
};
