import { useMemo, useRef, useState } from "react";

import { ApiError, type MembresLotResult, creerMembresLot } from "../api.js";

// Downloadable import template: the exact columns the batch parser accepts
// (e-mail required; first names and family name optional), with a short guide
// row. Kept as CSV so Excel, LibreOffice and Google Sheets all open it natively.
const MODELE_CSV = [
  "email;prenoms;nom",
  "exemple.a.remplacer@example.com;Prenoms;NOM",
  ";;",
  "Guide : la colonne email est OBLIGATOIRE et unique. prenoms et nom sont facultatifs;;",
  "La ligne 2 est un EXEMPLE au format attendu : remplacez-la par vos membres reels.;;",
  "Enregistrez ce fichier en CSV puis importez-le ci-dessous ou copiez-collez les lignes.;;",
].join("\r\n");

function telechargerModele(): void {
  const blob = new Blob(["﻿" + MODELE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-import-membres-adsum.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface Ligne {
  email: string;
  prenoms?: string;
  nom?: string;
}

// One member per line: "email", or "email; prénoms; nom" (';' or ',' or tab).
// Header rows, guide rows and the template's example placeholder are silently
// skipped so importing the downloaded model never creates a fake account.
function parseLignes(texte: string): Ligne[] {
  const out: Ligne[] = [];
  for (const brut of texte.split(/\r?\n/)) {
    const ligne = brut.trim();
    if (!ligne) continue;
    const parts = ligne.split(/[;,\t]/).map((p) => p.trim());
    const email = parts[0]?.toLowerCase();
    if (!email || !email.includes("@") || email.endsWith("@example.com")) continue;
    out.push({ email, prenoms: parts[1] || undefined, nom: parts[2] || undefined });
  }
  return out;
}

/**
 * "Créer des comptes en masse" tab: register several members at once. Each valid
 * line becomes a member registration (temp password sent). Duplicate e-mails are
 * skipped and reported, never a hard failure, so one bad row never aborts the batch.
 */
export function CreerComptesMasse({ token, onCreated }: { token: string; onCreated?: () => void }): JSX.Element {
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<MembresLotResult | null>(null);
  const fichierRef = useRef<HTMLInputElement | null>(null);

  const lignes = useMemo(() => parseLignes(texte), [texte]);

  // Read an uploaded CSV/TXT (e.g. the downloaded template filled in Excel and
  // saved as CSV) into the textarea, through the SAME parser as manual paste:
  // one single code path, no duplicated business logic.
  function chargerFichier(f: File | undefined): void {
    if (!f) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const contenu = typeof reader.result === "string" ? reader.result : "";
      setTexte((t) => (t.trim() ? t + "\n" + contenu : contenu));
      if (fichierRef.current) fichierRef.current.value = "";
    };
    reader.onerror = () => setError("Lecture du fichier impossible : vérifiez qu'il s'agit bien d'un CSV ou TXT.");
    reader.readAsText(f, "utf-8");
  }

  async function submit(): Promise<void> {
    if (lignes.length === 0) {
      setError("Saisissez au moins une adresse e-mail (une par ligne).");
      return;
    }
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const r = await creerMembresLot(token, lignes);
      setRes(r);
      if (r.crees > 0) {
        setTexte("");
        onCreated?.();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">Créer des comptes en masse</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Une personne par ligne. Formats acceptés : <span className="mono">email</span> ou{" "}
        <span className="mono">email; prénoms; nom</span>. Chaque personne reçoit un accès temporaire et apparaît
        dans « Inscriptions en cours ». Une même adresse e-mail n&apos;est jamais créée deux fois. Vous pouvez aussi
        copier-coller directement des colonnes depuis Excel (tabulations acceptées) ou importer un fichier CSV.
      </p>
      <div className="toolbar" style={{ marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost btn-inline" onClick={telechargerModele}>
          Télécharger le modèle CSV
        </button>
        <label className="btn btn-ghost btn-inline" style={{ cursor: "pointer" }}>
          Importer un fichier CSV/TXT
          <input
            ref={fichierRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            style={{ display: "none" }}
            onChange={(e) => chargerFichier(e.target.files?.[0])}
          />
        </label>
      </div>
      <textarea
        className="textarea"
        rows={8}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder={"jean.dupont@example.com\nmarie.koffi@example.com; Marie; KOFFI"}
      />
      <p className="muted small">{lignes.length} ligne{lignes.length > 1 ? "s" : ""} détectée{lignes.length > 1 ? "s" : ""}.</p>
      {error && <p className="banner banner-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || lignes.length === 0} onClick={() => void submit()}>
          {busy ? "Création..." : `Créer ${lignes.length || ""} compte${lignes.length > 1 ? "s" : ""}`}
        </button>
      </div>

      {res && (
        <div style={{ marginTop: 12 }}>
          <p className="banner banner-ok">{res.crees} compte{res.crees > 1 ? "s" : ""} créé{res.crees > 1 ? "s" : ""} et accès envoyé.</p>
          {res.doublons.length > 0 && (
            <p className="banner banner-warn">
              {res.doublons.length} doublon{res.doublons.length > 1 ? "s" : ""} ignoré{res.doublons.length > 1 ? "s" : ""} : {res.doublons.join(", ")}
            </p>
          )}
          {res.erreurs.length > 0 && (
            <div className="banner banner-error">
              {res.erreurs.length} erreur{res.erreurs.length > 1 ? "s" : ""} :
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {res.erreurs.map((e) => (
                  <li key={e.email} className="small">{e.email} : {e.raison}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
