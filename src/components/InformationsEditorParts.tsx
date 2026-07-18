import { useEffect, useRef, useState } from "react";

import { type MembreProfile, getMembres } from "../api.js";

/* eslint-disable react-hooks/exhaustive-deps */

/** Common emojis, built from code points so the source stays ASCII (the project
 * bans literal emojis in code; member-facing CONTENT may of course carry them). */
const EMOJI_POINTS: number[][] = [
  [0x1f64f], [0x2764, 0xfe0f], [0x1f54a, 0xfe0f], [0x26ea], [0x1f4d6], [0x2728],
  [0x1f525], [0x1f31f], [0x2b50], [0x1f308], [0x1f64c], [0x1f44f],
  [0x1f44d], [0x1f91d], [0x1f4aa], [0x1f60a], [0x1f604], [0x1f642],
  [0x1f607], [0x1f60d], [0x1f970], [0x1f389], [0x1f38a], [0x1f393],
  [0x1f4e2], [0x1f4e3], [0x1f514], [0x26a0, 0xfe0f], [0x2757], [0x2705],
  [0x1f4c5], [0x1f4cd], [0x1f551], [0x1f4dd], [0x1f4ce], [0x1f3b5],
];
export const EMOJIS: string[] = EMOJI_POINTS.map((pts) => String.fromCodePoint(...pts));

/** Wrap the current textarea selection with markers (bold/italic/underline) or
 * insert a plain string at the caret, keeping focus and a sensible caret position. */
function applyToTextarea(
  el: HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
  before: string,
  after = "",
): void {
  if (!el) return;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  onChange(next);
  const caret = after ? (selected ? end + before.length + after.length : start + before.length) : start + before.length;
  window.setTimeout(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  }, 0);
}

/** Formatting toolbar for the content textarea: bold, italic, underline and an
 * emoji palette. The markers are the light markup the member app renders
 * (**gras**, *italique*, __souligne__); nothing is ever interpreted as HTML. */
