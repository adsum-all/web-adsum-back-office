import { useState } from "react";

import {
  ApiError,
  type MembreCreateInput,
  createMembre,
  getBergers,
  getCommissions,
  getIntendances,
  getTribus,
} from "../api.js";
import { useResource } from "../useResource.js";

const TYPE_MEMBRE: [string, string][] = [
  ["Membre simple", "membre_simple"],
  ["Nouveau engage", "nouveau_engage"],
  ["Aspirant", "aspirant"],
  ["Engage", "engage"],
  ["Berger", "berger"],
  ["Responsable", "responsable"],
];
const SITUATIONS: [string, string][] = [
  ["Celibataire", "celibataire"],
  ["En couple (cheminement)", "en_couple"],
  ["Fiance", "fiance"],
  ["Marie", "marie"],
  ["Veuf / Veuve", "veuf"],
  ["Divorce", "divorce"],
];
const MARIAGES: [string, string][] = [
  ["Dot", "dot"],
  ["Religieux", "religieux"],
  ["Dot et religieux", "dot_et_religieux"],
  ["Civil", "civil"],
];

interface MembreFormProps {
  token: string;
  onDone: () => void;
  onCancel: () => void;
}

const PAYS = [
  { label: "Cote d'Ivoire", dial: "+225" },
  { label: "France", dial: "+33" },
  { label: "Canada", dial: "+1" },
];
const GENRES: [string, string][] = [["Homme", "homme"], ["Femme", "femme"], ["Autre", "autre"]];
const CHEMINEMENTS: [string, string][] = [
  ["Nouveau", "nouveau"],
  ["En accompagnement", "en_accompagnement"],
  ["Membre actif", "membre_actif"],
  ["Responsable", "responsable"],
  ["A relancer", "a_relancer"],
  ["En pause", "en_pause"],
  ["Ancien membre", "ancien_membre"],
];

const TODAY = new Date().toISOString().slice(0, 10);

