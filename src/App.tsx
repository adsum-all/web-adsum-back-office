import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BoutonAide, ClientAide } from "@adsum/ui-web";

import { API_BASE, type Session, getMyPermissions, getMesPreferences, logoutSession } from "./api.js";
import { type RaisonFin, messageFinDeSession, surFinDeSession } from "./lib/sessionExpiree.js";
import { applyTheme, saveTheme } from "./lib/theme.js";
import { useMarque } from "./lib/useMarque.js";
import { Commissions } from "./components/Commissions.js";
import { ComptageVoletB } from "./components/ComptageVoletB.js";
import { Consentements } from "./components/Consentements.js";
import { Dashboard } from "./components/Dashboard.js";
import { DemandesAdmin } from "./components/DemandesAdmin.js";
import { EngagementAdmin } from "./components/EngagementAdmin.js";
import { Doublons } from "./components/Doublons.js";
import { Fonctions } from "./components/Fonctions.js";
import { Niveaux } from "./components/Niveaux.js";
import { Inscriptions } from "./components/Inscriptions.js";
import { Evenements } from "./components/Evenements.js";
import { TypesEvenements } from "./components/TypesEvenements.js";
import { JournalAudit } from "./components/JournalAudit.js";
import { Login } from "./components/Login.js";
import { Anniversaires } from "./components/Anniversaires.js";
import { Attestations } from "./components/Attestations.js";
import { Integrations } from "./components/Integrations.js";
import { Membres } from "./components/Membres.js";
import { ReglagesIA } from "./components/ReglagesIA.js";
import { ParticipationStats } from "./components/ParticipationStats.js";
import { Organisation } from "./components/Organisation.js";
import { CentreDiffusion } from "./components/CentreDiffusion.js";
import { IdentiteInstitutionnelle } from "./components/IdentiteInstitutionnelle.js";
import { InformationsAdmin } from "./components/InformationsAdmin.js";
import { RetentionArchivage } from "./components/RetentionArchivage.js";
import { Organigramme } from "./components/Organigramme.js";
import { EquipesSpeciales } from "./components/EquipesSpeciales.js";
import { GouvernanceTransverse } from "./components/GouvernanceTransverse.js";
import { Statistiques } from "./components/Statistiques.js";
import { Terminaux } from "./components/Terminaux.js";
import { GouvernanceAcces } from "./components/GouvernanceAcces.js";
import { Utilisateurs } from "./components/Utilisateurs.js";
import { MatricePermissions } from "./components/MatricePermissions.js";
import { ProfilMenu } from "./components/ProfilMenu.js";
import { ProfilPage } from "./components/ProfilPage.js";
import { roleLabel } from "./components/utilisateursShared.js";
import { EspacesCollab } from "./components/EspacesCollab.js";
import { FormulairePointage } from "./components/FormulairePointage.js";
import { FournisseursEmail } from "./components/FournisseursEmail.js";
import { TechnicalAdmins } from "./components/TechnicalAdmins.js";

type Section =
  | "dashboard"
  | "statistiques"
  | "participation"
  | "inscriptions"
  | "engagement"
  | "demandes"
  | "membres"
  | "doublons"
  | "commissions"
  | "fonctions"
  | "niveaux"
  | "organisation"
  | "organigramme"
  | "equipes-speciales"
  | "supervision-tribus"
  | "informations"
  | "centre-diffusion"
  | "retention"
  | "identite-institutionnelle"
  | "evenements"
  | "types-evenements"
  | "anniversaires"
  | "comptage"
  | "utilisateurs"
  | "gouvernance-acces"
  | "permissions"
  | "espaces-collab"
  | "technical-admins"
  | "terminaux"
  | "integrations"
  | "fournisseurs-email"
  | "formulaire-pointage"
  | "reglages-ia"
  | "consentements"
  | "attestations"
  | "audit"
  | "profil";

