import { useEffect, useRef, useState } from "react";
import { voiceService } from "@/services/VoiceService";

/**
 * Thin React wrapper around the {@link voiceService} singleton.
 *
 * The actual speech-to-text logic (native / mobile-web Whisper / desktop Web
 * Speech) lives in src/services/VoiceService.ts. This hook only adapts the
 * singleton's event-callback API into React state + the options-object
 * interface that existing call sites already use.
 */
export type SpeechRecognitionOptions = {
  lang?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string, detail?: string) => void;
  onEnd?: () => void;
};

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(voiceService.isListening);
  const [isTranscribing, setIsTranscribing] = useState(voiceService.isTranscribing);

  // Latest handlers for the active session — kept in a ref so the singleton
  // subscriptions always dispatch to the current call site's callbacks.
  const optsRef = useRef<SpeechRecognitionOptions | null>(null);

  useEffect(() => {
    const unsubState = voiceService.onStateChange((s) => {
      setIsListening(s.isListening);
      setIsTranscribing(s.isTranscribing);
    });
    const unsubResult = voiceService.onResult((transcript, isFinal) =>
      optsRef.current?.onResult(transcript, isFinal)
    );
    const unsubError = voiceService.onError((err, detail) => optsRef.current?.onError?.(err, detail));
    const unsubEnd = voiceService.onEnd(() => optsRef.current?.onEnd?.());

    // Sync initial state in case it changed before subscription
    setIsListening(voiceService.isListening);
    setIsTranscribing(voiceService.isTranscribing);

    return () => {
      unsubState();
      unsubResult();
      unsubError();
      unsubEnd();
    };
  }, []);

  const start = (opts: SpeechRecognitionOptions) => {
    optsRef.current = opts;
    voiceService.startListening(opts.lang ?? "en-US");
  };

  const stop = () => {
    voiceService.stopListening();
  };

  return { isListening, isTranscribing, start, stop, isSingleShot: voiceService.isSingleShot };
};
