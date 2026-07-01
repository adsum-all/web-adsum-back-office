import { useEffect, useState } from "react";

import {
  ApiError,
  type ConsentDocAdmin,
  type ConsentDocPayload,
  getConsentDocsAdmin,
  publishConsentDoc,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

/** Editor for the legal documents members must read and sign at registration. */
export function Consentements({ token }: { token: string }): JSX.Element {
  const docs = useResource(() => getConsentDocsAdmin(token), [token]);
  const [selected, setSelected] = useState<string | null>(null);

  const list: ConsentDocAdmin[] = docs.data ?? [];
  const current = list.find((d) => d.cle === selected) ?? list[0] ?? null;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>
            Documents & consentements
            <InfoTip
              title="Versionnement et preuve de signature"
              text="Publier enregistre une NOUVELLE version du document. L'ancienne version reste conservee comme preuve pour les signatures deja recueillies (piste d'audit). A l'inscription, chaque membre doit lire et signer ces documents avant de finaliser son dossier."
            />
          </h1>
          <p className="muted">
            RGPD, confidentialite, lettre d'engagement et reglement interieur presentes aux membres a l'inscription.
          </p>
        </div>
      </header>

      {docs.error && <p className="banner banner-error">{docs.error}</p>}
      {docs.loading && <p className="muted">Chargement...</p>}

      {!docs.loading && list.length === 0 && !docs.error && (
        <p className="muted">Aucun document configure.</p>
      )}

      {list.length > 0 && (
        <div className="toolbar" style={{ flexWrap: "wrap" }}>
          {list.map((d) => (
            <button
              key={d.cle}
              type="button"
              className={`btn btn-inline ${current?.cle === d.cle ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setSelected(d.cle)}
            >
              {d.titre || d.cle}
              <span className="muted small" style={{ marginLeft: 6 }}>
                v{d.version}
              </span>
            </button>
          ))}
        </div>
      )}

      {current && (
        <DocEditor
          key={current.cle}
          token={token}
          doc={current}
          onPublished={() => docs.reload()}
        />
      )}
    </div>
  );
}

interface Draft extends ConsentDocPayload {
  cle: string;
  version: number;
  actif: boolean;
}

function toDraft(doc: ConsentDocAdmin): Draft {
  return {
    cle: doc.cle,
    version: doc.version,
    actif: doc.actif,
    titre: doc.titre,
    titre_en: doc.titre_en,
    contenu: doc.contenu,
    contenu_en: doc.contenu_en,
    bloquant: doc.bloquant,
    ordre: doc.ordre,
  };
}

function DocEditor({
  token,
  doc,
  onPublished,
}: {
  token: string;
  doc: ConsentDocAdmin;
  onPublished: () => void;
}): JSX.Element {
  const [form, setForm] = useState<Draft>(() => toDraft(doc));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setForm(toDraft(doc));
    setError(null);
    setNote(null);
  }, [doc]);

  function set<K extends keyof ConsentDocPayload>(key: K, value: ConsentDocPayload[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function publish(): Promise<void> {
    if (!form.titre.trim() || !form.contenu.trim()) {
      setError("Le titre et le contenu sont obligatoires.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await publishConsentDoc(token, form.cle, {
        titre: form.titre.trim(),
        titre_en: form.titre_en.trim(),
        contenu: form.contenu,
        contenu_en: form.contenu_en,
        bloquant: form.bloquant,
        ordre: form.ordre,
      });
      setNote("Nouvelle version publiee. La version precedente est conservee comme preuve.");
      onPublished();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">
        {doc.titre || doc.cle}
        <span className="muted small" style={{ marginLeft: 8 }}>
          version courante v{doc.version}
          {doc.actif ? "" : " (inactive)"}
        </span>
      </h2>

      <div className="form-grid">
        <label>
          <span>Titre (FR) *</span>
          <input value={form.titre} onChange={(e) => set("titre", e.target.value)} required />
        </label>
        <label>
          <span>Titre (EN)</span>
          <input value={form.titre_en} onChange={(e) => set("titre_en", e.target.value)} />
        </label>
        <label>
          <span>Ordre</span>
          <input type="number" value={form.ordre} onChange={(e) => set("ordre", Number(e.target.value))} />
        </label>
        <label className="check" style={{ alignSelf: "end" }}>
          <input type="checkbox" checked={form.bloquant} onChange={(e) => set("bloquant", e.target.checked)} />
          Bloquant (signature obligatoire pour finaliser l'inscription)
        </label>
      </div>

      <label style={{ display: "block", marginTop: 12 }}>
        <span className="muted small">Contenu (FR) *</span>
        <textarea
          className="textarea"
          rows={10}
          value={form.contenu}
          onChange={(e) => set("contenu", e.target.value)}
        />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        <span className="muted small">Contenu (EN)</span>
        <textarea
          className="textarea"
          rows={10}
          value={form.contenu_en}
          onChange={(e) => set("contenu_en", e.target.value)}
        />
      </label>

      {error && <p className="banner banner-error">{error}</p>}
      {note && <p className="banner banner-ok">{note}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void publish()}>
          {busy ? "Publication..." : "Publier une nouvelle version"}
        </button>
      </div>
    </section>
  );
}
