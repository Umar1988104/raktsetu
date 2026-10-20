import { Phone, MessageCircle } from "lucide-react";

// Call and WhatsApp links for a number that has been shared after someone
// accepted. Plain links (free): `tel:` and `wa.me`. Indian mobile numbers only.
export default function ContactButtons({ phone, hospital }) {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (!digits) return null;
  const valid = /^[6-9]\d{9}$/.test(digits);
  const text = encodeURIComponent(`Hello, I'm contacting you through RaktSetu about the blood request${hospital ? ` at ${hospital}` : ""}.`);
  return (
    <div className="contact-buttons">
      <a className="btn-outline" href={`tel:${digits}`}>
        <Phone size={14} /> Call
      </a>
      {valid && (
        <a className="btn-outline" href={`https://wa.me/91${digits}?text=${text}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={14} /> WhatsApp
        </a>
      )}
    </div>
  );
}
