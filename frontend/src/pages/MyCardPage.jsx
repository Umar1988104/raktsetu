import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Link2, Share2, SlidersHorizontal, FlipHorizontal, EyeOff, QrCode } from "lucide-react";
import { api } from "../api";
import { useConfirm, useToast } from "../components/UiFeedback";
import { BridgeLoader } from "../components/Brand";
import WalletStack from "../components/card/WalletStack";
import CardSettingsSheet from "../components/card/CardSettingsSheet";
import { makeQr, verifyUrl, publicPreview } from "../components/card/cardUtils";
import { downloadCardImage } from "../components/card/drawCard";

// Deep-merge for the optimistic update of settings.
const applyPatch = (card, patch) => ({
  ...card,
  settings: {
    ...card.settings,
    ...(typeof patch.hidden === "boolean" ? { hidden: patch.hidden } : {}),
    show: { ...card.settings.show, ...patch.show },
  },
  emergencyContact: patch.emergencyContact ? { ...card.emergencyContact, ...patch.emergencyContact } : card.emergencyContact,
});

export default function MyCardPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [qrs, setQrs] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/api/cards/mine")
      .then(async (d) => {
        setData(d);
        const pairs = await Promise.all((d.cards || []).map(async (c) => [c.cardId, await makeQr(c.cardId)]));
        setQrs(Object.fromEntries(pairs));
        if ((d.cards || []).length === 1) setSelectedId(d.cards[0].cardId);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Stack order: the account holder's own card is the front-most (last) one.
  const stack = useMemo(() => {
    const cards = data?.cards || [];
    return [...cards.filter((c) => !c.isSelf), ...cards.filter((c) => c.isSelf)];
  }, [data]);
  const selected = stack.find((c) => c.cardId === selectedId) || null;

  const replaceCard = (cardId, next) => setData((d) => ({ ...d, cards: d.cards.map((c) => (c.cardId === cardId ? next : c)) }));

  // Optimistic: the switch moves at once; if the server refuses it moves back.
  async function updateSettings(cardId, patch) {
    const before = data.cards.find((c) => c.cardId === cardId);
    replaceCard(cardId, applyPatch(before, patch));
    try {
      const res = await api.patch(`/api/cards/${cardId}/settings`, patch);
      replaceCard(cardId, res.card);
      return null;
    } catch (err) {
      replaceCard(cardId, before);
      toast(err.message, "error");
      return err.message;
    }
  }

  async function regenerate() {
    if (!selected) return;
    const ok = await confirm({
      title: "Create a new card ID?",
      message: "Your current QR code and ID will stop working immediately. Anyone who has them will no longer be able to open your card's page. Download or share the new one afterwards.",
      confirmLabel: "Create new ID",
      cancelLabel: "Keep current ID",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await api.post(`/api/cards/${selected.cardId}/regenerate`, {});
      const oldId = selected.cardId;
      const qr = await makeQr(res.card.cardId);
      setQrs((q) => ({ ...q, [res.card.cardId]: qr }));
      setData((d) => ({ ...d, cards: d.cards.map((c) => (c.cardId === oldId ? res.card : c)) }));
      setSelectedId(res.card.cardId);
      toast("New card ID created. The old one no longer works.", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function download() {
    if (!selected) return;
    setBusy(true);
    try {
      await downloadCardImage(selected, qrs[selected.cardId]);
    } catch (err) {
      toast(err.message || "Couldn't create the image", "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl(selected.cardId));
      toast("Verify link copied.", "success");
    } catch {
      toast("Couldn't copy — long-press the QR code instead.", "error");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "My RaktSetu card", url: verifyUrl(selected.cardId) });
    } catch {
      /* cancelled */
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <BridgeLoader />;

  if (data.guest) {
    return (
      <div>
        <div className="page-header">
          <h1>My card</h1>
        </div>
        <div className="card empty-state">
          <div className="emoji"><QrCode size={40} className="empty-icon" /></div>
          <p>Guest sessions don't get a RaktSetu card.</p>
          <p className="empty-note" style={{ marginTop: 16 }}>
            Create a free account to get your own card with a QR code, donation stamps and a verify page.
          </p>
          <Link to="/signup" className="btn-primary" style={{ marginTop: 16 }}>Create an account</Link>
        </div>
      </div>
    );
  }

  const multiple = stack.length > 1;
  return (
    <div>
      <div className="page-header">
        <h1>{stack[0]?.kind === "partner" ? "Partner card" : multiple ? "My family's cards" : "My card"}</h1>
        <p>
          {multiple ? "Tap a card to bring it forward, tap again to flip it." : "Tap the card to flip it over."} Your phone number is never on it.
        </p>
      </div>

      <div className="card-layout">
        <div className="card-col">
          <WalletStack
            cards={stack}
            qrs={qrs}
            selectedId={selectedId}
            flipped={flipped}
            onSelect={(id) => { setSelectedId(id); setFlipped(false); }}
            onFlip={() => setFlipped((f) => !f)}
          />
        </div>

        <div className="card-col">
          {!selected ? (
            <div className="card empty-note">Pick a card from the stack to download it, share it or change what it shows.</div>
          ) : (
            <div className="card">
              <h3>{selected.kind === "partner" ? selected.hospitalName : selected.isSelf ? "Your card" : `${selected.name}'s card`}</h3>

              {selected.settings.hidden && (
                <p className="empty-note" style={{ marginBottom: 16 }}>
                  <EyeOff size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  Hidden — scanning the QR code shows “Card not found”.
                </p>
              )}

              <div className="card-actions">
                <button type="button" className="ghost" onClick={() => setFlipped((f) => !f)}>
                  <FlipHorizontal size={16} /> Flip
                </button>
                <button type="button" onClick={download} disabled={busy}>
                  <Download size={16} /> Download image
                </button>
                <button type="button" className="ghost" onClick={copyLink}>
                  <Link2 size={16} /> Copy link
                </button>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button type="button" className="ghost" onClick={share}>
                    <Share2 size={16} /> Share
                  </button>
                )}
                <button type="button" className="secondary" onClick={() => setSettingsOpen(true)}>
                  <SlidersHorizontal size={16} /> Privacy
                </button>
              </div>

              <div className="section-title" style={{ marginTop: 24 }}>Scanning the QR code shows</div>
              {selected.settings.hidden ? (
                <p className="status">Nothing — this card is hidden.</p>
              ) : (
                <div className="preview-chips">
                  {publicPreview(selected).map((t) => (
                    <span key={t} className="pill pill-verified">{t}</span>
                  ))}
                  {publicPreview(selected).length === 0 && <span className="status">Only “RaktSetu member”.</span>}
                </div>
              )}

              {selected.kind === "partner" && !selected.partnerVerified && (
                <p className="status" style={{ marginTop: 16 }}>
                  Your hospital hasn't been verified as a partner yet. An admin checks this outside the app; until then the card says “Pending verification”.
                </p>
              )}
              {selected.kind === "member" && !selected.bloodGroup && (
                <p className="status" style={{ marginTop: 16 }}>
                  No blood group on this card yet — add it in <Link to="/profile">Profile</Link>.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <CardSettingsSheet
        card={selected}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChange={updateSettings}
        onRegenerate={regenerate}
      />
    </div>
  );
}
