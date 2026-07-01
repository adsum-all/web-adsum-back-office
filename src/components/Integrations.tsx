import QRCode from "qrcode";
import { useEffect, useState } from "react";

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
import { Switch } from "./Switch.js";

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

      <TelegramOnboarding bot={(statut.data?.telegram?.bot as string | null) ?? null} />

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

function TelegramOnboarding({ bot }: { bot: string | null }): JSX.Element | null {
  const [qr, setQr] = useState<string>("");
  const lien = bot ? `https://t.me/${bot}` : "";

  useEffect(() => {
    if (!lien) return;
    void QRCode.toDataURL(lien, { width: 240, margin: 2, color: { dark: "#2a4fad", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [lien]);

  if (!bot) return null;

  return (
    <section className="card">
      <h2 className="card-title">
        Inviter sur Telegram (canal gratuit)
        <InfoTip title="Comment ça marche" text="Telegram exige que chaque personne ouvre le bot et appuie une fois sur Démarrer. Ensuite elle reçoit TOUTES les notifications automatiquement, à vie, sans rien refaire. Partagez ce QR (affiche, réunion, WhatsApp) ou le lien : c'est l'onboarding officiel." />
      </h2>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        {qr && <img src={qr} alt="QR Telegram" style={{ width: 180, height: 180, borderRadius: 12, border: "1px solid var(--adsum-line)" }} />}
        <div style={{ flex: 1, minWidth: 240 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            Partagez ce QR code ou le lien ci-dessous. Chaque membre qui le scanne et appuie sur <b>Démarrer</b> reçoit
            ensuite ses notifications (anniversaires, rappels, codes) automatiquement, sans aucune autre action.
          </p>
          <div className="toolbar">
            <input className="search mono" style={{ flex: 1 }} readOnly value={lien} onFocus={(e) => e.currentTarget.select()} />
            <a className="btn btn-primary btn-inline" href={lien} target="_blank" rel="noreferrer">Ouvrir</a>
            {qr && <a className="btn btn-ghost btn-inline" href={qr} download="adsum-telegram-qr.png">Télécharger le QR</a>}
          </div>
        </div>
      </div>
    </section>
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="muted small" style={{ minWidth: 62, textAlign: "right" }}>{type.actif ? "Activé" : "Désactivé"}</span>
        <Switch checked={type.actif} onChange={() => void toggle()} disabled={busy} label={`Notification ${type.libelle}`} />
      </div>
    </div>
  );
}