export function RichToolbar({
  textareaRef,
  value,
  onChange,
}: Readonly<{
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
}>): JSX.Element {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const wrap = (b: string, a: string): void => applyToTextarea(textareaRef.current, value, onChange, b, a);
  return (
    <div className="rt-bar">
      <button type="button" className="rt-btn" title="Gras" aria-label="Mettre en gras" onClick={() => wrap("**", "**")}><b>G</b></button>
      <button type="button" className="rt-btn" title="Italique" aria-label="Mettre en italique" onClick={() => wrap("*", "*")}><i>I</i></button>
      <button type="button" className="rt-btn" title="Souligner" aria-label="Souligner" onClick={() => wrap("__", "__")}><u>S</u></button>
      <span className="rt-sep" aria-hidden="true" />
      <button type="button" className="rt-btn" aria-expanded={emojiOpen} aria-label="Insérer un émoji" onClick={() => setEmojiOpen((v) => !v)}>
        {EMOJIS[15]}
      </button>
      {emojiOpen && (
        <div className="rt-emojis" role="listbox" aria-label="Choisir un émoji">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="rt-emoji"
              onClick={() => {
                applyToTextarea(textareaRef.current, value, onChange, e);
                setEmojiOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuree(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Voice-note recorder for the editor (MediaRecorder). Explicit start, pause,
 * resume, stop, preview and re-record; the result is handed up as a data URL and
 * only persisted when the admin saves. A device without microphone access shows a
 * clear message instead of a dead button. */
export function VoiceRecorder({
  existingUrl,
  onChange,
}: Readonly<{
  /** Currently stored voice note (data URL) or null. */
  existingUrl: string | null;
  /** null clears; a data URL replaces. Called only on explicit user actions. */
  onChange: (dataUrl: string | null) => void;
}>): JSX.Element {
  const [etat, setEtat] = useState<"idle" | "rec" | "pause">("idle");
  const [duree, setDuree] = useState(0);
  const [preview, setPreview] = useState<string | null>(existingUrl);
  const [erreur, setErreur] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  function tick(on: boolean): void {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = on ? window.setInterval(() => setDuree((d) => d + 1), 1000) : null;
  }

  async function demarrer(): Promise<void> {
    setErreur(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const du = String(reader.result || "");
          setPreview(du);
          onChange(du);
        };
        reader.readAsDataURL(blob);
      };
      recRef.current = rec;
      rec.start();
      setDuree(0);
      setEtat("rec");
      tick(true);
    } catch {
      setErreur("Microphone indisponible: autorisez l'accès au micro puis réessayez.");
    }
  }

  function stop(): void {
    recRef.current?.stop();
    setEtat("idle");
    tick(false);
  }

  function basculerPause(): void {
    const rec = recRef.current;
    if (!rec) return;
    if (etat === "rec") {
      rec.pause();
      setEtat("pause");
      tick(false);
    } else {
      rec.resume();
      setEtat("rec");
      tick(true);
    }
  }

  const enCours = etat !== "idle";
  return (
    <div className="vr-box">
      <div className="vr-row">
        {!enCours && (
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => void demarrer()}>
            {preview ? "Réenregistrer" : "Enregistrer une note vocale"}
          </button>
        )}
        {enCours && (
          <>
            <span className={`vr-dot ${etat === "rec" ? "is-rec" : ""}`} aria-hidden="true" />
            <span className="vr-time">{formatDuree(duree)}</span>
            <button type="button" className="btn btn-ghost btn-inline" onClick={basculerPause}>
              {etat === "rec" ? "Pause" : "Reprendre"}
            </button>
            <button type="button" className="btn btn-primary btn-inline" onClick={stop}>
              Terminer
            </button>
          </>
        )}
        {preview && !enCours && (
          <button
            type="button"
            className="btn btn-danger btn-inline"
            onClick={() => {
              setPreview(null);
              onChange(null);
            }}
          >
            Supprimer
          </button>
        )}
      </div>
      {preview && !enCours && <audio controls src={preview} className="vr-audio" />}
      {erreur && <p className="banner banner-error">{erreur}</p>}
    </div>
  );
}

/** Read a picked file as a data URL, refusing anything above the API cap so the
 * admin gets an immediate size message instead of a failed upload. */
export function fileToDataUrl(file: File, maxBytes = 2_500_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`Fichier trop volumineux (${Math.round(file.size / 1024)} Ko, maximum ${Math.round(maxBytes / 1024)} Ko).`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

/** Member search-and-pick for the manual "selection" targeting: type a name,
 * pick from the matches, chips list the chosen members. */
export function MembrePicker({
  token,
  selection,
  onChange,
}: Readonly<{
  token: string;
  selection: { id: string; nom: string }[];
  onChange: (next: { id: string; nom: string }[]) => void;
}>): JSX.Element {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<MembreProfile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const terme = q.trim();
    if (terme.length < 2) {
      setResultats([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setBusy(true);
      getMembres(token, { q: terme, limit: 8 })
        .then((rows) => setResultats(rows))
        .catch(() => setResultats([]))
        .finally(() => setBusy(false));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [q, token]);

  const nomDe = (m: MembreProfile): string =>
    (m.nom_affiche as string | null) ?? `${m.prenoms ?? ""} ${m.nom ?? ""}`.trim();

  return (
    <div className="mp-box">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un membre par nom..."
        aria-label="Rechercher un membre"
      />
      {busy && <p className="muted small">Recherche...</p>}
      {resultats.length > 0 && (
        <ul className="mp-results">
          {resultats
            .filter((m) => !selection.some((s) => s.id === m.id))
            .map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...selection, { id: m.id, nom: nomDe(m) }]);
                    setQ("");
                    setResultats([]);
                  }}
                >
                  {nomDe(m)}
                  <span className="muted small"> {m.matricule ?? ""}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
      {selection.length > 0 && (
        <div className="mp-chips">
          {selection.map((s) => (
            <span key={s.id} className="mp-chip">
              {s.nom}
              <button type="button" aria-label={`Retirer ${s.nom}`} onClick={() => onChange(selection.filter((x) => x.id !== s.id))}>
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
