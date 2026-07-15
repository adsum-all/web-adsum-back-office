import { useState } from "react";

import {
  type AiProvider,
  type AiProviderInput,
  activerAiProvider,
  aiCatalogue,
  createAiProvider,
  deleteAiProvider,
  desactiverAiProvider,
  listAiProviders,
  testAiProvider,
  updateAiProvider,
} from "../api.js";
import { useResource } from "../useResource.js";
import { Tabs } from "./Tabs.js";

const CAP_LABEL: Record<string, string> = {
  stt: "Transcription (voix vers texte)",
  llm: "Rédaction professionnelle",
};

function emptyForm(capacite: "stt" | "llm"): AiProviderInput {
  return { capacite, fournisseur: "groq", libelle: "", modele: "", endpoint: "", cle: "", gratuit: false };
}

export function ReglagesIA({ token }: { token: string }): JSX.Element {
  const providers = useResource(() => listAiProviders(token), [token]);
  const catalogue = useResource(() => aiCatalogue(token), [token]);
  const [note, setNote] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState<Record<"stt" | "llm", AiProviderInput>>({ stt: emptyForm("stt"), llm: emptyForm("llm") });
  const [cleEdit, setCleEdit] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"stt" | "llm">("stt");
  // Inline metadata edit (libellé, modèle, endpoint, gratuit) of one provider.
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ libelle: string; modele: string; endpoint: string; gratuit: boolean }>({ libelle: "", modele: "", endpoint: "", gratuit: false });

  async function run(p: Promise<unknown>, ok: string): Promise<void> {
    setBusy(true);
    setErreur(null);
    setNote(null);
    try {
      await p;
      providers.reload();
      setNote(ok);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  async function ajouter(cap: "stt" | "llm"): Promise<void> {
    const f = form[cap];
    if (!f.modele.trim() || !f.libelle.trim()) { setErreur("Libellé et modèle sont requis."); return; }
    await run(createAiProvider(token, { ...f, endpoint: f.endpoint || null, cle: f.cle || null }), "Fournisseur ajouté.");
    setForm((s) => ({ ...s, [cap]: emptyForm(cap) }));
  }

  async function tester(p: AiProvider): Promise<void> {
    setBusy(true); setErreur(null); setNote(null);
    try {
      const r = await testAiProvider(token, p.id);
      if (r.ok) setNote(`Test ${p.libelle} : OK. ${r.detail}`);
      else setErreur(`Test ${p.libelle} : échec. ${r.detail}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Test impossible");
    } finally { setBusy(false); }
  }

  const sugg = (cap: "stt" | "llm"): { fournisseur: string; modele: string; note: string }[] =>
    catalogue.data?.suggestions[cap] ?? [];

  function section(cap: "stt" | "llm"): JSX.Element {
    const list = (providers.data ?? []).filter((p) => p.capacite === cap);
    const f = form[cap];
    return (
      <div className="card">
        <h2 className="card-title">{CAP_LABEL[cap]}</h2>
        {list.length === 0 && <p className="muted small">Aucun fournisseur. Ajoutez-en un ci-dessous.</p>}
        {list.map((p) => (
          <div key={p.id} className="list-row" style={{ flexWrap: "wrap", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{p.libelle}</strong>{" "}
              {p.actif && <span className="badge badge-ok">Actif</span>}{" "}
              {p.gratuit && <span className="badge">Gratuit</span>}{" "}
              {p.cle_presente ? <span className="badge badge-ok">Clé posée</span> : <span className="badge badge-dng">Sans clé</span>}
              <div className="muted small mono">{p.fournisseur} · {p.modele}{p.endpoint ? ` · ${p.endpoint}` : ""}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <input type="password" placeholder="Nouvelle clé API (confidentielle)" className="search"
                  value={cleEdit[p.id] ?? ""} onChange={(e) => setCleEdit((s) => ({ ...s, [p.id]: e.target.value }))}
                  style={{ maxWidth: 240 }} />
                <button type="button" className="btn btn-ghost btn-inline" disabled={busy || !(cleEdit[p.id] ?? "").trim()}
                  onClick={() => void run(updateAiProvider(token, p.id, { cle: cleEdit[p.id] }), "Clé enregistrée.").then(() => setCleEdit((s) => ({ ...s, [p.id]: "" })))}>
                  Enregistrer la clé
                </button>
                {p.cle_presente && (
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy}
                    onClick={() => { if (window.confirm(`Révoquer la clé de « ${p.libelle} » ? Le fournisseur ne pourra plus être utilisé tant qu'une nouvelle clé n'est pas posée.`)) void run(updateAiProvider(token, p.id, { cle: "" }), "Clé révoquée."); }}>
                    Révoquer la clé
                  </button>
                )}
              </div>
              {editId === p.id && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input className="search" style={{ maxWidth: 160 }} placeholder="Libellé" value={editDraft.libelle} onChange={(e) => setEditDraft((d) => ({ ...d, libelle: e.target.value }))} />
                  <input className="search" style={{ maxWidth: 160 }} placeholder="Modèle" value={editDraft.modele} onChange={(e) => setEditDraft((d) => ({ ...d, modele: e.target.value }))} />
                  <input className="search" style={{ maxWidth: 200 }} placeholder="Endpoint (facultatif)" value={editDraft.endpoint} onChange={(e) => setEditDraft((d) => ({ ...d, endpoint: e.target.value }))} />
                  <label className="check" style={{ alignItems: "center" }}><input type="checkbox" checked={editDraft.gratuit} onChange={(e) => setEditDraft((d) => ({ ...d, gratuit: e.target.checked }))} /> Gratuit</label>
                  <button type="button" className="btn btn-primary btn-inline" disabled={busy || !editDraft.libelle.trim() || !editDraft.modele.trim()}
                    onClick={() => void run(updateAiProvider(token, p.id, { libelle: editDraft.libelle.trim(), modele: editDraft.modele.trim(), endpoint: editDraft.endpoint.trim() || null, gratuit: editDraft.gratuit }), "Fournisseur modifié.").then(() => setEditId(null))}>Enregistrer</button>
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setEditId(null)}>Annuler</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
              {!p.actif ? (
                <button type="button" className="btn btn-primary btn-inline" disabled={busy}
                  onClick={() => void run(activerAiProvider(token, p.id), `${p.libelle} activé.`)}>Activer</button>
              ) : (
                <button type="button" className="btn btn-ghost btn-inline" disabled={busy}
                  onClick={() => void run(desactiverAiProvider(token, p.id), `${p.libelle} désactivé.`)}>Désactiver</button>
              )}
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy}
                onClick={() => { setEditId(p.id); setEditDraft({ libelle: p.libelle, modele: p.modele, endpoint: p.endpoint ?? "", gratuit: p.gratuit }); }}>Modifier</button>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void tester(p)}>Tester</button>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy}
                onClick={() => { if (window.confirm(`Supprimer « ${p.libelle} » ?`)) void run(deleteAiProvider(token, p.id), "Fournisseur supprimé."); }}>Supprimer</button>
            </div>
          </div>
        ))}

        <div className="form-card" style={{ marginTop: 12 }}>
          <div className="form-grid">
            <label>Libellé
              <input className="search" value={f.libelle} onChange={(e) => setForm((s) => ({ ...s, [cap]: { ...f, libelle: e.target.value } }))} placeholder="Ex: Groq Whisper" />
            </label>
            <label>Fournisseur
              <select className="search" value={f.fournisseur} onChange={(e) => setForm((s) => ({ ...s, [cap]: { ...f, fournisseur: e.target.value } }))}>
                {(catalogue.data?.fournisseurs ?? []).map((fo) => <option key={fo} value={fo}>{fo}</option>)}
              </select>
            </label>
            <label>Modèle
              <input className="search" list={`modeles-${cap}`} value={f.modele} onChange={(e) => setForm((s) => ({ ...s, [cap]: { ...f, modele: e.target.value } }))} placeholder="Ex: whisper-large-v3" />
              <datalist id={`modeles-${cap}`}>
                {sugg(cap).map((sg) => <option key={sg.modele} value={sg.modele}>{sg.fournisseur} - {sg.note}</option>)}
              </datalist>
            </label>
            <label>Clé API (facultatif, confidentielle)
              <input type="password" className="search" value={f.cle ?? ""} onChange={(e) => setForm((s) => ({ ...s, [cap]: { ...f, cle: e.target.value } }))} placeholder="collée ici, jamais réaffichée" />
            </label>
            <label>Endpoint (facultatif, pour Azure ou auto-hébergé)
              <input className="search" value={f.endpoint ?? ""} onChange={(e) => setForm((s) => ({ ...s, [cap]: { ...f, endpoint: e.target.value } }))} placeholder="https://..." />
            </label>
            <label className="check" style={{ alignSelf: "end" }}>
              <input type="checkbox" checked={!!f.gratuit} onChange={(e) => setForm((s) => ({ ...s, [cap]: { ...f, gratuit: e.target.checked } }))} /> Modèle gratuit
            </label>
          </div>
          {(() => {
            const g = catalogue.data?.guides?.[f.fournisseur];
            if (!g) return null;
            return (
              <div className="banner banner-info small" style={{ marginTop: 10, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <strong>{g.libelle}</strong>
                  <span className={`badge ${g.gratuit ? "badge-ok" : "badge-mut"}`}>{g.gratuit ? "Gratuit" : "Payant"}</span>
                </div>
                <p style={{ margin: "0 0 6px" }}>{g.resume}</p>
                <p style={{ margin: "0 0 6px" }}>
                  {g.site && <a href={g.site} target="_blank" rel="noreferrer">Site officiel</a>}
                  {g.compte_url && <> · <a href={g.compte_url} target="_blank" rel="noreferrer">Créer un compte</a></>}
                  {g.cle_url && <> · <a href={g.cle_url} target="_blank" rel="noreferrer">Obtenir la clé API</a></>}
                </p>
                {g.cle_libelle && <p style={{ margin: "0 0 6px" }}>Clé attendue : <strong>{g.cle_libelle}</strong> (c'est une clé d'accès à l'API, pas une cryptomonnaie).</p>}
                {g.params.length > 0 && (
                  <p style={{ margin: "0 0 6px" }}>Paramètre(s) à renseigner en plus de la clé : <span className="mono">{g.params.join(", ")}</span>.</p>
                )}
                <ol style={{ margin: "4px 0 0 18px", padding: 0 }}>
                  {g.etapes.map((e, i) => <li key={i} style={{ marginBottom: 2 }}>{e}</li>)}
                </ol>
              </div>
            );
          })()}
          <div className="form-actions">
            <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void ajouter(cap)}>Ajouter ce fournisseur</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Fournisseurs IA (canal modérateur)</h1>
          <p className="muted">
            Transcription des notes vocales et rédaction professionnelle. Choisissez un fournisseur par capacité, collez sa clé API
            (chiffrée, jamais réaffichée) et activez-le en un clic. La transcription du canal s'active dès qu'un fournisseur STT est
            actif avec une clé. Défaut : Perplexity (rédaction) et Groq Whisper (transcription).
          </p>
        </div>
      </header>

      {note && <p className="banner banner-ok">{note}</p>}
      {erreur && <p className="banner banner-error">{erreur}</p>}
      {providers.error && <p className="banner banner-error">{providers.error}</p>}

      <Tabs
        tabs={[{ id: "stt", label: "Transcription (STT)" }, { id: "llm", label: "Rédaction (LLM)" }]}
        active={tab}
        onChange={(id) => setTab(id as "stt" | "llm")}
      />
      {section(tab)}
    </div>
  );
}
