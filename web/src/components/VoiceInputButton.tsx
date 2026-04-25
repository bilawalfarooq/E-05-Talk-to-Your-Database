import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onResult: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionLike {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onerror: (e: unknown) => void;
  onend: () => void;
}

export function VoiceInputButton({ onResult, disabled }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const r = new SR();
      r.continuous = false;
      r.interimResults = false;
      r.lang = "en-US";
      r.onresult = (e) => {
        const text = e.results[0][0].transcript;
        onResult(text);
      };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      recognitionRef.current = r;
    }
  }, [onResult]);

  if (!supported) return null;

  const toggle = () => {
    const r = recognitionRef.current;
    if (!r) return;
    if (listening) { r.stop(); setListening(false); }
    else { r.start(); setListening(true); }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Stop listening" : "Start voice input"}
      className={`p-2 rounded-lg border transition ${
        listening
          ? "border-bad-500/50 bg-bad-500/15 text-bad-500 animate-pulse"
          : "border-ink-700 bg-ink-800 text-gray-400 hover:text-accent-400 hover:border-accent-500/50"
      } disabled:opacity-50`}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
}