// Each section is shown only to an account that holds its permission. The key is
// the read/consult permission the section's primary endpoint requires, so the
// menu mirrors what the server would allow. The menu is never the barrier: every
// endpoint stays guarded server side by require_permission.
export const NAV: { id: Section; label: string; group: string; perm: string }[] = [
  { id: "dashboard", label: "Tableau de bord", group: "PILOTAGE", perm: "statistiques.consulter" },
  { id: "statistiques", label: "Statistiques", group: "PILOTAGE", perm: "statistiques.consulter" },
  { id: "participation", label: "Participation & assiduité", group: "PILOTAGE", perm: "participation.consulter" },
  { id: "inscriptions", label: "Inscriptions à valider", group: "MEMBRES", perm: "inscriptions.gerer" },
  { id: "engagement", label: "Engagement (invitations)", group: "MEMBRES", perm: "inscriptions.gerer" },
  { id: "demandes", label: "Demandes des membres", group: "MEMBRES", perm: "demandes.superviser" },
  { id: "membres", label: "Annuaire des membres", group: "MEMBRES", perm: "membres.gerer" },
  { id: "doublons", label: "Détection de doublons", group: "MEMBRES", perm: "doublons.consulter" },
  { id: "commissions", label: "Commissions & missions", group: "ORGANISATION", perm: "commissions.consulter" },
  { id: "fonctions", label: "Titres et fonctions", group: "ORGANISATION", perm: "fonctions.consulter" },
  { id: "niveaux", label: "Niveaux d'engagement", group: "ORGANISATION", perm: "niveaux-engagement.consulter" },
  { id: "organisation", label: "Coordinations & intendances", group: "ORGANISATION", perm: "organisation.consulter" },
  { id: "organigramme", label: "Organigramme hiérarchique", group: "ORGANISATION", perm: "organisation.consulter" },
  { id: "equipes-speciales", label: "Équipes spéciales", group: "ORGANISATION", perm: "organisation.equipes" },
  { id: "supervision-tribus", label: "Supervision & équipe dirigeante", group: "ORGANISATION", perm: "organisation.supervision" },
  { id: "informations", label: "Informations importantes", group: "COMMUNICATION", perm: "informations.consulter" },
  { id: "centre-diffusion", label: "Centre de diffusion", group: "COMMUNICATION", perm: "informations.consulter" },
  { id: "retention", label: "Rétention et archivage", group: "COMMUNICATION", perm: "parametres.consulter" },
  { id: "evenements", label: "Calendrier des événements", group: "ÉVÉNEMENTS", perm: "evenements.consulter" },
  { id: "formulaire-pointage", label: "Formulaire de pointage", group: "ÉVÉNEMENTS", perm: "evenements.gerer" },
  { id: "types-evenements", label: "Types d'événements", group: "ÉVÉNEMENTS", perm: "evenements.consulter" },
  { id: "anniversaires", label: "Souhaits d'anniversaire", group: "ÉVÉNEMENTS", perm: "anniversaires.gerer" },
  { id: "comptage", label: "Comptage volet B", group: "ÉVÉNEMENTS", perm: "comptage.superviser" },
  { id: "gouvernance-acces", label: "Gouvernance des accès", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "utilisateurs", label: "Accès & groupes", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "permissions", label: "Matrice des permissions", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "espaces-collab", label: "Espaces collaboration", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "technical-admins", label: "Super-admins techniques", group: "SYSTÈME", perm: "acces.systeme" },
  { id: "terminaux", label: "Terminaux de scan", group: "SYSTÈME", perm: "terminaux.consulter" },
  { id: "integrations", label: "Intégrations & aide", group: "SYSTÈME", perm: "integrations.superviser" },
  { id: "reglages-ia", label: "Fournisseurs IA (transcription)", group: "SYSTÈME", perm: "integrations.administrer" },
  { id: "fournisseurs-email", label: "Fournisseur d'envoi des e-mails", group: "SYSTÈME", perm: "integrations.administrer" },
  { id: "identite-institutionnelle", label: "Identité institutionnelle", group: "SYSTÈME", perm: "parametres.consulter" },
  { id: "consentements", label: "Documents & consentements", group: "SYSTÈME", perm: "consentements.consulter" },
  { id: "attestations", label: "Attestations & pays", group: "SYSTÈME", perm: "attestations.gerer" },
  { id: "audit", label: "Journal d'audit", group: "SYSTÈME", perm: "audit.administrer" },
];