export function MembreForm({ token, onDone, onCancel }: MembreFormProps): JSX.Element {
  const commissions = useResource(() => getCommissions(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const bergers = useResource(() => getBergers(token), [token]);
  const tribus = useResource(() => getTribus(token), [token]);
  const [form, setForm] = useState<MembreCreateInput>({
    email: "",
    cheminement_pastoral: "nouveau",
    date_entree: TODAY,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof MembreCreateInput>(key: K, value: MembreCreateInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Given names live in one field but are captured as first name + other names.
  const prenomsParts = (form.prenoms ?? "").trim().split(/\s+/).filter(Boolean);
  const premierPrenom = prenomsParts[0] ?? "";
  const autresPrenoms = prenomsParts.slice(1).join(" ");
  const setPrenoms = (premier: string, autres: string): void =>
    set("prenoms", `${premier} ${autres}`.replace(/\s+/g, " ").trim() || undefined);

  function onPays(label: string): void {
    const dial = PAYS.find((p) => p.label === label)?.dial ?? "";
    setForm((f) => ({
      ...f,
      pays: label || undefined,
      telephone: !f.telephone || PAYS.some((p) => f.telephone === `${p.dial} `) ? `${dial} ` : f.telephone,
    }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: MembreCreateInput = { email: form.email.trim() };
      for (const [key, v] of Object.entries(form)) {
        const k = key as keyof MembreCreateInput;
        if (k === "email") continue;
        if (typeof v === "string" && v.trim()) (payload[k] as string) = v.trim();
        else if (typeof v === "boolean") (payload[k] as boolean) = v;
      }
      await createMembre(token, payload);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <button type="button" className="link" onClick={onCancel}>
            Annuaire
          </button>
          <h1>Ajouter un nouveau membre</h1>
          <p className="muted">Le matricule et le statut administratif sont calcules automatiquement.</p>
        </div>
      </header>

      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Nom de famille *" hint="Nom a l'etat civil. Mis en MAJUSCULES automatiquement.">
            <input value={form.nom ?? ""} onChange={(e) => set("nom", e.target.value)} required placeholder="Ex : LABEL" />
          </Field>
          <Field label="Premier prenom *" hint="Prenom usuel. Casse corrigee automatiquement.">
            <input value={premierPrenom} onChange={(e) => setPrenoms(e.target.value, autresPrenoms)} required placeholder="Ex : Shema" />
          </Field>
          <Field label="Autres prenoms" hint="Autres prenoms separes par des espaces (facultatif).">
            <input value={autresPrenoms} onChange={(e) => setPrenoms(premierPrenom, e.target.value)} placeholder="Ex : Emmanuel" />
          </Field>
          <Field label="Nom de naissance" hint="Pour une femme mariee : nom de jeune fille (facultatif).">
            <input value={form.nom_naissance ?? ""} onChange={(e) => set("nom_naissance", e.target.value || undefined)} placeholder="Facultatif" />
          </Field>
          <Field label="Nom marital" hint="Nom du conjoint utilise a l'etat civil (facultatif).">
            <input value={form.nom_marital ?? ""} onChange={(e) => set("nom_marital", e.target.value || undefined)} placeholder="Facultatif" />
          </Field>
          <Field label="Nom affiche" hint="Quel nom sert d'identite civile affichee.">
            <select value={form.nom_affiche ?? ""} onChange={(e) => set("nom_affiche", e.target.value || undefined)}>
              <option value="">Nom de famille (par defaut)</option>
              <option value="naissance">Nom de naissance</option>
              <option value="marital">Nom marital</option>
            </select>
          </Field>
          <Field label="Berger / Bergere" hint="Cochez si la personne est Berger/Bergere. L'appellation est genree automatiquement.">
            <select value={form.est_berger ? "1" : "0"} onChange={(e) => set("est_berger", e.target.value === "1")}>
              <option value="0">Non</option>
              <option value="1">Oui</option>
            </select>
          </Field>
          <Field label="Nom pastoral" hint="Nom spirituel, ex : David de Jesus. Affiche 'Berger David de Jesus'.">
            <input value={form.nom_pastoral ?? ""} onChange={(e) => set("nom_pastoral", e.target.value || undefined)} placeholder="Ex : David de Jesus" />
          </Field>
          <Field label="Fonction : perimetre" hint="Portee de la fonction, ex : Commission Communication.">
            <input value={form.fonction_perimetre ?? ""} onChange={(e) => set("fonction_perimetre", e.target.value || undefined)} placeholder="Ex : Commission Communication" />
          </Field>
          <Field label="Telephone">
            <input value={form.telephone ?? ""} onChange={(e) => set("telephone", e.target.value)} placeholder="+225..." />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nom@email.com" required />
          </Field>
          <Field label="Genre">
            <select value={form.genre ?? ""} onChange={(e) => set("genre", e.target.value || undefined)}>
              <option value="">Selectionner</option>
              {GENRES.map(([l, v]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Date de naissance">
            <input type="date" value={form.date_naissance ?? ""} onChange={(e) => set("date_naissance", e.target.value || undefined)} />
          </Field>
          <Field label="Pays">
            <select value={form.pays ?? ""} onChange={(e) => onPays(e.target.value)}>
              <option value="">Selectionner</option>
              {PAYS.map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Ville">
            <input value={form.ville ?? ""} onChange={(e) => set("ville", e.target.value)} />
          </Field>
          <Field label="Intendance">
            <select value={form.intendance_id ?? ""} onChange={(e) => set("intendance_id", e.target.value || undefined)}>
              <option value="">Selectionner</option>
              {(intendances.data ?? []).map((i) => (
                <option key={i.id} value={i.id}>{i.nom}</option>
              ))}
            </select>
          </Field>
          <Field label="Commission">
            <select value={form.commission_id ?? ""} onChange={(e) => set("commission_id", e.target.value || undefined)}>
              <option value="">Selectionner</option>
              {(commissions.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </Field>
          <Field label="Berger Referent">
            <select value={form.berger_referent_id ?? ""} onChange={(e) => set("berger_referent_id", e.target.value || undefined)}>
              <option value="">Aucun</option>
              {(bergers.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>
          </Field>
          <Field label="Date d'entree">
            <input type="date" value={form.date_entree ?? ""} onChange={(e) => set("date_entree", e.target.value || undefined)} />
          </Field>
          <Field label="Cheminement Pastoral *">
            <select value={form.cheminement_pastoral ?? "nouveau"} onChange={(e) => set("cheminement_pastoral", e.target.value)}>
              {CHEMINEMENTS.map(([l, v]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Tribu">
            <select value={form.tribu_id ?? ""} onChange={(e) => set("tribu_id", e.target.value || undefined)}>
              <option value="">Selectionner</option>
              {(tribus.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.nom}{t.patriarche ? ` - ${t.patriarche}` : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Niveau d'engagement">
            <select value={form.type_membre ?? "membre_simple"} onChange={(e) => set("type_membre", e.target.value)}>
              {TYPE_MEMBRE.map(([l, v]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Promotion">
            <input value={form.promotion ?? ""} onChange={(e) => set("promotion", e.target.value)} placeholder="Pierre Saint-Paul 1" />
          </Field>
          <Field label="Situation matrimoniale">
            <select value={form.situation_matrimoniale ?? ""} onChange={(e) => set("situation_matrimoniale", e.target.value || undefined)}>
              <option value="">Selectionner</option>
              {SITUATIONS.map(([l, v]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          {form.situation_matrimoniale === "marie" && (
            <Field label="Type de mariage">
              <select value={form.type_mariage ?? ""} onChange={(e) => set("type_mariage", e.target.value || undefined)}>
                <option value="">Selectionner</option>
                {MARIAGES.map(([l, v]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Profession (optionnel)">
            <input value={form.profession ?? ""} onChange={(e) => set("profession", e.target.value)} />
          </Field>
          <Field label="Niveau d'etudes (optionnel)">
            <input value={form.niveau_etudes ?? ""} onChange={(e) => set("niveau_etudes", e.target.value)} />
          </Field>
        </div>
        <fieldset className="sacrements">
          <legend>Sacrements (recommande, optionnel)</legend>
          <label className="check">
            <input type="checkbox" checked={form.baptise ?? false} onChange={(e) => set("baptise", e.target.checked)} />
            Baptise
          </label>
          <label className="check">
            <input type="checkbox" checked={form.confirme ?? false} onChange={(e) => set("confirme", e.target.checked)} />
            Confirme
          </label>
          <label className="check">
            <input type="checkbox" checked={form.premiere_communion ?? false} onChange={(e) => set("premiere_communion", e.target.checked)} />
            Premiere communion
          </label>
        </fieldset>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost btn-inline" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }): JSX.Element {
  return (
    <label title={hint}>
      <span>{label}</span>
      {children}
      {hint && <small style={{ color: "var(--adsum-mut, #6b7280)", fontWeight: 400, fontSize: 11 }}>{hint}</small>}
    </label>
  );
}
