import { useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Drop this next to any text input: onResult receives the spoken text.
// Built entirely on the browser's free, native Web Speech API — no paid
// service, but only works in browsers that support it (mainly Chrome).
export default function VoiceInputButton({ onResult, lang = "en-IN" }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  if (!SpeechRecognition) return null; // silently hide on unsupported browsers

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <button
      type="button"
      className={listening ? "" : "ghost"}
      onClick={toggle}
      title={listening ? "Listening... click to stop" : "Click to speak"}
      style={{ padding: "9px 11px" }}
    >
      {listening ? <MicOff size={15} /> : <Mic size={15} />}
    </button>
  );
}