// The active section is carried in the URL hash (e.g. #/membres) so a browser refresh
// or a shared link lands back on the SAME section instead of the dashboard. No router
// library is added: the hash is the single source of truth, validated against NAV.
export const SECTION_IDS = new Set<string>([
  "dashboard", "statistiques", "participation", "inscriptions", "engagement", "demandes",
  "membres", "doublons", "commissions", "fonctions", "niveaux", "organisation", "organigramme",
  "equipes-speciales", "supervision-tribus", "informations", "centre-diffusion", "retention", "evenements",
  "types-evenements", "formulaire-pointage", "anniversaires", "comptage", "gouvernance-acces", "utilisateurs", "permissions", "espaces-collab", "terminaux",
  "integrations", "reglages-ia", "fournisseurs-email", "identite-institutionnelle", "consentements", "attestations", "audit", "technical-admins",
  "profil",
]);
function sectionFromHash(): Section | null {
  if (typeof window === "undefined") return null;
  const raw = (window.location.hash.replace(/^#\/?/, "").split("?")[0] ?? "").trim();
  return raw && SECTION_IDS.has(raw) ? (raw as Section) : null;
}

// Persisted admin session: a refresh no longer signs the administrator out.
const SESSION_KEY = "adsum.bo.session";
function loadSession(): Session | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function saveSession(s: Session | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode: session stays in memory only. */
  }
}

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [section, setSection] = useState<Section>(() => sectionFromHash() ?? "dashboard");

  // Le jeton passe par une reference plutot que par une fermeture : il change au
  // renouvellement de session, et un client construit autour de l ancien echouerait
  // sur chaque appel suivant sans que rien ne le dise.
  const jetonCourant = useRef<string>("");
  const aide = useRef(
    new ClientAide({
      api: API_BASE,
      application: "back-office",
      jeton: () => jetonCourant.current,
    }),
  ).current;

  useEffect(() => {
    jetonCourant.current = session?.token ?? "";
  }, [session?.token]);
  // Why the last session ended, shown on the sign-in screen so the return is
  // explained. Cleared as soon as somebody signs in again.
  const [finDeSession, setFinDeSession] = useState<RaisonFin | null>(null);
  const marque = useMarque();

  // Navigate by writing the hash; a hashchange (link, back/forward, refresh) syncs state
  // back, so the URL and the visible section never drift apart.
  const go = useCallback((id: Section) => {
    setSection(id);
    if (typeof window !== "undefined") window.location.hash = `#/${id}`;
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onHash = (): void => {
      const s = sectionFromHash();
      if (s) setSection(s);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const onAuth = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
    setFinDeSession(null);
  }, []);

  // The server said the session is over. Until now every screen showed this as a red
  // "Session expirée" banner and left the administrator on a page that no longer
  // worked, which several people reported as a defect. An expired session is an
  // ordinary event, and its ordinary answer is the sign-in screen.
  useEffect(() => surFinDeSession((raison) => {
    saveSession(null);
    setSession(null);
    setFinDeSession(raison);
  }), []);
  const deconnexion = useCallback(() => {
    if (session?.token) void logoutSession(session.token).catch(() => undefined);
    saveSession(null);
    setSession(null);
  }, [session]);

  // Always refresh the effective permissions on load (once per token). Permissions are
  // cached inside the persisted session so the menu renders instantly on a refresh, but
  // the cache must never win over the server: a permission granted (or revoked) server
  // side has to propagate on the next load WITHOUT forcing a fresh sign-in. So we always
  // refetch in the background and update the cache only when the set actually changed.
  // Without this, a session persisted before a permission was granted keeps a stale menu
  // forever, hiding sections the account is in fact allowed to see.
  useEffect(() => {
    if (!session) return undefined;
    const token = session.token;
    const avaitPerms = session.permissions !== undefined;
    const actuel = session.permissions ?? [];
    let cancelled = false;
    void getMyPermissions(token)
      .then((p) => {
        if (cancelled) return;
        const suivant = p.permissions;
        const identique = actuel.length === suivant.length && suivant.every((x) => actuel.includes(x));
        if (identique && avaitPerms) return;
        // Persist first, then update state: a plain sequence (never a side effect inside
        // the state updater, which React may run more than once and would leave the cache
        // out of sync with the committed state).
        const hydrated: Session = { ...session, permissions: suivant };
        saveSession(hydrated);
        setSession(hydrated);
      })
      .catch(() => {
        // On the initial load (no cached permissions) an invalid token signs out rather
        // than show an empty menu. With a cached menu a transient failure keeps the last
        // known menu instead of logging the administrator out.
        if (!cancelled && !avaitPerms) {
          saveSession(null);
          setSession(null);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  // Apply the account's server-side theme on load, so the choice follows the account
  // across browsers and devices (localStorage only gives an instant, per-browser apply).
  useEffect(() => {
    if (!session) return;
    let alive = true;
    void getMesPreferences(session.token)
      .then((p) => {
        if (!alive) return;
        if (p.theme === "light" || p.theme === "dark" || p.theme === "system") {
          applyTheme(p.theme);
          saveTheme(p.theme);
        }
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [session?.token]);

  const held = useMemo(() => new Set(session?.permissions ?? []), [session]);
  const visibleNav = useMemo(() => NAV.filter((n) => held.has(n.perm)), [held]);

  // Keep the URL hash aligned with the section actually shown: if the hash targets a
  // section the account cannot see (deny-by-default falls back to the first visible one)
  // or is empty, rewrite it so a further refresh is stable and never lands elsewhere.
  useEffect(() => {
    if (!session || session.permissions === undefined) return;
    // "profil" is a permission-free account page reachable from the top bar and the
    // sidebar; it is not part of the permission-gated NAV, so never realign away from it.
    if (section === "profil") return;
    const first = visibleNav[0];
    if (!first) return;
    const shown = visibleNav.find((n) => n.id === section)?.id ?? first.id;
    if (shown !== section) setSection(shown);
    if (typeof window !== "undefined" && sectionFromHash() !== shown) {
      window.location.hash = `#/${shown}`;
    }
  }, [session, visibleNav, section]);

  if (!session) {
    return <Login onAuth={onAuth} avis={finDeSession ? messageFinDeSession(finDeSession) : undefined} />;
  }
  if (session.permissions === undefined) {
    return <div className="auth"><p className="muted">Chargement de la session...</p></div>;
  }

  const groups = Array.from(new Set(visibleNav.map((n) => n.group)));
  const onProfil = section === "profil";
  // Deny-by-default: only ever land on a section the account may see (except the
  // permission-free profile page, handled separately below).
  const current = onProfil ? null : (visibleNav.find((n) => n.id === section) ?? visibleNav[0]);
  const activeId: Section = onProfil ? "profil" : (current?.id ?? "dashboard");
  const crumb = onProfil ? "MON COMPTE" : current?.group;
  const titre = onProfil ? "Mon profil" : current?.label;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            {marque.initiale}
          </span>
          <span className="brand-text">
            {marque.marque}
            <span className="brand-sub">Back-office</span>
          </span>
        </div>
        <nav>
          {groups.map((group) => (
            <div key={group} className="nav-group">
              <p className="nav-group-title">{group}</p>
              {visibleNav
                .filter((n) => n.group === group)
                .map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`nav-item ${activeId === n.id ? "nav-item-active" : ""}`}
                    onClick={() => go(n.id)}
                  >
                    {n.label}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className={`link link-strong nav-profil-foot${onProfil ? " is-active" : ""}`} onClick={() => go("profil")}>
            Mon profil
          </button>
          <span className="muted small">{roleLabel(session.role)}</span>
          <button type="button" className="link" onClick={deconnexion}>
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar-app">
          <div className="topbar-title">
            <p className="topbar-crumb">{crumb}</p>
            <h1 className="topbar-h1">{titre}</h1>
          </div>
          <label className="search-global">
            <span className="search-ico" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              placeholder="Rechercher un membre, un événement..."
              aria-label="Recherche globale"
            />
          </label>
          <span className="event-chip" title="Événement actif">
            <span className="event-dot" aria-hidden="true" />
            Aucun événement actif
          </span>
          {/* La cle d ecran est l identifiant de section que l application valide
              deja, jamais le libelle affiche : une ancre ecrite contre un libelle
              casse le jour ou il est traduit, et le tiroir s ouvre alors vide. */}
          <BoutonAide client={aide} cleEcran={`back-office.${activeId}`} />
          <ProfilMenu token={session.token} onLogout={deconnexion} onOpenProfil={() => go("profil")} />
        </header>
        <div className="main-scroll">
          {activeId === "profil" && <ProfilPage token={session.token} onLogout={deconnexion} />}
          {activeId === "dashboard" && <Dashboard token={session.token} />}
          {activeId === "statistiques" && <Statistiques token={session.token} />}
          {activeId === "participation" && <ParticipationStats token={session.token} />}
          {activeId === "inscriptions" && <Inscriptions token={session.token} />}
          {activeId === "engagement" && <EngagementAdmin token={session.token} />}
          {activeId === "demandes" && <DemandesAdmin token={session.token} canGerer={held.has("demandes.gerer")} />}
          {activeId === "membres" && (
            <Membres
              token={session.token}
              canAdministrer={held.has("membres.administrer")}
              canAccesAdmin={held.has("acces.administrer")}
            />
          )}
          {activeId === "doublons" && (
            <Doublons
              token={session.token}
              canStatuer={held.has("doublons.gerer")}
              canScanner={held.has("doublons.administrer")}
            />
          )}
          {activeId === "commissions" && (
            <Commissions
              token={session.token}
              canCreerCommission={held.has("commissions.administrer")}
              canGererOrg={held.has("organisation.administrer")}
            />
          )}
          {activeId === "fonctions" && <Fonctions token={session.token} canGerer={held.has("fonctions.gerer")} />}
          {activeId === "niveaux" && <Niveaux token={session.token} canGerer={held.has("niveaux-engagement.gerer")} />}
          {activeId === "organisation" && (
            <Organisation
              token={session.token}
              canGerer={held.has("organisation.administrer")}
              canGererTribus={held.has("tribus.administrer")}
            />
          )}
          {activeId === "organigramme" && (
            <Organigramme token={session.token} canAdministrer={held.has("organisation.administrer")} />
          )}
          {activeId === "equipes-speciales" && (
            <EquipesSpeciales token={session.token} canGerer={held.has("organisation.equipes")} />
          )}
          {activeId === "supervision-tribus" && (
            <GouvernanceTransverse token={session.token} canGerer={held.has("organisation.supervision")} />
          )}
          {activeId === "informations" && <InformationsAdmin token={session.token} />}
          {activeId === "centre-diffusion" && <CentreDiffusion token={session.token} />}
          {activeId === "retention" && <RetentionArchivage token={session.token} canGerer={held.has("parametres.gerer")} />}
          {activeId === "identite-institutionnelle" && <IdentiteInstitutionnelle token={session.token} canGerer={held.has("parametres.gerer")} />}
          {activeId === "evenements" && (
            <Evenements
              token={session.token}
              canGerer={held.has("evenements.gerer")}
              canSuperviser={held.has("evenements.superviser")}
              canParametres={held.has("parametres.gerer")}
            />
          )}
          {activeId === "types-evenements" && <TypesEvenements token={session.token} canGerer={held.has("evenements.gerer")} />}
          {activeId === "anniversaires" && <Anniversaires token={session.token} />}
          {activeId === "comptage" && <ComptageVoletB token={session.token} />}
          {activeId === "gouvernance-acces" && <GouvernanceAcces token={session.token} />}
          {activeId === "utilisateurs" && <Utilisateurs token={session.token} canSysteme={held.has("acces.systeme")} />}
          {activeId === "permissions" && <MatricePermissions token={session.token} />}
          {activeId === "espaces-collab" && <EspacesCollab token={session.token} canSysteme={held.has("acces.systeme")} />}
          {activeId === "technical-admins" && <TechnicalAdmins token={session.token} />}
          {activeId === "fournisseurs-email" && <FournisseursEmail token={session.token} />}
          {activeId === "formulaire-pointage" && <FormulairePointage token={session.token} />}
          {activeId === "terminaux" && <Terminaux token={session.token} canGerer={held.has("terminaux.administrer")} />}
          {activeId === "integrations" && <Integrations token={session.token} canAdministrer={held.has("integrations.administrer")} canGererNotifs={held.has("notifications.gerer")} />}
          {activeId === "reglages-ia" && <ReglagesIA token={session.token} />}
          {activeId === "consentements" && <Consentements token={session.token} canGerer={held.has("consentements.administrer")} />}
          {activeId === "attestations" && <Attestations token={session.token} />}
          {activeId === "audit" && <JournalAudit token={session.token} />}
          {!activeId && <p className="muted">Aucune rubrique accessible avec vos permissions.</p>}
        </div>
      </main>
    </div>
  );
}
