import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function ReadAloudButton({ text }) {
  const [speaking, setSpeaking] = useState(false);

  if (!window.speechSynthesis) return null; // silently hide on unsupported browsers

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button type="button" className="ghost" onClick={toggle}>
      {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />} {speaking ? "Stop" : "Read aloud"}
    </button>
  );
}
