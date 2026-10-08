import { useRef } from "react";
import { Camera } from "lucide-react";

const MAX_DIMENSION = 240; // px — plenty for an avatar, keeps the resulting file tiny
const JPEG_QUALITY = 0.8;

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      img.onerror = () => reject(new Error("That doesn't look like a valid image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({ value, onChange }) {
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        className="avatar"
        style={{ width: 64, height: 64, fontSize: "1.3rem", overflow: "hidden", cursor: "pointer" }}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Camera size={22} />
        )}
      </div>
      <button type="button" className="ghost" onClick={() => inputRef.current?.click()}>
        {value ? "Change photo" : "Add photo"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}
