import QRCode from "qrcode";
import { useEffect, useState } from "react";

import {
  type CanalStatut,
  type EchecNotification,
  type IntegrationItem,
  type TypeNotification,
  getCanauxStatut,
  getEchecsNotification,
  getIntegrations,
  getTypesNotification,
  resoudreEchecNotification,
  setIntegration,
  toggleTypeNotification,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";
import { Switch } from "./Switch.js";
import { Tabs } from "./Tabs.js";

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
  const echecs = useResource(() => getEchecsNotification(token), [token]);
  const [note, setNote] = useState<string | null>(null);
  const [tab, setTab] = useState<"canaux" | "jetons" | "signatures" | "auto" | "echecs">("canaux");
  const ouverts = echecs.data?.ouverts ?? 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Intégrations & aide</h1>
          <p className="muted">Canaux de notification, jetons d'accès (rotation en cas de fuite) et activation des messages automatiques.</p>
        </div>
      </header>

      {note && <p className="banner banner-ok">{note}</p>}

      <Tabs
        tabs={[
          { id: "canaux", label: "Canaux" },
          { id: "jetons", label: "Jetons d'accès" },
          { id: "signatures", label: "Signatures" },
          { id: "auto", label: "Messages automatiques" },
          { id: "echecs", label: ouverts > 0 ? `Échecs (${ouverts})` : "Échecs" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {tab === "canaux" && (
      <>
      <TelegramOnboarding bot={(statut.data?.telegram?.bot as string | null) ?? null} />

      <section className="card">
        <h2 className="card-title">
          État des canaux
          <InfoTip title="Canaux" text="Les canaux par lesquels un membre peut recevoir ses notifications. In-app et e-mail sont toujours proposés ; Telegram est gratuit ; WhatsApp et SMS sont payants et optionnels." />
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(statut.data ?? {}).map(([cle, s]: [string, CanalStatut]) => (
            <CanalRow key={cle} cle={cle} statut={s} token={token} onChanged={() => statut.reload()} />
          ))}
        </div>
      </section>
      </>
      )}

      {tab === "jetons" && (
      <section className="card">
        <h2 className="card-title">
          Jetons d'accès
          <InfoTip title="Sécurité" text="Ces jetons autorisent l'envoi des notifications. En cas de fuite ou d'intrusion, remplacez-les ici : l'ancien jeton cesse aussitôt de fonctionner. Les valeurs sont masquées." />
        </h2>
        {(integrations.data ?? [])
          .filter((it) => !it.cle.startsWith("signature") && it.cle !== "site_officiel")
          .map((it) => (
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
      )}

      {tab === "signatures" && (
      <section className="card">
        <h2 className="card-title">
          Signatures des messages
          <InfoTip title="Signatures" text="Chaque famille de messages peut être signée par une autorité (Le Modérateur, Le Collège des Bergers, L'Administration...). Une famille laissée vide utilise la signature globale. Le sondage de pointage utilise la signature « convocation »." />
        </h2>
        {(integrations.data ?? [])
          .filter((it) => it.cle.startsWith("signature") || it.cle === "site_officiel")
          .map((it) => (
            <SignatureRow
              key={it.cle}
              item={it}
              token={token}
              onSaved={() => {
                integrations.reload();
                setNote("Signature enregistrée.");
              }}
            />
          ))}
      </section>
      )}

      {tab === "auto" && (
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
      )}

      {tab === "echecs" && (
      <section className="card">
        <h2 className="card-title">
          Échecs de livraison
          {(echecs.data?.ouverts ?? 0) > 0 && (
            <span className="badge badge-dng" style={{ marginLeft: 8 }}>{echecs.data?.ouverts}</span>
          )}
          <InfoTip title="Livraison" text="Les envois de notifications qui n'ont pas abouti (e-mail refusé, Telegram ou WhatsApp injoignable). Contactez le membre puis marquez l'échec comme traité pour le retirer de la liste. Les envois in-app n'échouent jamais." />
        </h2>
        {(echecs.data?.echecs ?? []).length === 0 ? (
          <p className="muted small">Aucun échec de livraison à traiter.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(echecs.data?.echecs ?? []).map((e: EchecNotification) => (
              <EchecRow key={e.id} echec={e} token={token} onChanged={() => echecs.reload()} />
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

function EchecRow({ echec, token, onChanged }: { echec: EchecNotification; token: string; onChanged: () => void }): JSX.Element {
  const [busy, setBusy] = useState(false);
  const quand = echec.cree_le ? new Date(echec.cree_le).toLocaleString("fr-FR") : "";
  async function resoudre(): Promise<void> {
    setBusy(true);
    try {
      await resoudreEchecNotification(token, echec.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--adsum-line)" }}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ fontSize: 13 }}>{echec.membre ?? "Membre inconnu"}</strong>
        <span className="muted small" style={{ marginLeft: 8 }}>{CANAL_LABEL[echec.canal] ?? echec.canal} . {echec.type_cle}</span>
        <div className="muted small" style={{ marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {quand}{echec.detail ? ` . ${echec.detail}` : ""}
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void resoudre()}>
        Marquer traité
      </button>
    </div>
  );
}

function CanalRow({ cle, statut, token, onChanged }: { cle: string; statut: CanalStatut; token: string; onChanged: () => void }): JSX.Element {
  const [busy, setBusy] = useState(false);
  const autorise = statut.autorise !== false;
  async function toggle(): Promise<void> {
    setBusy(true);
    try {
      await setIntegration(token, `canal_${cle}`, autorise ? "off" : "on");
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="list-row">
      <div className="event-main">
        <strong>
          {CANAL_LABEL[cle] ?? cle}
          {statut.note && <InfoTip text={statut.note} />}
        </strong>
        <span className="muted small">
          {statut.provider ? `Fournisseur : ${statut.provider}. ` : ""}
          {statut.bot ? `Bot : @${statut.bot}. ` : ""}
          {statut.gratuit === true ? "Gratuit." : statut.gratuit === false ? "Payant." : ""}
          {statut.actif ? "Configure." : "Non configure."}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {statut.verrouille ? (
          <span className="badge badge-ok">Toujours actif</span>
        ) : (
          <>
            <span className="muted small" style={{ minWidth: 58, textAlign: "right" }}>{autorise ? "Activé" : "Désactivé"}</span>
            <Switch checked={autorise} onChange={() => void toggle()} disabled={busy} label={`Canal ${CANAL_LABEL[cle] ?? cle}`} />
          </>
        )}
      </div>
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

function SignatureRow({ item, token, onSaved }: { item: IntegrationItem; token: string; onSaved: () => void }): JSX.Element {
  const [value, setValue] = useState(item.valeur_masquee ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = value.trim() !== (item.valeur_masquee ?? "").trim();
  async function save(): Promise<void> {
    setBusy(true);
    try {
      await setIntegration(token, item.cle, value.trim());
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--adsum-line)" }}>
      <div className="event-main" style={{ marginBottom: 6 }}>
        <strong>
          {item.guide.titre ?? item.cle}
          {item.guide.aide && <InfoTip text={item.guide.aide} />}
          {item.guide.roter && <InfoTip title="Exemples" text={item.guide.roter} />}
        </strong>
      </div>
      {(item.suggestions ?? []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {(item.suggestions ?? []).map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-inline ${value.trim() === s ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setValue(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="toolbar">
        <input
          className="search"
          style={{ flex: 1 }}
          placeholder={item.cle === "site_officiel" ? "URL du site (facultatif)" : "Signature (vide = signature globale)"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || !dirty} onClick={() => void save()}>
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function TypeRow({ type, token, onChanged }: { type: TypeNotification; token: string; onChanged: () => void }): JSX.Element {
  const [busy, setBusy] = useState(false);
  // A critical security type is always delivered by the engine; it cannot be
  // turned off, so the switch is locked and a badge states it plainly.
  const critique = type.sensibilite === "critique";
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
        {critique ? (
          <span className="badge badge-ok">Toujours actif</span>
        ) : (
          <>
            <span className="muted small" style={{ minWidth: 62, textAlign: "right" }}>{type.actif ? "Activé" : "Désactivé"}</span>
            <Switch checked={type.actif} onChange={() => void toggle()} disabled={busy} label={`Notification ${type.libelle}`} />
          </>
        )}
      </div>
    </div>
  );
}
