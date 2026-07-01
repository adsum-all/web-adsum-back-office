import { useState } from "react";

import {
  type CanalStatut,
  type IntegrationItem,
  type TypeNotification,
  getCanauxStatut,
  getIntegrations,
  getTypesNotification,
  setIntegration,
  toggleTypeNotification,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

const CANAL_LABEL: Record<string, string> = {
  in_app: "Notifications in-app",
  email: "E-mail",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

export function Integrations({ token }: { token: string }): JSX.Element {
  const statut = useResource(() => getCanauxStatut(token), [token]);
  const integrations = useResource(() => getIntegrations(token), [token]);
  const types = useResource(() => getTypesNotification(token), [token]);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Intégrations & aide</h1>
          <p className="muted">Canaux de notification, jetons d'accès (rotation en cas de fuite) et activation des messages automatiques.</p>
        </div>
      </header>

      {note && <p className="banner banner-ok">{note}</p>}

      <section className="card">
        <h2 className="card-title">
          État des canaux
          <InfoTip title="Canaux" text="Les canaux par lesquels un membre peut recevoir ses notifications. In-app et e-mail sont toujours proposés ; Telegram est gratuit ; WhatsApp et SMS sont payants et optionnels." />
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(statut.data ?? {}).map(([cle, s]: [string, CanalStatut]) => (
            <div key={cle} className="list-row">
              <div className="event-main">
                <strong>
                  {CANAL_LABEL[cle] ?? cle}
                  {s.note && <InfoTip text={s.note} />}
                </strong>
                <span className="muted small">
                  {s.provider ? `Fournisseur : ${s.provider}. ` : ""}
                  {s.bot ? `Bot : @${s.bot}. ` : ""}
                  {s.gratuit === true ? "Gratuit." : s.gratuit === false ? "Payant." : ""}
                </span>
              </div>
              <span className={`badge ${s.actif ? "badge-ok" : "badge-mut"}`}>{s.actif ? "Actif" : "Inactif"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">
          Jetons d'accès
          <InfoTip title="Sécurité" text="Ces jetons autorisent l'envoi des notifications. En cas de fuite ou d'intrusion, remplacez-les ici : l'ancien jeton cesse aussitôt de fonctionner. Les valeurs sont masquées." />
        </h2>
        {(integrations.data ?? []).map((it) => (
          <TokenRow
            key={it.cle}
            item={it}
            onSaved={() => {
              integrations.reload();
              statut.reload();
              setNote("Jeton mis à jour. L'ancien est désormais inactif.");
            }}
            token={token}
          />
        ))}
      </section>

      <section className="card">
        <h2 className="card-title">
          Messages automatiques
          <InfoTip title="Catalogue" text="Activez ou désactivez chaque type de notification. Les messages critiques (codes, décisions) restent toujours actifs pour le bon fonctionnement." />
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(types.data ?? []).map((t: TypeNotification) => (
            <TypeRow key={t.cle} type={t} token={token} onChanged={() => types.reload()} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TokenRow({ item, token, onSaved }: { item: IntegrationItem; token: string; onSaved: () => void }): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(): Promise<void> {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await setIntegration(token, item.cle, value.trim());
      setEditing(false);
      setValue("");
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--adsum-line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="event-main">
          <strong>
            {item.guide.titre ?? item.cle}
            {item.guide.aide && <InfoTip text={item.guide.aide} />}
            {item.guide.roter && <InfoTip title="Comment changer / roter" text={item.guide.roter} />}
            {item.guide.obtenir && <InfoTip title="Où l'obtenir" text={item.guide.obtenir} />}
          </strong>
          <span className="muted small mono">{item.renseigne ? item.valeur_masquee : "Non renseigné"}</span>
        </div>
        {!editing ? (
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEditing(true)}>
            {item.renseigne ? "Remplacer" : "Renseigner"}
          </button>
        ) : (
          <div className="toolbar" style={{ flex: 1, minWidth: 240 }}>
            <input className="search" style={{ flex: 1 }} placeholder="Nouvelle valeur" value={value} onChange={(e) => setValue(e.target.value)} />
            <button type="button" className="btn btn-primary btn-inline" disabled={busy || !value.trim()} onClick={() => void save()}>
              Enregistrer
            </button>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TypeRow({ type, token, onChanged }: { type: TypeNotification; token: string; onChanged: () => void }): JSX.Element {
  const [busy, setBusy] = useState(false);
  async function toggle(): Promise<void> {
    setBusy(true);
    try {
      await toggleTypeNotification(token, type.cle, !type.actif);
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--adsum-line)" }}>
      <div>
        <strong style={{ fontSize: 13.5 }}>{type.libelle}</strong>
        <span className="muted small" style={{ marginLeft: 8 }}>{type.categorie}{type.scheduled ? " . planifié" : ""}</span>
      </div>
      <button
        type="button"
        className={`pill ${type.actif ? "pill-on" : "pill-off"}`}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {type.actif ? "Actif" : "Désactivé"}
      </button>
    </div>
  );
}
