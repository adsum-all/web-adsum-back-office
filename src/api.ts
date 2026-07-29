// Thin client for the ADSUM admin API. The base URL is configurable so the app
// can point at the deployed API (https://adsum-api.vercel.app) or a local one.
// Admin endpoints are built in parallel by the backend, so reads are defensive:
// a 404 is surfaced as a typed error the UI can present without crashing.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://adsum-api.vercel.app";

export type Role = "admin" | "super_admin" | string;

export interface Session {
  token: string;
  role: Role;
  // Effective permissions of the account, used to mask the menu. Optional so a
  // session persisted before this field existed is re-hydrated, never rejected.
  permissions?: string[];
}

export interface MyPermissions {
  role: Role;
  permissions: string[];
  acces_back_office: boolean;
}

export interface PermissionItem {
  cle: string;
  domaine: string;
  libelle: string;
  risque: string;
  portee: string;
  // Human explanation shown in the matrix and the group editor: what the
  // permission concretely allows, and its boundary (what it does not allow).
  description?: string;
  limite?: string;
}

export interface RolePermissions {
  role: Role;
  permissions: string[];
}

export interface GroupePermissions {
  id: string;
  cle: string;
  libelle: string;
  description: string | null;
  actif: boolean;
  permissions: string[];
}

export interface CataloguePermissions {
  permissions: PermissionItem[];
  domaines: string[];
  roles: RolePermissions[];
  groupes_specialises: GroupePermissions[];
}

export interface Me {
  id: string;
  email: string;
  role: Role;
  membre_id: string | null;
}

export interface MembreProfile {
  id: string;
  matricule: string;
  code_membre?: string | null;
  email: string;
  nom: string | null;
  prenoms: string | null;
  nom_affichage?: string;
  nom_naissance?: string | null;
  nom_marital?: string | null;
  nom_affiche?: string | null;
  est_berger?: boolean;
  nom_pastoral?: string | null;
  nom_pastoral_affiche?: string | null;
  fonction_perimetre?: string | null;
  fonctions?: { libelle: string; perimetre: string | null }[];
  telephone: string | null;
  groupe: string | null;
  statut: string;
  verifie: boolean;
  genre: string | null;
  date_naissance: string | null;
  pays: string | null;
  ville: string | null;
  date_entree: string | null;
  cheminement_pastoral: string | null;
  statut_administratif: string | null;
  type_membre: string | null;
  promotion: string | null;
  situation_matrimoniale: string | null;
  type_mariage: string | null;
  profession: string | null;
  niveau_etudes: string | null;
  baptise: boolean | null;
  confirme: boolean | null;
  premiere_communion: boolean | null;
  commission: string | null;
  intendance: string | null;
  intendance_id: string | null;
  berger: string | null;
  berger_referent_id: string | null;
  tribu: string | null;
  tribu_id: string | null;
  patriarche: string | null;
  coordination: string | null;
  coordinateur: string | null;
  fonction_cle?: string | null;
  fonction_confirmee?: boolean;
  titre?: string | null;
  photo_focus_x?: number | null;
  photo_focus_y?: number | null;
}

export interface MembreCreateInput {
  email: string;
  nom?: string;
  prenoms?: string;
  telephone?: string;
  commission_id?: string;
  groupe?: string;
  genre?: string;
  date_naissance?: string;
  pays?: string;
  ville?: string;
  intendance_id?: string | null;
  coordination_id?: string | null;
  berger_referent_id?: string;
  date_entree?: string;
  cheminement_pastoral?: string;
  tribu_id?: string;
  type_membre?: string;
  promotion?: string;
  situation_matrimoniale?: string;
  type_mariage?: string;
  profession?: string;
  niveau_etudes?: string;
  baptise?: boolean;
  confirme?: boolean;
  premiere_communion?: boolean;
  nom_naissance?: string;
  nom_marital?: string;
  nom_affiche?: string;
  est_berger?: boolean;
  nom_pastoral?: string;
  berger_depuis?: string;
  fonction_perimetre?: string;
  appartenance?: string;
  note_confidentielle?: string;
}

export interface MembreUpdateInput {
  nom?: string;
  prenoms?: string;
  code_membre?: string;
  telephone?: string;
  commission_id?: string;
  groupe?: string;
  statut?: string;
  verifie?: boolean;
  genre?: string;
  date_naissance?: string;
  pays?: string;
  ville?: string;
  intendance_id?: string | null;
  coordination_id?: string | null;
  berger_referent_id?: string;
  date_entree?: string;
  cheminement_pastoral?: string;
  tribu_id?: string;
  type_membre?: string;
  promotion?: string;
  situation_matrimoniale?: string;
  type_mariage?: string;
  profession?: string;
  niveau_etudes?: string;
  baptise?: boolean;
  confirme?: boolean;
  premiere_communion?: boolean;
  nom_naissance?: string;
  nom_marital?: string;
  nom_affiche?: string;
  est_berger?: boolean;
  nom_pastoral?: string;
  berger_depuis?: string;
  fonction_perimetre?: string;
  appartenance?: string;
  note_confidentielle?: string;
}

export interface Intendance {
  id: string;
  nom: string;
  description: string | null;
  pays_code: string | null;
  pays: string | null;
  continent: string | null;
  ville: string | null;
  statut: string;
  coordination_id: string | null;
  coordination: string | null;
  publie: boolean;
  parent_id: string | null;
  parent: string | null;
  responsable: string | null;
  responsable_titre: string | null;
}

export interface Berger {
  id: string;
  nom: string;
  role: string;
}

export interface Coordination {
  id: string;
  nom: string;
  description: string | null;
  pays_code: string | null;
  pays: string | null;
  continent: string | null;
  ville: string | null;
  statut: string;
  publie: boolean;
  parent_id: string | null;
  parent: string | null;
  responsable: string | null;
  responsable_titre: string | null;
}

// Optional fields accept null so an edit can explicitly CLEAR a value (e.g.
// detach a parent). Sending undefined omits the field (leaves it unchanged);
// sending null sets it to empty on the server.
export interface CoordinationInput {
  nom?: string;
  description?: string | null;
  pays_code?: string | null;
  continent?: string | null;
  ville?: string | null;
  statut?: string;
  parent_id?: string | null;
}

export interface IntendanceInput {
  nom?: string;
  description?: string | null;
  pays_code?: string | null;
  pays?: string | null;
  continent?: string | null;
  ville?: string | null;
  statut?: string;
  coordination_id?: string | null;
  parent_id?: string | null;
}

export interface SousCommission {
  id: string;
  nom: string;
  commission_id: string | null;
  commission: string | null;
  publie: boolean;
}

export interface Tribu {
  id: string;
  nom: string;
  description?: string | null;
  publie?: boolean;
  patriarche: string | null;
  patriarche_membre_id: string | null;
  patriarche_nom: string | null;
}

export interface Statistiques {
  membres_total: number;
  membres_actifs: number;
  membres_verifies: number;
  membres_en_attente: number;
  evenements_total: number;
  presences_total: number;
  commissions_total: number;
  missions_total: number;
  intendances_total: number;
  par_commission: { commission: string; total: number }[];
  par_cheminement: { cheminement: string; total: number }[];
  entrees_mensuelles: { mois: string; total: number }[];
  membres_a_verifier: { id: string; matricule: string; prenoms: string | null; nom: string | null }[];
  par_type_evenement: { nom: string; couleur: string; total: number; pourcentage: number }[];
}

export interface DoublonGroupe {
  critere: string;
  valeur: string;
  membres: MembreProfile[];
}

export interface Utilisateur {
  id: string;
  email: string;
  role: string;
  actif: boolean;
  double_facteur: boolean;
  membre_id: string | null;
  membre_nom: string | null;
  dernier_login: string | null;
  /** Active GLOBAL group memberships: platform access can exist with role 'membre'
   * (permission-mode groups), so the roster derives from this too. */
  groupes_globaux: number;
}

export interface Terminal {
  id: string;
  nom: string | null;
  appareil_id: string | null;
  autorise: boolean;
  appaire_le: string | null;
  dernier_sync: string | null;
}

export interface ComptageLigne {
  id: string;
  segment: string | null;
  total_membres: number;
  total_anonyme: number;
  horodatage: string | null;
}

export interface ComptageResume {
  evenement_id: string;
  titre: string | null;
  membres_scannes: number;
  non_membres: number;
  total_participants: number;
  lignes: ComptageLigne[];
}

export interface AuditEntry {
  id: number;
  acteur_role: string | null;
  acteur_nom: string | null;
  action: string;
  objet_type: string | null;
  objet_id: string | null;
  horodatage: string | null;
}

export interface Commission {
  id: string;
  nom: string;
  description: string | null;
  publie: boolean;
  type_organisation: string;
}

/** URL segment for the organization management endpoints. */
export type OrgEntity = "coordinations" | "intendances" | "commissions" | "groupes" | "tribus";

export function createTribu(token: string, input: { nom: string; description?: string }): Promise<Tribu> {
  return authedSend<Tribu>("/api/v1/admin/tribus", token, "POST", input, "Création impossible");
}

export function renameOrganisation(token: string, entity: OrgEntity, id: string, nom: string): Promise<{ id: string; nom: string }> {
  return authedSend(`/api/v1/admin/organisation/${entity}/${id}`, token, "PATCH", { nom }, "Renommage impossible");
}

/** Edit a structural entity's name and, where supported, its description
 * (coordination/intendance/commission) or parent commission (sous-commission).
 * Only the provided fields are sent; the server ignores fields the table lacks. */
export function editOrganisation(
  token: string,
  entity: OrgEntity,
  id: string,
  fields: { nom?: string; description?: string; commission_id?: string | null; responsable_id?: string | null },
): Promise<{ id: string; nom: string }> {
  return authedSend(`/api/v1/admin/organisation/${entity}/${id}`, token, "PATCH", fields, "Modification impossible");
}

export interface TitulairesUnite {
  unite: { id: string; nom: string; type: string };
  titulaire_actuel: { membre_id: string | null; nom: string | null };
  poste_pourvu: boolean;
  historique: {
    horodatage: string | null;
    action: string;
    libelle: string;
    titulaire_avant: string | null;
    titulaire_apres: string | null;
    acteur_role: string | null;
  }[];
}

/** Who holds the post on this unit, and who held it before.
 *
 * A unit, the function exercised there, the post and its holder are four distinct
 * things: this reads the holder without ever touching the unit itself. */
export function getTitulairesUnite(token: string, entity: OrgEntity, id: string): Promise<TitulairesUnite> {
  return authedGet(`/api/v1/admin/organisation/${entity}/${id}/titulaires`, token, "Titulaires indisponibles");
}

/** Designate a member as holder of the post, or vacate it by passing null.
 *
 * Vacating leaves the unit untouched: it keeps its name and its place, only the post
 * status changes. */
export function designerTitulaire(
  token: string,
  entity: OrgEntity,
  id: string,
  membreId: string | null,
): Promise<{ id: string; nom: string }> {
  return authedSend(
    `/api/v1/admin/organisation/${entity}/${id}`,
    token,
    "PATCH",
    { responsable_id: membreId },
    membreId ? "Désignation impossible" : "Libération du poste impossible",
  );
}

export function publishOrganisation(
  token: string,
  entity: OrgEntity,
  id: string,
  publie: boolean,
): Promise<{ id: string; publie: boolean }> {
  return authedSend(`/api/v1/admin/organisation/${entity}/${id}/publication`, token, "PATCH", { publie }, "Publication impossible");
}

export function deleteOrganisation(token: string, entity: OrgEntity, id: string): Promise<void> {
  return request<void>(`/api/v1/admin/organisation/${entity}/${id}`, token, { method: "DELETE" }, "Suppression impossible");
}

export interface OrgDependanceRef {
  table: string;
  colonne: string;
  label: string;
  nombre: number;
  echantillon: string[];
}
export interface OrgDependances {
  entity: string;
  item_id: string;
  total: number;
  supprimable: boolean;
  references: OrgDependanceRef[];
  cibles: { id: string; nom: string }[];
}
export function getOrgDependances(token: string, entity: OrgEntity, id: string): Promise<OrgDependances> {
  return authedGet<OrgDependances>(`/api/v1/admin/organisation/${entity}/${id}/dependances`, token, "Analyse des dépendances impossible");
}
export function reaffecterOrganisation(token: string, entity: OrgEntity, id: string, cibleId: string | null): Promise<{ reaffectes: number; cible_id: string | null; detail: Record<string, number> }> {
  return authedSend(`/api/v1/admin/organisation/${entity}/${id}/reaffecter`, token, "POST", { cible_id: cibleId }, "Réaffectation impossible");
}

export interface CommissionCreateInput {
  nom: string;
  description?: string;
  type_organisation?: string;
}

export type TypeDiffusion = "aucun" | "embed" | "externe";
export type Visibilite = "public" | "membres" | "prive";

export interface Evenement {
  id: string;
  titre: string;
  type: string | null;
  /** Catalogue event type (name + unique colour), drives the calendar colour and tag. */
  type_evenement_id?: string | null;
  type_evenement_nom?: string | null;
  couleur?: string | null;
  volet: string;
  debut: string;
  fin: string | null;
  lieu: string | null;
  session_ouverte?: boolean;
  lien_session?: string | null;
  liens?: string[];
  mode?: string | null;
  type_diffusion?: TypeDiffusion;
  visibilite?: Visibilite;
  cible_type?: CibleType;
  cible_id?: string | null;
  cible_libelle?: string | null;
  cible_genre?: string | null;
  cible_age_min?: number | null;
  cible_age_max?: number | null;
  cible_emails?: string[];
  tags?: { id: string; cle: string; libelle: string }[];
  annule?: boolean;
  annule_motif?: string | null;
  fuseau_horaire?: string;
  serie_id?: string | null;
  /** Per-activity response-window override in hours; null = global default. */
  fenetre_reponse_heures?: number | null;
  /** Rich description (sanitised HTML) and the human contributors. */
  description?: string | null;
  intervenant_principal?: string | null;
  intervenants?: string[];
}

export interface TagItem {
  id: string;
  cle: string;
  libelle: string;
  famille?: string | null;
  description?: string | null;
}

export function getTags(token: string): Promise<TagItem[]> {
  return authedGet<TagItem[]>("/api/v1/tags", token, "Étiquettes indisponibles");
}

export function taguerActivite(token: string, id: string, tagIds: string[]): Promise<{ ok: boolean; tags: number }> {
  return authedSend(`/api/v1/admin/evenements/${id}/tags`, token, "PUT", { tag_ids: tagIds }, "Étiquetage impossible");
}

// Activity attachments (images and files), shared with the collaboration app.
export interface PieceEvenement {
  id: string;
  nom: string;
  type: string;
  taille: number;
  url: string;
  cree_le?: string | null;
}
export function listPiecesEvenement(token: string, id: string): Promise<PieceEvenement[]> {
  return authedGet<PieceEvenement[]>(`/api/v1/admin/evenements/${id}/pieces`, token, "Pièces indisponibles");
}
export function ajouterPieceEvenement(token: string, id: string, piece: { nom: string; type: string; taille: number; data_url: string }): Promise<PieceEvenement> {
  return authedSend<PieceEvenement>(`/api/v1/admin/evenements/${id}/pieces`, token, "POST", piece, "Pièce non ajoutée");
}
export function supprimerPieceEvenement(token: string, pieceId: string): Promise<void> {
  return request<void>(`/api/v1/admin/evenements/pieces/${pieceId}`, token, { method: "DELETE" }, "Suppression impossible");
}

// Administrable destinations referential (cible_activite). The activity forms
// load their destination list from here, so an administrator can add, rename,
// reorder or deactivate a destination without any code change.
export interface CibleActivite {
  code: string;
  libelle: string;
  description: string | null;
  categorie: string;
  type_regle: string;
  /** True when the destination targets one organisational unit (cible_id required). */
  besoin_unite: boolean;
  ordre: number;
  statut: "actif" | "inactif" | "archive";
  /** Safe rule template parameters (validated server-side, never free rules). */
  parametres: { table?: string; attribut?: string; fonction_cles?: string[]; toutes_fonctions?: boolean };
}
export function getCiblesActivite(token: string): Promise<CibleActivite[]> {
  return authedGet<CibleActivite[]>("/api/v1/reference/cibles-activite", token, "Destinations indisponibles");
}
export function getCiblesActiviteAdmin(token: string): Promise<CibleActivite[]> {
  return authedGet<CibleActivite[]>("/api/v1/admin/cibles-activite", token, "Destinations indisponibles");
}
export function creerCibleActivite(
  token: string,
  payload: { code: string; libelle: string; description?: string | null; categorie?: string; fonction_cles: string[]; ordre?: number },
): Promise<CibleActivite> {
  return authedSend<CibleActivite>("/api/v1/admin/cibles-activite", token, "POST", payload, "Création impossible");
}
export function modifierCibleActivite(
  token: string,
  code: string,
  payload: { libelle?: string; description?: string | null; ordre?: number; statut?: string; fonction_cles?: string[] },
): Promise<CibleActivite> {
  return authedSend<CibleActivite>(`/api/v1/admin/cibles-activite/${code}`, token, "PATCH", payload, "Modification impossible");
}
export function supprimerCibleActivite(token: string, code: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/v1/admin/cibles-activite/${code}`, token, { method: "DELETE" }, "Suppression impossible");
}
export interface ApercuCible {
  code: string;
  libelle: string;
  nombre: number;
  type_regle: string;
}
export function apercuCibleActivite(token: string, code: string, cibleId?: string | null): Promise<ApercuCible> {
  const q = cibleId ? `?cible_id=${encodeURIComponent(cibleId)}` : "";
  return authedGet<ApercuCible>(`/api/v1/admin/cibles-activite/${code}/apercu${q}`, token, "Aperçu indisponible");
}

/** Stable destination code from the administrable referential (cible_activite).
 * The historical union is kept for readability but any referential code is valid,
 * so the type is an open string: new destinations need no front change. */
export type CibleType = string;
/** Scope of a series operation: the clicked date only, or every date of the series. */
export type PorteeSerie = "cette_occurrence" | "toute_la_serie";

export interface EvenementCreateInput {
  titre: string;
  type?: string;
  /** Catalogue event type; drives the calendar colour of the created event(s). */
  type_evenement_id?: string | null;
  volet?: string;
  debut: string;
  fin?: string;
  lieu?: string;
  lien_session?: string;
  liens?: string[];
  mode?: string;
  type_diffusion?: TypeDiffusion;
  visibilite?: Visibilite;
  cible_type?: CibleType;
  cible_id?: string | null;
  /** Refinements that combine (AND) with the target type. */
  cible_genre?: "homme" | "femme" | null;
  cible_age_min?: number | null;
  cible_age_max?: number | null;
  /** Ad-hoc audience for cible_type = 'liste'. */
  cible_emails?: string[];
  /** Response window in hours after the end; empty = admin default (6h). */
  fenetre_reponse_heures?: number;
  /** IANA zone the start/end were entered in (default Africa/Abidjan = GMT). */
  fuseau_horaire?: string;
  /** Extra occurrences (beyond debut/fin) turning the activity into a series.
   * `mode` overrides the base mode for that date (intermittent variable mode). */
  occurrences?: { debut: string; fin?: string; mode?: string }[];
  /** Recurrence rule, recorded for display (freq, interval, count). */
  recurrence?: { freq: string; interval: number; count: number } | null;
  /** Rich description (sanitised server-side) and the human contributors. */
  description?: string | null;
  intervenant_principal?: string | null;
  intervenants?: string[];
}

export interface MembreListQuery {
  limit?: number;
  offset?: number;
  q?: string;
  pays?: string;
  commission_id?: string;
  intendance_id?: string;
  coordination_id?: string;
  tribu_id?: string;
  /** Directory compartment (validation/operational status): actifs, en_attente,
   * corrections, refuses, incomplets, inactifs, suspendus, tous. */
  statut?: string;
  /** Sort order: nom (default, alphabetical), nom_desc, inscription, maj, matricule. */
  tri?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 401) return "Session expirée";
  if (status === 403) return "Accès refusé";
  if (status === 404) return "Ressource indisponible";
  if (status === 409) return "Action impossible en l'état : cette entité est encore utilisée.";
  return fallback;
}

/** Read the server-provided reason (FastAPI `detail`) so an actionable message,
 * e.g. a 409 "still referenced" refusal, is shown instead of an opaque fallback.
 * A plain string detail is surfaced as-is; a 422 validation error returns `detail`
 * as a list of {loc, msg, type}, whose `msg` fields are concatenated so the reason
 * is actionable; anything else falls back to the status-based message. */
async function detailOr(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    const detail = body?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
        .filter((m) => m.trim());
      if (msgs.length > 0) return msgs.join("; ");
    }
  } catch {
    /* body not JSON: keep the status-based message */
  }
  return messageForStatus(res.status, fallback);
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit,
  onError: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(await detailOr(res, onError), res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function authedGet<T>(path: string, token: string, onError: string): Promise<T> {
  return request<T>(path, token, { method: "GET" }, onError);
}

function authedSend<T>(
  path: string,
  token: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body: unknown,
  onError: string,
): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  return request<T>(path, token, init, onError);
}

export function deviceId(): string {
  if (typeof localStorage === "undefined") return "";
  let id = localStorage.getItem("adsum.device.id");
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("adsum.device.id", id);
  }
  return id;
}

export interface LoginResult {
  otpRequired: boolean;
  session: Session | null;
  canal: string | null;
}

function loginError(status: number): ApiError {
  if (status === 401) return new ApiError("Identifiants invalides ou mot de passe temporaire expiré", status);
  if (status === 429) return new ApiError("Trop de tentatives de connexion. Patientez quelques minutes, puis réessayez.", status);
  if (status === 400) return new ApiError("Code incorrect ou expiré. Vérifiez et réessayez.", status);
  if (status === 0) return new ApiError("Connexion au serveur impossible. Vérifiez votre réseau.", 0);
  return new ApiError("Service momentanément indisponible. Réessayez dans un instant.", status);
}

export async function login(email: string, password: string): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId() },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw loginError(0);
  }
  if (!res.ok) throw loginError(res.status);
  const data = (await res.json()) as { otp_required?: boolean; access_token?: string | null; role?: Role; canal?: string | null };
  return {
    otpRequired: Boolean(data.otp_required),
    session: data.access_token ? { token: data.access_token, role: data.role ?? "" } : null,
    canal: data.canal ?? null,
  };
}

export async function loginVerify(email: string, password: string, code: string, faireConfiance: boolean): Promise<Session> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1/auth/login-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Id": deviceId() },
      body: JSON.stringify({ email, password, code, faire_confiance: faireConfiance }),
    });
  } catch {
    throw loginError(0);
  }
  if (!res.ok) throw loginError(res.status);
  const data = (await res.json()) as { access_token?: string | null; role?: Role };
  if (!data.access_token) throw loginError(401);
  return { token: data.access_token, role: data.role ?? "" };
}

export function getMe(token: string): Promise<Me> {
  return authedGet<Me>("/api/v1/auth/me", token, "Session indisponible");
}

/** Server-side personal display preferences of the signed-in account, so the choice
 * follows the account across browsers instead of living in one browser only. */
export interface PreferencesCompte {
  vue_evenements: "calendrier" | "liste" | null;
  theme?: "light" | "dark" | "system" | null;
}
export function getMesPreferences(token: string): Promise<PreferencesCompte> {
  return authedGet<PreferencesCompte>("/api/v1/auth/me/preferences", token, "Préférences indisponibles");
}
export function setMesPreferences(token: string, input: Partial<PreferencesCompte>): Promise<PreferencesCompte> {
  return authedSend<PreferencesCompte>("/api/v1/auth/me/preferences", token, "PUT", input, "Enregistrement impossible");
}

export function getMyPermissions(token: string): Promise<MyPermissions> {
  return authedGet<MyPermissions>("/api/v1/membres/me/permissions", token, "Permissions indisponibles");
}

export function getCataloguePermissions(token: string): Promise<CataloguePermissions> {
  return authedGet<CataloguePermissions>(
    "/api/v1/admin/catalogue-permissions",
    token,
    "Matrice des permissions indisponible",
  );
}

// Collaboration spaces supervision (read-only): who belongs to which space, with
// which space role. The fine-grained management stays in the collaboration app.
export interface CollabMembreEspace {
  membre_id: string;
  role: string;
}
export interface CollabDemandeAcces {
  id: string;
  membre_id: string;
  cree_le: string;
}
export interface CollabSousEspace {
  id: string;
  nom: string;
  couleur: string;
  initiale: string;
  archive: boolean;
}
export interface CollabEspace {
  id: string;
  nom: string;
  description: string;
  type: string;
  couleur: string;
  initiale: string;
  membres: CollabMembreEspace[];
  observateurs_commentent: boolean;
  archive: boolean;
  demandes_acces: CollabDemandeAcces[];
  parent_id?: string | null;
  sous_espaces?: CollabSousEspace[];
}
export interface CollabCompte {
  id: string;
  nom: string;
  courriel: string;
  initiales: string;
}
export function listCollabEspaces(token: string): Promise<CollabEspace[]> {
  // Back-office GOVERNANCE view: lists every workspace's metadata (name, members,
  // access requests) so the control tower can assign access. This is a governance
  // surface, not content: /admin/espaces never exposes canal, boards or files. The
  // member-facing /espaces endpoint is strictly membership-scoped and would hide
  // workspaces the operator was not added to.
  return authedGet<CollabEspace[]>("/api/v1/collaboration/admin/espaces", token, "Espaces de collaboration indisponibles");
}
export function listCollabComptes(token: string): Promise<CollabCompte[]> {
  return authedGet<CollabCompte[]>("/api/v1/collaboration/membres", token, "Comptes de collaboration indisponibles");
}

export interface ReglagesCollab {
  retention_suppression_jours: number;
  colonne_instructions_auto: boolean;
  canal_emetteurs_max: number;
  canaux_additionnels_actives: boolean;
  instruction_bot_dedie: boolean;
  instruction_bot_username: string;
}
export interface ReglagesCollabPatch {
  retention_suppression_jours?: number;
  colonne_instructions_auto?: boolean;
  canal_emetteurs_max?: number;
  canaux_additionnels_actives?: boolean;
  telegram_instruction_bot_token?: string;
  telegram_instruction_bot_username?: string;
}
export function getReglagesCollab(token: string): Promise<ReglagesCollab> {
  return authedGet<ReglagesCollab>("/api/v1/collaboration/reglages", token, "Réglages indisponibles");
}

export interface BotDemande {
  id: string;
  nom: string;
  statut: string;
  username: string | null;
  demande_le: string | null;
}
export interface BotDemandes {
  etapes: string[];
  espaces: BotDemande[];
}
export function getBotDemandes(token: string): Promise<BotDemandes> {
  return authedGet<BotDemandes>("/api/v1/admin/collaboration/bot-demandes", token, "Demandes indisponibles");
}
export function configurerBotEspace(token: string, espaceId: string, username: string, botToken: string): Promise<{ ok: boolean; statut: string; username: string }> {
  return authedSend(`/api/v1/admin/collaboration/espaces/${espaceId}/bot`, token, "PUT", { username, token: botToken }, "Configuration impossible");
}

export interface BotConfigure {
  espace_id: string;
  nom: string;
  username: string | null;
  statut: string;
  derniere_synchro?: string | null;
  derniere_note?: string | null;
  dernier_echec?: string | null;
  dernier_echec_le?: string | null;
}
export interface BotsConfigures {
  bots: BotConfigure[];
}
export function getBotsConfigures(token: string): Promise<BotsConfigures> {
  return authedGet<BotsConfigures>("/api/v1/admin/collaboration/bots", token, "Bots indisponibles");
}
export interface DissociationBot {
  ok: boolean;
  statut: string;
  webhook_revoque: boolean;
  message: string;
}
export function dissocierBotEspace(token: string, espaceId: string): Promise<DissociationBot> {
  return authedSend<DissociationBot>(`/api/v1/admin/collaboration/espaces/${espaceId}/bot`, token, "DELETE", undefined, "Dissociation impossible");
}

export interface Emetteur {
  utilisateur_id: string;
  nom: string;
}
export interface Emetteurs {
  max: number;
  emetteurs: Emetteur[];
}
export function getEmetteurs(token: string, espaceId: string): Promise<Emetteurs> {
  return authedGet<Emetteurs>(`/api/v1/collaboration/espaces/${espaceId}/emetteurs`, token, "Émetteurs indisponibles");
}
export function ajouterEmetteur(token: string, espaceId: string, utilisateurId: string): Promise<Emetteurs> {
  return authedSend<Emetteurs>(`/api/v1/collaboration/espaces/${espaceId}/emetteurs`, token, "POST", { utilisateur_id: utilisateurId }, "Ajout de l'émetteur impossible");
}
export function retirerEmetteur(token: string, espaceId: string, utilisateurId: string): Promise<Emetteurs> {
  return authedSend<Emetteurs>(`/api/v1/collaboration/espaces/${espaceId}/emetteurs/${utilisateurId}`, token, "DELETE", undefined, "Retrait de l'émetteur impossible");
}

export interface CorbeilleItem {
  id: string;
  nom: string;
  supprime_le: string | null;
  jours_restants: number;
  sous_espace?: boolean;
  espace_id?: string;
}
export interface Corbeille {
  retention_jours: number;
  espaces: CorbeilleItem[];
  tableaux: CorbeilleItem[];
}
export function getCorbeille(token: string): Promise<Corbeille> {
  return authedGet<Corbeille>("/api/v1/collaboration/corbeille", token, "Corbeille indisponible");
}
export function restaurerEspace(token: string, espaceId: string): Promise<{ restaure: boolean }> {
  return authedSend(`/api/v1/collaboration/espaces/${espaceId}/restaurer`, token, "POST", {}, "Restauration impossible");
}
export function restaurerTableau(token: string, tableauId: string): Promise<{ restaure: boolean }> {
  return authedSend(`/api/v1/collaboration/tableaux-espace/${tableauId}/restaurer`, token, "POST", {}, "Restauration impossible");
}

// --- Accès et rôles par espace (le serveur applique collaboration.gerer + rôle d'espace) ---
export function addEspaceMembre(token: string, espaceId: string, membreId: string, role: string): Promise<CollabEspace> {
  return authedSend<CollabEspace>(`/api/v1/collaboration/espaces/${espaceId}/membres`, token, "POST", { membre_id: membreId, role }, "Ajout du membre impossible");
}
export function updateEspaceMembreRole(token: string, espaceId: string, membreId: string, role: string): Promise<CollabEspace> {
  return authedSend<CollabEspace>(`/api/v1/collaboration/espaces/${espaceId}/membres/${membreId}`, token, "PATCH", { role }, "Changement de rôle impossible");
}
export function removeEspaceMembre(token: string, espaceId: string, membreId: string): Promise<CollabEspace> {
  return authedSend<CollabEspace>(`/api/v1/collaboration/espaces/${espaceId}/membres/${membreId}`, token, "DELETE", undefined, "Retrait du membre impossible");
}
export function accepterDemandeEspace(token: string, espaceId: string, demandeId: string, role: string): Promise<CollabEspace> {
  return authedSend<CollabEspace>(`/api/v1/collaboration/espaces/${espaceId}/demandes/${demandeId}/accepter`, token, "POST", { role }, "Acceptation impossible");
}
export function refuserDemandeEspace(token: string, espaceId: string, demandeId: string): Promise<CollabEspace> {
  return authedSend<CollabEspace>(`/api/v1/collaboration/espaces/${espaceId}/demandes/${demandeId}`, token, "DELETE", undefined, "Refus impossible");
}

export interface CollabStats {
  espaces: number;
  tableaux: number;
  cartes: number;
  enRetard: number;
  termineesSemaine: number;
}
export function getCollabStats(token: string): Promise<CollabStats> {
  return authedGet<CollabStats>("/api/v1/collaboration/stats", token, "Statistiques indisponibles");
}
export function putReglagesCollab(token: string, patch: ReglagesCollabPatch): Promise<ReglagesCollab> {
  return authedSend<ReglagesCollab>("/api/v1/collaboration/reglages", token, "PUT", patch, "Mise à jour impossible");
}

function buildQuery(query: MembreListQuery): string {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.q) params.set("q", query.q);
  if (query.pays) params.set("pays", query.pays);
  if (query.commission_id) params.set("commission_id", query.commission_id);
  if (query.intendance_id) params.set("intendance_id", query.intendance_id);
  if (query.coordination_id) params.set("coordination_id", query.coordination_id);
  if (query.tribu_id) params.set("tribu_id", query.tribu_id);
  if (query.statut) params.set("statut", query.statut);
  if (query.tri) params.set("tri", query.tri);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getMembres(token: string, query: MembreListQuery = {}): Promise<MembreProfile[]> {
  return authedGet<MembreProfile[]>(
    `/api/v1/admin/membres${buildQuery(query)}`,
    token,
    "Membres indisponibles",
  );
}

export interface PageMembres {
  items: MembreProfile[];
  total: number;
  limit: number;
  offset: number;
}

/** The directory page AND how many members match the filters.
 *
 * The count lives in X-Total-Count rather than in the body, so the endpoint keeps
 * returning a plain list; this reads it back so a page control can show a range and
 * a last page instead of guessing. */
export async function getMembresPage(token: string, query: MembreListQuery = {}): Promise<PageMembres> {
  const res = await fetch(`${BASE}/api/v1/admin/membres${buildQuery(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError("Membres indisponibles", res.status);
  const items = (await res.json()) as MembreProfile[];
  const total = Number(res.headers.get("X-Total-Count") ?? items.length);
  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
    limit: query.limit ?? items.length,
    offset: query.offset ?? 0,
  };
}

export type MembreCompartiments = Record<string, number>;

/** Exact member count per directory compartment, for the tab badges. */
export function getMembresCompartiments(token: string): Promise<MembreCompartiments> {
  return authedGet<MembreCompartiments>("/api/v1/admin/membres/compartiments", token, "Compteurs indisponibles");
}

export function getAnnuairePays(token: string): Promise<string[]> {
  return authedGet<string[]>("/api/v1/admin/annuaire/pays", token, "Pays indisponibles");
}

export function getMembre(token: string, id: string): Promise<MembreProfile> {
  return authedGet<MembreProfile>(`/api/v1/admin/membres/${id}`, token, "Membre indisponible");
}

export interface MembreGouvernance {
  appartenance: string;
  note_confidentielle: string | null;
  berger_depuis: string | null;
}

export interface MembreFonctionItem {
  id: string;
  fonction_cle: string;
  libelle: string;
  categorie: string;
  abreviation: string | null;
  perimetre: string | null;
  confirmee: boolean;
  actif: boolean;
  principale: boolean;
  ordre: number;
}

export function getMembreFonctions(token: string, id: string): Promise<MembreFonctionItem[]> {
  return authedGet<MembreFonctionItem[]>(`/api/v1/admin/membres/${id}/fonctions`, token, "Fonctions indisponibles");
}

export function addMembreFonction(
  token: string,
  id: string,
  body: { fonction_cle: string; perimetre?: string; confirmee?: boolean; principale?: boolean },
): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/membres/${id}/fonctions`, token, "POST", body, "Ajout impossible");
}

export function updateMembreFonction(
  token: string,
  id: string,
  fid: string,
  body: { perimetre?: string; confirmee?: boolean; actif?: boolean; principale?: boolean; ordre?: number },
): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/membres/${id}/fonctions/${fid}`, token, "PATCH", body, "Modification impossible");
}

export function deleteMembreFonction(token: string, id: string, fid: string): Promise<void> {
  return authedSend(`/api/v1/admin/membres/${id}/fonctions/${fid}`, token, "DELETE", undefined, "Retrait impossible");
}

/** Admin-only governance block (membership state + confidential note). Never
 * part of the member-facing profile. */
export function getMembreGouvernance(token: string, id: string): Promise<MembreGouvernance> {
  return authedGet<MembreGouvernance>(`/api/v1/admin/membres/${id}/gouvernance`, token, "Gouvernance indisponible");
}

export function createMembre(token: string, input: MembreCreateInput): Promise<MembreProfile> {
  return authedSend<MembreProfile>("/api/v1/admin/membres", token, "POST", input, "Création impossible");
}

// --- Special teams (equipes speciales) --------------------------------------
export interface EquipeSpeciale {
  id: string;
  code: string | null;
  nom: string;
  description: string;
  officielle: boolean;
  active: boolean;
  ordre: number;
  effectif: number;
}
export interface MembreEquipe {
  id: string;
  membre_id: string;
  role: string;
  matricule: string | null;
  nom: string | null;
}
export interface EquipeSpecialeInput {
  nom: string;
  description?: string;
  officielle?: boolean;
  ordre?: number;
}
export interface EquipeSpecialePatch {
  nom?: string;
  description?: string;
  officielle?: boolean;
  active?: boolean;
  ordre?: number;
}

const EQ = "/api/v1/admin/equipes-speciales";

export function listEquipesSpeciales(token: string): Promise<EquipeSpeciale[]> {
  return authedGet<EquipeSpeciale[]>(EQ, token, "Équipes spéciales indisponibles");
}
export function createEquipeSpeciale(token: string, input: EquipeSpecialeInput): Promise<EquipeSpeciale> {
  return authedSend<EquipeSpeciale>(EQ, token, "POST", input, "Création impossible");
}
export function updateEquipeSpeciale(token: string, id: string, patch: EquipeSpecialePatch): Promise<EquipeSpeciale> {
  return authedSend<EquipeSpeciale>(`${EQ}/${id}`, token, "PUT", patch, "Modification impossible");
}
export function deleteEquipeSpeciale(token: string, id: string): Promise<void> {
  return authedSend<void>(`${EQ}/${id}`, token, "DELETE", undefined, "Suppression impossible");
}
export function listMembresEquipe(token: string, id: string): Promise<MembreEquipe[]> {
  return authedGet<MembreEquipe[]>(`${EQ}/${id}/membres`, token, "Membres indisponibles");
}
export function addMembreEquipe(token: string, id: string, membreId: string, role: string): Promise<{ ok: boolean }> {
  return authedSend<{ ok: boolean }>(`${EQ}/${id}/membres`, token, "POST", { membre_id: membreId, role }, "Ajout impossible");
}
export function removeMembreEquipe(token: string, id: string, membreId: string): Promise<void> {
  return authedSend<void>(`${EQ}/${id}/membres/${membreId}`, token, "DELETE", undefined, "Retrait impossible");
}

export function updateMembre(
  token: string,
  id: string,
  input: MembreUpdateInput,
): Promise<MembreProfile> {
  return authedSend<MembreProfile>(
    `/api/v1/admin/membres/${id}`,
    token,
    "PATCH",
    input,
    "Mise à jour impossible",
  );
}

export function getCommissions(token: string): Promise<Commission[]> {
  return authedGet<Commission[]>("/api/v1/admin/commissions", token, "Commissions indisponibles");
}

export function createCommission(
  token: string,
  input: CommissionCreateInput,
): Promise<Commission> {
  return authedSend<Commission>(
    "/api/v1/admin/commissions",
    token,
    "POST",
    input,
    "Création impossible",
  );
}

export function getEvenements(token: string): Promise<Evenement[]> {
  return authedGet<Evenement[]>("/api/v1/admin/evenements", token, "Événements indisponibles");
}

export function createEvenement(
  token: string,
  input: EvenementCreateInput,
): Promise<Evenement> {
  return authedSend<Evenement>(
    "/api/v1/admin/evenements",
    token,
    "POST",
    input,
    "Création impossible",
  );
}

export function majSessionEvenement(
  token: string,
  id: string,
  patch: {
    lien_session?: string;
    liens?: string[];
    session_ouverte?: boolean;
    type_diffusion?: TypeDiffusion;
    visibilite?: Visibilite;
  },
): Promise<{ id: string; session_ouverte: boolean; lien_session: string | null }> {
  return authedSend(`/api/v1/admin/evenements/${id}/session`, token, "PATCH", patch, "Mise à jour impossible");
}

export function testDiffusionEvenement(token: string, id: string): Promise<{ ok: boolean; envoyes: number }> {
  return authedSend(`/api/v1/admin/evenements/${id}/test-diffusion`, token, "POST", {}, "Test impossible");
}

function porteeQuery(portee?: PorteeSerie): string {
  return portee === "toute_la_serie" ? "?portee=toute_la_serie" : "";
}

export function updateEvenement(token: string, id: string, input: EvenementCreateInput, portee?: PorteeSerie): Promise<Evenement> {
  return authedSend<Evenement>(`/api/v1/admin/evenements/${id}${porteeQuery(portee)}`, token, "PUT", input, "Modification impossible");
}

/** Append dates to an activity's series (additive: never deletes an occurrence).
 * Each date is an absolute UTC instant; the server copies the master's details,
 * skips dates already scheduled, and caps the series length. */
export function ajouterOccurrences(
  token: string,
  id: string,
  occurrences: { debut: string; fin?: string; mode?: string }[],
): Promise<{ ajoutees: number; total: number }> {
  return authedSend(`/api/v1/admin/evenements/${id}/occurrences`, token, "POST", { occurrences }, "Ajout des dates impossible");
}

export function annulerEvenement(token: string, id: string, motif?: string, portee?: PorteeSerie): Promise<Evenement> {
  return authedSend<Evenement>(`/api/v1/admin/evenements/${id}/annuler${porteeQuery(portee)}`, token, "POST", { motif: motif ?? null }, "Annulation impossible");
}

export function reactiverEvenement(token: string, id: string, portee?: PorteeSerie): Promise<Evenement> {
  return authedSend<Evenement>(`/api/v1/admin/evenements/${id}/reactiver${porteeQuery(portee)}`, token, "POST", {}, "Réactivation impossible");
}

export function supprimerEvenement(token: string, id: string, portee?: PorteeSerie): Promise<{ supprimees: number; conservees: number }> {
  return authedSend<{ supprimees: number; conservees: number }>(`/api/v1/admin/evenements/${id}${porteeQuery(portee)}`, token, "DELETE", undefined, "Suppression impossible");
}

export function envoyerSondagePointage(
  token: string,
  id: string,
): Promise<{ cibles: number; envoyes: number; canaux: string[]; sans_canal: number; lien: string }> {
  return authedSend(`/api/v1/admin/evenements/${id}/sondage`, token, "POST", {}, "Envoi du sondage impossible");
}

/** One of the four attribution categories carried by every catalogue function. */
export interface CategorieAttribution {
  code: string;
  label: string;
}

/**
 * The four ordered attribution categories, from the consecration title down to
 * the transversal particular roles. The `code` matches the ASCII enum stored on
 * each function's `categorie` field; the `label` is the accented French wording
 * shown in the interface.
 */
export const CATEGORIES_ATTRIBUTION: readonly CategorieAttribution[] = [
  { code: "titre", label: "Titre" },
  { code: "fonction_speciale", label: "Fonction spéciale" },
  { code: "fonction", label: "Fonction" },
  { code: "fonction_particuliere", label: "Fonction particulière" },
];

export interface FonctionHonorifique {
  cle: string;
  libelle_h: string;
  libelle_f: string;
  libelle_n: string;
  categorie: string;
  abreviation: string | null;
  est_vip: boolean;
  ordre: number;
  actif: boolean;
}

export interface FonctionCreateInput {
  cle: string;
  libelle_h: string;
  libelle_f: string;
  libelle_n: string;
  categorie: string;
  abreviation?: string | null;
  est_vip: boolean;
  ordre: number;
}

export interface FonctionUpdateInput {
  libelle_h?: string;
  libelle_f?: string;
  libelle_n?: string;
  categorie?: string;
  abreviation?: string | null;
  est_vip?: boolean;
  ordre?: number;
  actif?: boolean;
}

export function getFonctions(token: string): Promise<FonctionHonorifique[]> {
  return authedGet<FonctionHonorifique[]>("/api/v1/admin/fonctions", token, "Fonctions indisponibles");
}

export function createFonction(token: string, input: FonctionCreateInput): Promise<FonctionHonorifique> {
  return authedSend<FonctionHonorifique>("/api/v1/admin/fonctions", token, "POST", input, "Création impossible");
}

export function updateFonction(
  token: string,
  cle: string,
  input: FonctionUpdateInput,
): Promise<FonctionHonorifique> {
  return authedSend<FonctionHonorifique>(`/api/v1/admin/fonctions/${cle}`, token, "PUT", input, "Mise à jour impossible");
}

export function deleteFonction(token: string, cle: string): Promise<void> {
  return request<void>(`/api/v1/admin/fonctions/${cle}`, token, { method: "DELETE" }, "Retrait impossible");
}

/** Definitive HARD delete (irreversible). Refused server-side (409) while the title
 * still has holders: reassign or detach them first. */
export function supprimerFonctionDefinitif(token: string, cle: string): Promise<{ ok: boolean; cle: string; definitif: boolean }> {
  return authedSend(`/api/v1/admin/fonctions/${cle}/definitif`, token, "DELETE", undefined, "Suppression définitive impossible");
}

export interface FonctionDependances {
  cle: string;
  porteurs: number;
  supprimable: boolean;
  echantillon: string[];
  cibles: { cle: string; nom: string }[];
}
export function getFonctionDependances(token: string, cle: string): Promise<FonctionDependances> {
  return authedGet<FonctionDependances>(`/api/v1/admin/fonctions/${cle}/dependances`, token, "Analyse des porteurs impossible");
}
export function reaffecterFonction(token: string, cle: string, cibleCle: string | null): Promise<{ reaffectes: number; cible_cle: string | null }> {
  return authedSend(`/api/v1/admin/fonctions/${cle}/reaffecter`, token, "POST", { cible_cle: cibleCle }, "Réaffectation impossible");
}

export interface NiveauEngagement {
  cle: string;
  libelle: string;
  ordre: number;
  actif: boolean;
}

export function getNiveaux(token: string): Promise<NiveauEngagement[]> {
  return authedGet<NiveauEngagement[]>("/api/v1/admin/niveaux-engagement", token, "Niveaux indisponibles");
}

export function createNiveau(token: string, input: { cle: string; libelle: string; ordre: number }): Promise<{ ok: boolean }> {
  return authedSend("/api/v1/admin/niveaux-engagement", token, "POST", input, "Création impossible");
}

export function updateNiveau(
  token: string,
  cle: string,
  input: { libelle?: string; ordre?: number; actif?: boolean },
): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/niveaux-engagement/${cle}`, token, "PUT", input, "Mise à jour impossible");
}

export interface NiveauDependances {
  cle: string;
  porteurs: number;
  supprimable: boolean;
  echantillon: string[];
  cibles: { cle: string; nom: string }[];
}
export function getNiveauDependances(token: string, cle: string): Promise<NiveauDependances> {
  return authedGet<NiveauDependances>(`/api/v1/admin/niveaux-engagement/${cle}/dependances`, token, "Analyse des membres impossible");
}
export function reaffecterNiveau(token: string, cle: string, cibleCle: string | null): Promise<{ reaffectes: number; cible_cle: string | null }> {
  return authedSend(`/api/v1/admin/niveaux-engagement/${cle}/reaffecter`, token, "POST", { cible_cle: cibleCle }, "Réaffectation impossible");
}

/** Definitive HARD delete of a level (irreversible). Refused server-side (409) while
 * members are still on it: reassign or clear them first. */
export function supprimerNiveauDefinitif(token: string, cle: string): Promise<{ ok: boolean; cle: string; definitif: boolean }> {
  return authedSend(`/api/v1/admin/niveaux-engagement/${cle}/definitif`, token, "DELETE", undefined, "Suppression définitive impossible");
}

export function validerFonctionMembre(
  token: string,
  membreId: string,
  input: { fonction_cle?: string; confirmee: boolean },
): Promise<{ ok: boolean; fonction_cle: string | null; fonction_confirmee: boolean; titre: string | null }> {
  return authedSend(
    `/api/v1/admin/membres/${membreId}/fonction`,
    token,
    "PUT",
    input,
    "Validation impossible",
  );
}

export interface QuestionInput {
  libelle: string;
  type: string;
  options?: string[];
}

export interface QuestionnaireAdmin {
  id: string;
  titre: string;
  questions: { id: string; libelle: string; type: string; options: string[] }[];
}

export function definirQuestionnaire(
  token: string,
  eventId: string,
  titre: string,
  questions: QuestionInput[],
): Promise<{ id: string; questions: number }> {
  return authedSend(`/api/v1/admin/evenements/${eventId}/questionnaire`, token, "PUT", { titre, questions }, "Enregistrement impossible");
}

export function getQuestionnaireAdmin(token: string, eventId: string): Promise<QuestionnaireAdmin | null> {
  return authedGet<QuestionnaireAdmin | null>(`/api/v1/admin/evenements/${eventId}/questionnaire`, token, "Questionnaire indisponible");
}

/** One question's ANONYMOUS aggregate. Ratings come as a mean + 1..5 distribution;
 * free/choice answers as an author-less list. Never any member identity. */
export interface QuestionnaireQuestionAgregat {
  id: string;
  libelle: string;
  type: string;
  reponses?: number;
  moyenne?: number | null;
  distribution?: Record<string, number>;
  valeurs?: string[];
}

/** Anonymous aggregate of an activity's questionnaire. Below `seuil` responses,
 * `seuil_atteint` is false and no content is exposed (small-cohort protection). */
export interface QuestionnaireAgregat {
  total: number;
  seuil: number;
  seuil_atteint: boolean;
  anonyme: true;
  titre?: string;
  questions: QuestionnaireQuestionAgregat[];
}

export function getReponsesQuestionnaire(token: string, eventId: string): Promise<QuestionnaireAgregat> {
  return authedGet<QuestionnaireAgregat>(`/api/v1/admin/evenements/${eventId}/reponses`, token, "Réponses indisponibles");
}

export interface IntegrationGuide {
  titre?: string;
  aide?: string;
  obtenir?: string;
  roter?: string;
}

export interface IntegrationItem {
  cle: string;
  categorie: string;
  valeur_masquee: string;
  renseigne: boolean;
  maj_le: string | null;
  guide: IntegrationGuide;
  /** Suggested values (quick-picks), used for signatures. */
  suggestions?: string[];
}

export interface CanalStatut {
  actif: boolean;
  autorise?: boolean;
  verrouille?: boolean;
  note?: string;
  provider?: string;
  bot?: string | null;
  gratuit?: boolean;
}

export function getIntegrations(token: string): Promise<IntegrationItem[]> {
  return authedGet<IntegrationItem[]>("/api/v1/admin/integrations", token, "Intégrations indisponibles");
}

export function setIntegration(token: string, cle: string, valeur: string): Promise<{ ok: boolean; valeur_masquee: string }> {
  return authedSend(`/api/v1/admin/integrations/${cle}`, token, "PUT", { valeur }, "Mise à jour impossible");
}

export function getCanauxStatut(token: string): Promise<Record<string, CanalStatut>> {
  return authedGet<Record<string, CanalStatut>>("/api/v1/admin/integrations/statut", token, "Statut indisponible");
}

export interface TypeNotification {
  cle: string;
  libelle: string;
  categorie: string;
  actif: boolean;
  scheduled: boolean;
  sensibilite: string;
}

export function getTypesNotification(token: string): Promise<TypeNotification[]> {
  return authedGet<TypeNotification[]>("/api/v1/admin/notifications/types", token, "Types indisponibles");
}

export function toggleTypeNotification(token: string, cle: string, actif: boolean): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/notifications/types/${cle}`, token, "PUT", { actif }, "Mise à jour impossible");
}

export interface EchecNotification {
  id: string;
  membre_id: string | null;
  membre: string | null;
  type_cle: string;
  canal: string;
  detail: string | null;
  resolu: boolean;
  cree_le: string | null;
}

export interface EchecsNotification {
  ouverts: number;
  echecs: EchecNotification[];
}

export function getEchecsNotification(token: string): Promise<EchecsNotification> {
  return authedGet<EchecsNotification>("/api/v1/admin/notifications/echecs", token, "Échecs indisponibles");
}

export function resoudreEchecNotification(token: string, id: string): Promise<void> {
  return authedSend<void>(`/api/v1/admin/notifications/echecs/${id}/resolu`, token, "POST", {}, "Action impossible");
}

export interface RepartitionLigne {
  cle: string;
  presents: number;
  partiels: number;
  absents: number;
}

export interface ParticipationStats {
  evenement: { id: string; titre: string; debut: string | null; volet: string };
  effectif_attendu: number;
  repondants: number;
  non_repondants: number;
  presents: number;
  presents_presentiel: number;
  presents_enligne: number;
  presents_presentiel_declare?: number;
  presents_modalite_inconnue?: number;
  non_repondants_connectes?: number;
  non_repondants_non_connectes?: number;
  croisement_modalite?: { modalite: string; statut: string; n: number }[];
  definitions?: Record<string, string>;
  partiels: number;
  absents: number;
  brouillons: number;
  hors_cible: number;
  taux_reponse: number;
  taux_non_reponse: number;
  taux_presence: number;
  taux_presence_repondants: number;
  taux_participation: number;
  taux_partiel: number;
  taux_absence: number;
  part_presentiel: number;
  part_en_ligne: number;
  note_moyenne: number | null;
  nb_notes: number;
  taux_reponse_note: number;
  distribution_notes: { note: number; n: number }[];
  repartitions: Record<string, RepartitionLigne[]>;
}

export interface ParticipationGlobal {
  nb_evenements: number;
  repartition_globale: {
    presents: number;
    partiels: number;
    absents: number;
    /** Proven on-site (member-QR scan). */
    presentiel: number;
    presentiel_declare?: number;
    /** Declared online modality (no strong online proof exists). */
    en_ligne: number;
    modalite_inconnue?: number;
  };
  serie_evenements: { id: string; titre: string; debut: string | null; volet: string; presents: number; partiels: number; absents: number }[];
  /** Anonymous attendance cohorts (no nominative ranking, by design). */
  fenetre_assiduite_jours?: number;
  distribution_assiduite?: { tranche: string; membres: number }[];
  evolution_mensuelle?: { mois: string; participations: number }[];
  definitions?: Record<string, string>;
}

export interface MembreParticipationAnalytique {
  fenetre_jours: number;
  evenements_fenetre: number;
  presents: number;
  presents_prouves: number;
  presents_en_ligne: number;
  partiels: number;
  absents: number;
  sans_reponse: number;
  taux_participation: number | null;
  taux_recent: number | null;
  taux_anterieur: number | null;
  historique: { titre: string; debut: string | null; statut: string | null; modalite: string | null; prouve: boolean }[];
  avertissement: string;
}

export function getMembreParticipationAnalytique(token: string, membreId: string): Promise<MembreParticipationAnalytique> {
  return authedGet<MembreParticipationAnalytique>(
    `/api/v1/admin/membres/${membreId}/participation-analytique`,
    token,
    "Analyse indisponible",
  );
}

export function getParticipationStats(token: string, eventId: string): Promise<ParticipationStats> {
  return authedGet<ParticipationStats>(`/api/v1/admin/evenements/${eventId}/participation-stats`, token, "Statistiques indisponibles");
}

export function getParticipationGlobal(token: string): Promise<ParticipationGlobal> {
  return authedGet<ParticipationGlobal>("/api/v1/admin/participation/global", token, "Statistiques indisponibles");
}

export interface ModeleAnniversaire {
  titre: string;
  corps: string;
  image_url: string | null;
  actif: boolean;
}

export function getModeleAnniversaire(token: string): Promise<ModeleAnniversaire> {
  return authedGet<ModeleAnniversaire>("/api/v1/admin/modeles/anniversaire", token, "Modèle indisponible");
}

export function setModeleAnniversaire(token: string, modele: ModeleAnniversaire): Promise<{ ok: boolean }> {
  return authedSend("/api/v1/admin/modeles/anniversaire", token, "PUT", modele, "Enregistrement impossible");
}

export function declencherAnniversaires(token: string): Promise<{ ok: boolean; envoyes: number }> {
  return authedSend("/api/v1/admin/anniversaires/declencher", token, "POST", {}, "Déclenchement impossible");
}

export interface RetentionConfig {
  retention_info_archive_mois: number;
  retention_info_suppression_mois: number;
  retention_notif_lues_jours: number;
  retention_notif_nonlues_jours: number;
  retention_notif_suppression_mois: number;
  retention_auto_suppression: boolean;
  telegram_retention_jours: number;
}

export interface TelegramCapacite {
  retention_configuree_jours: number;
  fenetre_suppression_bot_heures: number;
  messages_eligibles: number;
  note: string;
}

export interface RetentionEtat {
  config: RetentionConfig;
  telegram_capacite: TelegramCapacite;
  derniere_execution: { execute_le: string | null; rapport: string | null; resultat: string | null } | null;
}

export interface RetentionRapport {
  simulation: boolean;
  acteur: string;
  informations_archivees: number;
  informations_protegees: number;
  informations_supprimees: number;
  notifications_archivees: number;
  notifications_supprimees: number;
  telegram_traites: number;
  suppression_active: boolean;
}

export interface RetentionJournalItem {
  type_element: string;
  element_id: string | null;
  titre: string | null;
  regle: string | null;
  acteur: string | null;
  destinataires: number | null;
  resultat: string;
  motif_exclusion: string | null;
  rapport: string | null;
  execute_le: string | null;
}

// Institutional identity is a flexible key/value set (org_*), extendable without a
// migration. The known keys are documented in the page; unknown keys pass through.
export type IdentiteInstitutionnelle = Record<string, string>;

export interface DateInstitutionnelle {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  date_fixe: string | null;
  mois: number | null;
  jour: number | null;
  annee_origine: number | null;
  repetition_annuelle: boolean;
  afficher_calendrier: boolean;
  couleur: string;
  priorite: string;
  statut: string;
  categorie: string;
  toute_journee: boolean;
  heure_debut: string | null;
  heure_fin: string | null;
  lieu: string | null;
  lien: string | null;
  image_url: string | null;
  message_membre: string | null;
  source: string | null;
  note_admin: string | null;
  rappel_jours: number;
  visibilite: string;
  actif: boolean;
}

export type DateInstitInput = Omit<DateInstitutionnelle, "id">;

export interface ReferenceCouleur {
  cle: string;
  libelle: string;
  hex: string;
  categorie: string;
  icone: string | null;
  actif: boolean;
}

export interface DateLiturgique {
  id: string;
  cle: string;
  nom: string;
  type: string;
  mois: number | null;
  jour: number | null;
  cle_mobile: string | null;
  rang: string;
  categorie: string;
  couleur: string;
  description: string | null;
  source: string | null;
  visibilite: string;
  actif: boolean;
  ordre: number;
}

export interface DateLiturgiquePatch {
  nom?: string;
  couleur?: string;
  rang?: string;
  description?: string | null;
  source?: string | null;
  visibilite?: string;
  actif?: boolean;
}

export interface OccurrenceReference {
  source_id: string;
  origine: string;
  categorie: string;
  type: string | null;
  titre: string;
  date: string;
  couleur: string | null;
  priorite: string | null;
  rang: string | null;
  toute_journee: boolean;
  heure_debut: string | null;
  heure_fin: string | null;
  anciennete: number | null;
  description: string | null;
  image_url: string | null;
  lieu: string | null;
  lien: string | null;
  message_membre: string | null;
  source: string | null;
  badge: string;
  est_activite: boolean;
}

export interface ApercuCalendrier {
  annee: number;
  occurrences: OccurrenceReference[];
  alertes: { niveau: string; message: string }[];
  resume: { total: number; institution: number; liturgie: number };
}

export interface CentreDiffusion {
  informations_actives: number;
  informations_expirant_48h: number;
  informations_brouillons: number;
  informations_programmees: number;
  informations_archivees: number;
  taux_lecture: number;
  lus: number;
  destinataires_90j: number;
  informations_non_lues: number;
  telegram_relais_30j: number;
  echecs_envoi: number;
  derniere_retention: { execute_le: string | null; rapport: string | null } | null;
  expirant_bientot: { id: string; titre: string | null; priorite: string; expire_le: string | null }[];
}

export function getCentreDiffusion(token: string): Promise<CentreDiffusion> {
  return authedGet<CentreDiffusion>("/api/v1/admin/communication/centre-diffusion", token, "Centre de diffusion indisponible");
}

/** Download the per-recipient delivery CSV of an Information (triggers a file save). */
export async function exportInformationCSV(token: string, infoId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/admin/informations/${infoId}/export`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Export impossible");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diffusion-${infoId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Re-send a sent Information on its relay channels to the recipients who have not read it. */
export function relanceInformation(token: string, infoId: string): Promise<{ non_lus: number; telegram: { envoyes: number }; email: { envoyes: number } }> {
  return authedSend(`/api/v1/admin/informations/${infoId}/relance`, token, "POST", {}, "Relance impossible");
}

export function getIdentiteInstitutionnelle(token: string): Promise<IdentiteInstitutionnelle> {
  return authedGet<IdentiteInstitutionnelle>("/api/v1/admin/parametres/identite-institutionnelle", token, "Identité indisponible");
}
export function setIdentiteInstitutionnelle(token: string, payload: IdentiteInstitutionnelle): Promise<void> {
  return authedSend("/api/v1/admin/parametres/identite-institutionnelle", token, "PUT", { valeurs: payload }, "Mise à jour impossible");
}
export function getReferenceCouleurs(token: string): Promise<ReferenceCouleur[]> {
  return authedGet<ReferenceCouleur[]>("/api/v1/admin/reference-couleurs", token, "Couleurs indisponibles");
}
export function getCalendrierLiturgique(token: string): Promise<DateLiturgique[]> {
  return authedGet<DateLiturgique[]>("/api/v1/admin/calendrier-liturgique", token, "Calendrier liturgique indisponible");
}
export function patchCalendrierLiturgique(token: string, id: string, patch: DateLiturgiquePatch): Promise<DateLiturgique> {
  return authedSend(`/api/v1/admin/calendrier-liturgique/${id}`, token, "PATCH", patch, "Mise à jour impossible");
}
export function getApercuCalendrier(token: string, annee: number): Promise<ApercuCalendrier> {
  return authedGet<ApercuCalendrier>(`/api/v1/admin/calendrier-institutionnel/apercu?annee=${annee}`, token, "Aperçu indisponible");
}
/** Download the reference-date iCalendar (.ics) for a year (triggers a file save). */
export async function telechargerApercuICS(token: string, annee: number): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/admin/calendrier-institutionnel/apercu.ics?annee=${annee}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Export iCalendar impossible");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dates-reference-${annee}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export function getDatesInstitutionnelles(token: string): Promise<DateInstitutionnelle[]> {
  return authedGet<DateInstitutionnelle[]>("/api/v1/admin/dates-institutionnelles", token, "Dates indisponibles");
}
export function createDateInstitutionnelle(token: string, payload: DateInstitInput, force = false): Promise<DateInstitutionnelle> {
  const q = force ? "?force=true" : "";
  return authedSend(`/api/v1/admin/dates-institutionnelles${q}`, token, "POST", payload, "Création impossible");
}
export function updateDateInstitutionnelle(token: string, id: string, payload: DateInstitInput): Promise<DateInstitutionnelle> {
  return authedSend(`/api/v1/admin/dates-institutionnelles/${id}`, token, "PATCH", payload, "Mise à jour impossible");
}
export function deleteDateInstitutionnelle(token: string, id: string): Promise<void> {
  return authedSend(`/api/v1/admin/dates-institutionnelles/${id}`, token, "DELETE", undefined, "Suppression impossible");
}

export interface DateVersion {
  id: string;
  snapshot: DateInstitutionnelle;
  auteur: string | null;
  cree_le: string | null;
}
export function getVersionsDate(token: string, dateId: string): Promise<DateVersion[]> {
  return authedGet<DateVersion[]>(`/api/v1/admin/dates-institutionnelles/${dateId}/versions`, token, "Historique indisponible");
}
export function restaurerVersionDate(token: string, dateId: string, versionId: string): Promise<DateInstitutionnelle> {
  return authedSend(`/api/v1/admin/dates-institutionnelles/${dateId}/restaurer/${versionId}`, token, "POST", undefined, "Restauration impossible");
}

export function getRetentionEtat(token: string): Promise<RetentionEtat> {
  return authedGet<RetentionEtat>("/api/v1/admin/parametres/retention", token, "Paramètres de rétention indisponibles");
}

export function setRetentionConfig(token: string, config: RetentionConfig): Promise<void> {
  return authedSend("/api/v1/admin/parametres/retention", token, "PUT", config, "Mise à jour impossible");
}

export function executerRetention(token: string, simulation: boolean): Promise<RetentionRapport> {
  return authedSend(`/api/v1/admin/retention/executer?simulation=${simulation ? "true" : "false"}`, token, "POST", {}, "Exécution impossible");
}

export function getRetentionJournal(token: string, limit = 30, offset = 0): Promise<{ items: RetentionJournalItem[]; total: number }> {
  return authedGet(`/api/v1/admin/retention/journal?limit=${limit}&offset=${offset}`, token, "Journal indisponible");
}

export function getQuestionnaireFenetre(token: string): Promise<{ heures: number }> {
  return authedGet<{ heures: number }>("/api/v1/admin/parametres/questionnaire-fenetre", token, "Paramètre indisponible");
}

export function setQuestionnaireFenetre(token: string, heures: number): Promise<{ heures: number }> {
  return authedSend("/api/v1/admin/parametres/questionnaire-fenetre", token, "PUT", { heures }, "Mise à jour impossible");
}

/** Survey window in minutes (default 120 = 2 h), adjustable in 30-minute steps
 * from 0 (0 closes the survey exactly when the activity ends). */
export function getQuestionnaireFenetreMinutes(token: string): Promise<{ minutes: number }> {
  return authedGet<{ minutes: number }>("/api/v1/admin/parametres/questionnaire-fenetre-minutes", token, "Paramètre indisponible");
}

export function setQuestionnaireFenetreMinutes(token: string, minutes: number): Promise<{ minutes: number }> {
  return authedSend("/api/v1/admin/parametres/questionnaire-fenetre-minutes", token, "PUT", { minutes }, "Mise à jour impossible");
}

export function getHebdoHeureEnvoi(token: string): Promise<{ heure: number }> {
  return authedGet<{ heure: number }>("/api/v1/admin/parametres/hebdo-heure-envoi", token, "Paramètre indisponible");
}
export function setHebdoHeureEnvoi(token: string, heure: number): Promise<{ heure: number }> {
  return authedSend("/api/v1/admin/parametres/hebdo-heure-envoi", token, "PUT", { heure }, "Mise à jour impossible");
}

export function getSemaineJourDebut(token: string): Promise<{ jour: number }> {
  return authedGet<{ jour: number }>("/api/v1/admin/parametres/semaine-jour-debut", token, "Paramètre indisponible");
}

export function setSemaineJourDebut(token: string, jour: number): Promise<{ jour: number }> {
  return authedSend("/api/v1/admin/parametres/semaine-jour-debut", token, "PUT", { jour }, "Mise à jour impossible");
}

export function getIntendances(token: string): Promise<Intendance[]> {
  return authedGet<Intendance[]>("/api/v1/admin/intendances", token, "Intendances indisponibles");
}

export function createIntendance(token: string, input: IntendanceInput & { nom: string }): Promise<Intendance> {
  return authedSend<Intendance>("/api/v1/admin/intendances", token, "POST", input, "Création impossible");
}

export function updateIntendance(token: string, id: string, input: IntendanceInput): Promise<Intendance> {
  return authedSend<Intendance>(`/api/v1/admin/intendances/${id}`, token, "PUT", input, "Mise à jour impossible");
}

export function getBergers(token: string): Promise<Berger[]> {
  return authedGet<Berger[]>("/api/v1/admin/bergers", token, "Bergers indisponibles");
}

export function getCoordinations(token: string): Promise<Coordination[]> {
  return authedGet<Coordination[]>("/api/v1/admin/coordinations", token, "Coordinations indisponibles");
}

export function createCoordination(token: string, input: CoordinationInput & { nom: string }): Promise<Coordination> {
  return authedSend<Coordination>("/api/v1/admin/coordinations", token, "POST", input, "Création impossible");
}

export function updateCoordination(token: string, id: string, input: CoordinationInput): Promise<Coordination> {
  return authedSend<Coordination>(`/api/v1/admin/coordinations/${id}`, token, "PUT", input, "Mise à jour impossible");
}

export function getSousCommissions(token: string): Promise<SousCommission[]> {
  return authedGet<SousCommission[]>("/api/v1/admin/sous-commissions", token, "Sous-commissions indisponibles");
}

export function createSousCommission(
  token: string,
  input: { nom: string; commission_id?: string },
): Promise<SousCommission> {
  return authedSend<SousCommission>("/api/v1/admin/sous-commissions", token, "POST", input, "Création impossible");
}

export interface BulkResult {
  crees: number;
  doublons: string[];
  erreurs: { email: string; raison: string }[];
}

export function bulkCreateUtilisateurs(
  token: string,
  comptes: { email: string; password: string }[],
): Promise<BulkResult> {
  return authedSend<BulkResult>("/api/v1/admin/utilisateurs/lot", token, "POST", { comptes }, "Création impossible");
}

export function getUtilisateurs(token: string): Promise<Utilisateur[]> {
  return authedGet<Utilisateur[]>("/api/v1/admin/utilisateurs", token, "Comptes indisponibles");
}

export function createUtilisateur(
  token: string,
  // No role field: the server always creates the account as 'membre'; elevated
  // access is granted afterwards only through an access group.
  input: { email: string; password: string; membre_id?: string },
): Promise<Utilisateur> {
  return authedSend<Utilisateur>("/api/v1/admin/utilisateurs", token, "POST", input, "Création impossible");
}

export function updateUtilisateur(
  token: string,
  id: string,
  input: { role?: string; actif?: boolean },
): Promise<Utilisateur> {
  return authedSend<Utilisateur>(`/api/v1/admin/utilisateurs/${id}`, token, "PATCH", input, "Mise à jour impossible");
}

// --- Groupes d'accès (RBAC) : l'accès plateforme est un droit accordé, jamais l'identité du membre. ---

export interface GroupeAcces {
  id: string;
  cle: string;
  libelle: string;
  description: string | null;
  role_accorde: string;
  mode: string;
  permissions: string[];
  membres_count: number;
  systeme: boolean;
  actif: boolean;
  /** Optional application this group serves (application.code), for per-app grouping. */
  application_code: string | null;
}

export interface CreateGroupeInput {
  cle: string;
  libelle: string;
  description?: string | null;
  mode: "role" | "permissions";
  role_accorde?: string | null;
  permissions?: string[];
  application_code?: string | null;
}

export interface UpdateGroupeInput {
  libelle?: string;
  description?: string | null;
  actif?: boolean;
  permissions?: string[];
  application_code?: string | null;
}

export interface Appartenance {
  appartenance_id: string;
  groupe_id: string;
  cle: string;
  libelle: string;
  role_accorde: string;
  /** False when the group itself is deactivated: the membership then grants nothing. */
  groupe_actif: boolean;
  /** 'role' or 'permissions' (a permission-mode group is not a platform role). */
  mode: string;
  portee_type: string;
  portee_id: string | null;
  portee_libelle: string | null;
  ajoute_le: string | null;
  ajoute_par_nom: string | null;
}

export interface MembreGroupes {
  membre_id: string;
  effective_role: string;
  groupes: Appartenance[];
}

export interface UniteOrg {
  id: string;
  nom: string;
}

export interface PerimetresDisponibles {
  coordination: UniteOrg[];
  intendance: UniteOrg[];
  commission: UniteOrg[];
  tribu: UniteOrg[];
}

export function getGroupes(token: string, inclureInactifs = false): Promise<GroupeAcces[]> {
  const q = inclureInactifs ? "?inclure_inactifs=true" : "";
  return authedGet<GroupeAcces[]>(`/api/v1/admin/groupes${q}`, token, "Groupes indisponibles");
}

export function createGroupe(token: string, input: CreateGroupeInput): Promise<GroupeAcces> {
  return authedSend<GroupeAcces>("/api/v1/admin/groupes", token, "POST", input, "Création du groupe impossible");
}

export function updateGroupe(token: string, groupeId: string, input: UpdateGroupeInput): Promise<GroupeAcces> {
  return authedSend<GroupeAcces>(`/api/v1/admin/groupes/${groupeId}`, token, "PATCH", input, "Modification du groupe impossible");
}

export function deleteGroupe(token: string, groupeId: string): Promise<{ supprime: boolean; id: string }> {
  return authedSend(`/api/v1/admin/groupes/${groupeId}`, token, "DELETE", undefined, "Suppression du groupe impossible");
}

/** Everything an administrator must read before granting a group. */
export interface PermissionAccordee {
  cle: string;
  libelle: string;
  domaine: string | null;
  risque: string | null;
  portee: string | null;
  description: string | null;
  limite: string | null;
}

export interface FicheGroupe {
  identite: {
    id: string; cle: string; libelle: string; description: string | null;
    type: "standard" | "personnalise"; statut: string; modifiable: boolean;
    application_code: string | null; version: number | null;
    cree_le: string | null; cree_par: string | null; maj_le: string | null; maj_par: string | null;
  };
  finalite: { objectif: string | null; usage_recommande: string | null; usage_deconseille: string | null };
  portee: { texte: string | null; application_code: string | null; custom_scope: string | null; sensibilite: string | null };
  permissions: { mode: string; role_accorde: string | null; accordees: PermissionAccordee[]; total: number };
  gouvernance: {
    avertissement_securite: string | null; attribution_requiert: string;
    modification_requiert: string | null; duplication_requiert: string; protege: boolean;
  };
  membres: { total: number };
  lignee: {
    derive_d_un_standard: boolean;
    source: { id: string; cle: string; libelle: string; version: number | null } | null;
    source_version: number | null;
    inheritance_mode: string | null;
  };
}

export interface MembreDuGroupe {
  appartenance_id: string;
  membre_id: string;
  nom_affiche: string;
  matricule: string | null;
  statut_membre: string | null;
  photo_url: string | null;
  role_interne: string | null;
  portee_type: string | null;
  portee_id: string | null;
  actif: boolean;
  ajoute_le: string | null;
  ajoute_par: string | null;
  retire_le: string | null;
}

export interface EvenementGroupe {
  id: number;
  action: string;
  libelle: string;
  acteur: string | null;
  acteur_role: string | null;
  details: Record<string, unknown> | null;
  horodatage: string | null;
}

export interface PageApi<T> {
  items: T[];
  total: number;
  page: number;
  taille: number;
  pages: number;
}

export interface ComparaisonGroupe {
  groupe: { id: string; cle: string; libelle: string };
  source: { id: string; cle: string; libelle: string; version_actuelle: number | null; version_copiee: number | null };
  modele_a_evolue: boolean;
  permissions_identiques: PermissionAccordee[];
  permissions_ajoutees: PermissionAccordee[];
  permissions_retirees: PermissionAccordee[];
  resume: { identiques: number; ajoutees: number; retirees: number };
  portee_differente: boolean;
}

export function getFicheGroupe(token: string, groupeId: string): Promise<FicheGroupe> {
  return authedGet(`/api/v1/admin/groupes/${groupeId}/fiche`, token, "Fiche du groupe indisponible");
}

export function getMembresDuGroupe(
  token: string, groupeId: string, opts: { page?: number; taille?: number; q?: string; actif?: boolean } = {},
): Promise<PageApi<MembreDuGroupe>> {
  const p = new URLSearchParams();
  p.set("page", String(opts.page ?? 1));
  p.set("taille", String(opts.taille ?? 10));
  if (opts.q) p.set("q", opts.q);
  if (opts.actif !== undefined) p.set("actif", String(opts.actif));
  return authedGet(`/api/v1/admin/groupes/${groupeId}/membres?${p}`, token, "Membres du groupe indisponibles");
}

export function getHistoriqueGroupe(
  token: string, groupeId: string, opts: { page?: number; taille?: number } = {},
): Promise<PageApi<EvenementGroupe>> {
  const p = new URLSearchParams();
  p.set("page", String(opts.page ?? 1));
  p.set("taille", String(opts.taille ?? 10));
  return authedGet(`/api/v1/admin/groupes/${groupeId}/historique?${p}`, token, "Historique indisponible");
}

export function getComparaisonGroupe(token: string, groupeId: string): Promise<ComparaisonGroupe> {
  return authedGet(`/api/v1/admin/groupes/${groupeId}/comparaison`, token, "Comparaison indisponible");
}

export interface DupliquerGroupeInput {
  libelle: string;
  description: string;
  application_code?: string | null;
  custom_scope?: string | null;
}

export function dupliquerGroupe(
  token: string, groupeId: string, input: DupliquerGroupeInput,
): Promise<{ id: string; cle: string; libelle: string; permissions_copiees: number; source: { id: string; cle: string } }> {
  return authedSend(`/api/v1/admin/groupes/${groupeId}/dupliquer`, token, "POST", input, "Duplication impossible");
}

export interface ReconciliationAcces {
  resume: {
    comptes_privilegies_actifs: number; adosses_a_un_groupe: number;
    alignables: number; comptes_techniques_sans_membre: number;
  };
  alignables: { utilisateur_id: string; email: string; role: string; membre_id: string | null; nom: string | null;
    groupe_suggere: { id: string; cle: string; libelle: string } | null }[];
  comptes_techniques: { utilisateur_id: string; email: string; role: string; nom: string | null }[];
  explication: string;
}

export function getReconciliationAcces(token: string): Promise<ReconciliationAcces> {
  return authedGet("/api/v1/admin/gouvernance/reconciliation", token, "Réconciliation indisponible");
}

export function getPerimetresDisponibles(token: string): Promise<PerimetresDisponibles> {
  return authedGet<PerimetresDisponibles>("/api/v1/admin/perimetres-disponibles", token, "Périmètres indisponibles");
}

export interface Capability {
  cle: string;
  libelle: string;
  description: string;
  risque: string;
  portee: string;
}

export interface CatalogueRole {
  role: string;
  libelle: string;
  risque: string;
  capabilities: Capability[];
}

export interface AccesEffectifItem {
  role: string;
  role_libelle: string;
  risque: string;
  portee_type: string;
  portee_libelle: string | null;
  portee_texte: string;
  capabilities: Capability[];
}

export interface AccesEffectif {
  membre_id: string;
  role_global_effectif: string;
  risque_global: string;
  acces: AccesEffectifItem[];
  avertissements: string[];
}

export function getCatalogueAcces(token: string): Promise<{ roles: CatalogueRole[] }> {
  return authedGet<{ roles: CatalogueRole[] }>("/api/v1/admin/catalogue-acces", token, "Catalogue indisponible");
}

export function getAccesEffectif(token: string, membreId: string): Promise<AccesEffectif> {
  return authedGet<AccesEffectif>(`/api/v1/admin/membres/${membreId}/acces-effectif`, token, "Accès effectif indisponible");
}

export function getMembreGroupes(token: string, membreId: string): Promise<MembreGroupes> {
  return authedGet<MembreGroupes>(`/api/v1/admin/membres/${membreId}/groupes`, token, "Groupes du membre indisponibles");
}

export function ajouterMembreGroupe(
  token: string,
  membreId: string,
  input: { groupe_id: string; portee_type: string; portee_id: string | null },
): Promise<{ membre_id: string; effective_role: string; mot_de_passe_temporaire: string | null }> {
  return authedSend(`/api/v1/admin/membres/${membreId}/groupes`, token, "POST", input, "Ajout au groupe impossible");
}

export function retirerMembreGroupe(
  token: string,
  membreId: string,
  appartenanceId: string,
): Promise<{ membre_id: string; effective_role: string }> {
  return authedSend(`/api/v1/admin/membres/${membreId}/groupes/${appartenanceId}`, token, "DELETE", undefined, "Retrait du groupe impossible");
}

export function getComptage(token: string, evenementId: string): Promise<ComptageResume> {
  return authedGet<ComptageResume>(`/api/v1/admin/comptage/${evenementId}`, token, "Comptage indisponible");
}

export interface EvenementEligible {
  id: string;
  titre: string;
  debut: string | null;
  lieu: string | null;
  annule: boolean;
}
export interface EvenementsEligibles {
  items: EvenementEligible[];
  total: number;
}
/** Server-filtered, paginated list of the events eligible for volet B counting, so the
 * selector stays fast and never downloads the whole history to the browser. */
export function getEvenementsEligiblesComptage(
  token: string,
  opts: { q?: string; periode?: "pertinents" | "a_venir" | "passes" | "tous"; limit?: number; offset?: number } = {},
): Promise<EvenementsEligibles> {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.periode) p.set("periode", opts.periode);
  p.set("limit", String(opts.limit ?? 25));
  p.set("offset", String(opts.offset ?? 0));
  return authedGet<EvenementsEligibles>(`/api/v1/admin/comptage/evenements-eligibles?${p.toString()}`, token, "Événements indisponibles");
}

export function addComptage(
  token: string,
  input: { evenement_id: string; segment?: string; total_membres?: number; total_anonyme?: number },
): Promise<ComptageResume> {
  return authedSend<ComptageResume>("/api/v1/admin/comptage", token, "POST", input, "Saisie impossible");
}

export function getAudit(token: string): Promise<AuditEntry[]> {
  return authedGet<AuditEntry[]>("/api/v1/admin/audit", token, "Journal indisponible");
}

export function getTerminaux(token: string): Promise<Terminal[]> {
  return authedGet<Terminal[]>("/api/v1/admin/terminaux", token, "Terminaux indisponibles");
}

export function createTerminal(
  token: string,
  input: { nom: string; appareil_id: string },
): Promise<Terminal> {
  return authedSend<Terminal>("/api/v1/admin/terminaux", token, "POST", input, "Enregistrement impossible");
}

export function updateTerminal(
  token: string,
  id: string,
  input: { autorise?: boolean; nom?: string },
): Promise<Terminal> {
  return authedSend<Terminal>(`/api/v1/admin/terminaux/${id}`, token, "PATCH", input, "Mise à jour impossible");
}

export function getTribus(token: string): Promise<Tribu[]> {
  return authedGet<Tribu[]>("/api/v1/admin/tribus", token, "Tribus indisponibles");
}

/** Assign (membreId set) or revoke (membreId null) the human patriarche of a tribe. */
export function setPatriarche(
  token: string,
  tribuId: string,
  membreId: string | null,
  motif?: string,
): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/tribus/${tribuId}/patriarche`, token, "PUT", { membre_id: membreId, motif }, "Attribution impossible");
}

/** An administrable event type with its UNIQUE colour, used to distinguish events
 * on the member calendar and offered in the planning dropdowns. */
export interface TypeEvenement {
  id: string;
  code: string;
  nom: string;
  couleur: string;
  description?: string | null;
  publie: boolean;
  ordre: number;
}

export function getTypesEvenements(token: string): Promise<TypeEvenement[]> {
  return authedGet<TypeEvenement[]>("/api/v1/admin/types-evenements", token, "Types d'événements indisponibles");
}

/** Application access (LEVEL 1) governance for a single member. */
export interface ApplicationAcces {
  code: string;
  nom: string;
  description?: string | null;
  url?: string | null;
  actif: boolean;
  acces_actif: boolean;
  /** Visible by default to every member (the member space): visibility is automatic. */
  est_defaut?: boolean;
}
export function getMembreApplications(token: string, membreId: string): Promise<ApplicationAcces[]> {
  return authedGet<ApplicationAcces[]>(`/api/v1/admin/membres/${membreId}/applications`, token, "Accès applicatifs indisponibles");
}
/** The application catalogue, for the per-application governance tabs. */
export function getApplications(token: string): Promise<ApplicationAcces[]> {
  return authedGet<ApplicationAcces[]>("/api/v1/admin/applications", token, "Applications indisponibles");
}
/** Members who currently HAVE access to one application (LEVEL 1). */
export interface MembreAvecAcces {
  membre_id: string;
  nom: string;
  matricule?: string | null;
  roles: string[];
}
export function getApplicationMembres(token: string, code: string): Promise<MembreAvecAcces[]> {
  return authedGet<MembreAvecAcces[]>(`/api/v1/admin/applications/${code}/membres`, token, "Membres de l'application indisponibles");
}
/** A group assigned to a member FOR one application (removed when access is revoked). */
export interface GroupeAssigne {
  membre_groupe_id: string;
  groupe_id: string;
  cle: string;
  libelle: string;
  /** Granted platform role; 'membre' for a permission-mode group. Rights apply GLOBALLY. */
  role_accorde: string;
  /** A deactivated group grants nothing and no longer opens the application. */
  groupe_actif: boolean;
}
export function getGroupesMembreApplication(token: string, membreId: string, code: string): Promise<GroupeAssigne[]> {
  return authedGet<GroupeAssigne[]>(`/api/v1/admin/membres/${membreId}/applications/${code}/groupes`, token, "Groupes de l'application indisponibles");
}
export function setGroupeMembreApplication(token: string, membreId: string, code: string, groupeId: string, actif: boolean): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/membres/${membreId}/applications/${code}/groupes/${groupeId}`, token, "PUT", { actif }, "Modification du groupe impossible");
}
export function setMembreApplication(token: string, membreId: string, code: string, actif: boolean): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/membres/${membreId}/applications/${code}`, token, "PUT", { actif }, "Modification d'accès impossible");
}

/** Suggest the next unused colour so a new type never collides with an existing one. */
export function getCouleurSuggeree(token: string, eviter?: string): Promise<{ couleur: string }> {
  const q = eviter ? `?eviter=${encodeURIComponent(eviter)}` : "";
  return authedGet<{ couleur: string }>(`/api/v1/admin/types-evenements/couleur-suggeree${q}`, token, "Couleur indisponible");
}

export function createTypeEvenement(
  token: string,
  input: { nom: string; description?: string; couleur?: string },
): Promise<TypeEvenement> {
  return authedSend<TypeEvenement>("/api/v1/admin/types-evenements", token, "POST", input, "Création impossible");
}

export function updateTypeEvenement(
  token: string,
  id: string,
  fields: { nom?: string; description?: string; couleur?: string; publie?: boolean },
): Promise<TypeEvenement> {
  return authedSend<TypeEvenement>(`/api/v1/admin/types-evenements/${id}`, token, "PATCH", fields, "Modification impossible");
}

export function deleteTypeEvenement(token: string, id: string): Promise<void> {
  return request<void>(`/api/v1/admin/types-evenements/${id}`, token, { method: "DELETE" }, "Suppression impossible");
}

export function getStatistiques(token: string): Promise<Statistiques> {
  return authedGet<Statistiques>("/api/v1/admin/statistiques", token, "Statistiques indisponibles");
}

export interface DetectionMembre {
  id: string;
  matricule: string;
  prenoms: string | null;
  nom: string | null;
  verifie: boolean;
}

export interface DetectionDoublon {
  id: string;
  score: number;
  signaux: Record<string, number | boolean>;
  statut: string;
  note: string | null;
  detecte_le: string | null;
  decide_le: string | null;
  membre_a: DetectionMembre;
  membre_b: DetectionMembre;
}

export type DecisionDoublon = "confirme" | "ignore" | "documents_demandes" | "nouveau";

export interface ComparaisonLigne {
  champ: string;
  a: string | null;
  b: string | null;
  identique: boolean;
}

export interface Comparaison {
  a: { id: string; matricule: string; verifie: boolean; photo_url: string | null };
  b: { id: string; matricule: string; verifie: boolean; photo_url: string | null };
  lignes: ComparaisonLigne[];
}

export function getDoublons(token: string, statut?: string): Promise<DetectionDoublon[]> {
  const q = statut ? `?statut=${encodeURIComponent(statut)}` : "";
  return authedGet<DetectionDoublon[]>(`/api/v1/admin/doublons${q}`, token, "Détection indisponible");
}

export function scanDoublons(token: string): Promise<{ ok: boolean; seuil: number; pairs_scanned: number; flagged: number }> {
  return authedSend("/api/v1/admin/doublons/scan", token, "POST", {}, "Analyse impossible");
}

export function getComparaisonDoublon(token: string, a: string, b: string): Promise<Comparaison> {
  return authedGet<Comparaison>(`/api/v1/admin/doublons/comparaison?a=${a}&b=${b}`, token, "Comparaison indisponible");
}

export function deciderDoublon(token: string, id: string, statut: DecisionDoublon, note?: string): Promise<{ ok: boolean; statut: string }> {
  return authedSend(`/api/v1/admin/doublons/${id}/statut`, token, "POST", { statut, note: note ?? null }, "Décision impossible");
}

export interface ApercuFusion {
  survivant: { id: string; nom: string | null };
  doublon: { id: string; nom: string | null };
  references_a_deplacer: number;
  compte_survivant: boolean;
  compte_doublon: boolean;
  bloque_deux_comptes: boolean;
}
export function apercuFusionDoublon(token: string, survivantId: string, doublonId: string): Promise<ApercuFusion> {
  return authedGet<ApercuFusion>(`/api/v1/admin/doublons/fusion/apercu?survivant_id=${survivantId}&doublon_id=${doublonId}`, token, "Aperçu de fusion impossible");
}
export function fusionnerDoublon(token: string, survivantId: string, doublonId: string): Promise<{ ok: boolean; references_deplacees: Record<string, number> }> {
  return authedSend(`/api/v1/admin/doublons/fusion`, token, "POST", { survivant_id: survivantId, doublon_id: doublonId }, "Fusion impossible");
}

export function getSeuilDoublon(token: string): Promise<{ seuil: number }> {
  return authedGet<{ seuil: number }>("/api/v1/admin/doublons/seuil", token, "Seuil indisponible");
}

export function setSeuilDoublon(token: string, seuil: number): Promise<{ seuil: number }> {
  return authedSend("/api/v1/admin/doublons/seuil", token, "PUT", { seuil }, "Mise à jour impossible");
}

// --- Registrations (inscriptions) ---
export interface InscriptionItem {
  id: string;
  matricule: string;
  nom: string;
  email: string;
  statut: string;
  statut_libelle?: string;
  soumis_le: string | null;
  decision_le?: string | null;
  nb_documents: number;
}

export type InscriptionFiltre = "en_cours" | "recus" | "a_valider" | "validees" | "refusees" | "toutes";

export interface InscriptionCompteurs {
  en_cours: number;
  recus: number;
  a_valider: number;
  validees: number;
  refusees: number;
  toutes: number;
}

export function getInscriptions(token: string, filtre: InscriptionFiltre = "a_valider"): Promise<InscriptionItem[]> {
  return authedGet<InscriptionItem[]>(`/api/v1/admin/inscriptions?filtre=${filtre}`, token, "Inscriptions indisponibles");
}

export function getInscriptionCompteurs(token: string): Promise<InscriptionCompteurs> {
  return authedGet<InscriptionCompteurs>("/api/v1/admin/inscriptions/compteurs", token, "Compteurs indisponibles");
}

// --- Engagement (public intake) ---
export interface EngagementInvitation {
  id: string;
  email: string;
  prenoms: string | null;
  nom: string | null;
  telephone: string | null;
  pays_indicatif: string | null;
  pays_code: string | null;
  source: string;
  statut: string;
  membre_id: string | null;
  remerciement_envoye: boolean;
  cree_le: string | null;
  converti_le: string | null;
}

export interface EngagementDashboardData {
  total: number;
  par_canal: Record<string, number>;
  par_pays: Record<string, number>;
  en_attente: number;
  converti: number;
}

export interface EngagementConvertResult {
  convertis: number;
  details: { id: string; matricule: string }[];
  ignores: string[];
  erreurs: { id: string; raison: string }[];
}

export interface EngagementImportResult {
  crees: number;
  doublons: string[];
  erreurs: { email: string; raison: string }[];
}

export function getEngagementInvitations(token: string, statut = "en_attente"): Promise<EngagementInvitation[]> {
  return authedGet<EngagementInvitation[]>(`/api/v1/admin/engagement/invitations?statut=${statut}`, token, "Invitations indisponibles");
}

export function getEngagementDashboard(token: string): Promise<EngagementDashboardData> {
  return authedGet<EngagementDashboardData>("/api/v1/admin/engagement/dashboard", token, "Indicateurs indisponibles");
}

export function createEngagementManuel(
  token: string,
  input: { email: string; prenoms?: string | null; nom?: string | null; telephone?: string | null; pays_indicatif?: string | null; pays_code?: string | null },
): Promise<{ id: string }> {
  return authedSend("/api/v1/admin/engagement/invitations", token, "POST", input, "Ajout impossible");
}

export function convertirEngagement(token: string, ids: string[]): Promise<EngagementConvertResult> {
  return authedSend<EngagementConvertResult>("/api/v1/admin/engagement/convertir", token, "POST", { ids }, "Conversion impossible");
}

export async function importEngagement(token: string, file: File): Promise<EngagementImportResult> {
  const form = new FormData();
  form.append("fichier", file);
  const res = await fetch(`${BASE}/api/v1/admin/engagement/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new ApiError((await res.json().catch(() => ({}))).detail ?? "Import impossible", res.status);
  return (await res.json()) as EngagementImportResult;
}

export async function downloadEngagementTemplate(token: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/admin/engagement/template.xlsx`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError("Modèle indisponible", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-engagements.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export function decisionInscription(
  token: string,
  membreId: string,
  decision: string,
  motif?: string,
  champsCibles?: string[],
): Promise<{ ok: boolean; statut: string }> {
  return authedSend(
    `/api/v1/admin/inscriptions/${membreId}/decision`,
    token,
    "POST",
    { decision, motif, champs_cibles: champsCibles },
    "Décision impossible",
  );
}

// Full registration dossier: identity photo, openable documents and e-signature proof.
export interface DossierMembre {
  id: string;
  matricule: string;
  code_membre?: string | null;
  prenoms: string | null;
  nom: string | null;
  nom_affiche?: string | null;
  email: string;
  telephone: string | null;
  indicatif_telephone?: string | null;
  date_naissance?: string | null;
  genre?: string | null;
  pays: string | null;
  ville: string | null;
  region?: string | null;
  adresse?: string | null;
  profession?: string | null;
  date_entree?: string | null;
  commission?: string | null;
  sous_commission?: string | null;
  coordination?: string | null;
  intendance?: string | null;
  tribu?: string | null;
  niveau?: string | null;
  promotion?: string | null;
  berger_declare?: boolean;
  berger_nom_declare?: string | null;
  fonctions?: { libelle: string | null; perimetre: string | null; confirmee: boolean; categorie?: string | null }[];
  statut?: string;
  statut_inscription: string;
  verifie: boolean;
  cree_le?: string | null;
}

export interface DossierDocument {
  id: string;
  type: string;
  statut: string;
  nom_fichier: string | null;
  mime: string | null;
  recu_le: string | null;
  url: string | null;
  chiffre: boolean;
  content_path: string | null;
}

export interface DossierEngagement {
  type: string;
  version: string;
  signe_le: string | null;
  canal: string | null;
}

export interface DossierPreuve {
  id: string;
  signe_le: string | null;
  hash_preuve: string | null;
  canal: string | null;
}

export interface DossierSignature {
  signe: boolean;
  engagements: DossierEngagement[];
  preuves: DossierPreuve[];
}

export interface DossierInscription {
  membre: DossierMembre;
  photo_url: string | null;
  documents: DossierDocument[];
  signature: DossierSignature;
}

export function getDossierInscription(token: string, membreId: string): Promise<DossierInscription> {
  return authedGet<DossierInscription>(
    `/api/v1/admin/inscriptions/${membreId}/dossier`,
    token,
    "Dossier indisponible",
  );
}

export function getMembrePhotoUrl(token: string, membreId: string): Promise<{ url: string | null }> {
  return authedGet<{ url: string | null }>(
    `/api/v1/admin/membres/${membreId}/photo-url`,
    token,
    "Photo indisponible",
  );
}

/**
 * Fetch a document's decrypted bytes (an encrypted document is served by an
 * authenticated content endpoint, not a public signed URL) and return a blob
 * object URL the caller can open. The caller must revoke the URL when done.
 */
export async function fetchDocumentContentUrl(token: string, contentPath: string): Promise<string> {
  const res = await fetch(`${BASE}${contentPath}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error("Document indisponible");
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export interface CorrectionItem {
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  modifie_le: string | null;
}

export function getCorrections(token: string, membreId: string): Promise<CorrectionItem[]> {
  return authedGet<CorrectionItem[]>(
    `/api/v1/admin/inscriptions/${membreId}/corrections`,
    token,
    "Corrections indisponibles",
  );
}

export function creerCompteMembre(
  token: string,
  input: { email: string; prenoms?: string; nom?: string },
): Promise<{ membre_id: string; matricule: string }> {
  return authedSend("/api/v1/admin/inscriptions/membre", token, "POST", input, "Création impossible");
}

export interface MembresLotResult {
  crees: number;
  details_crees: { email: string; matricule: string }[];
  doublons: string[];
  erreurs: { email: string; raison: string }[];
}

export function creerMembresLot(
  token: string,
  membres: { email: string; prenoms?: string; nom?: string }[],
): Promise<MembresLotResult> {
  return authedSend<MembresLotResult>("/api/v1/admin/inscriptions/membres-lot", token, "POST", { membres }, "Création en masse impossible");
}

export function relancerMdpTemporaire(token: string, membreId: string): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/inscriptions/${membreId}/relancer-mdp`, token, "POST", {}, "Relance impossible");
}

// --- Member requests (demandes) ---
export interface DemandeItem {
  id: string;
  numero: string;
  type: string;
  sujet: string;
  champ_concerne: string | null;
  statut: string;
  categorie?: string | null;
  sous_categorie?: string | null;
  motif_cloture?: string | null;
  cree_le: string | null;
  membre_nom: string | null;
  nb_messages: number;
  /** Step tracking: when the staff took the request over / closed it. */
  pris_en_charge_le?: string | null;
  clos_le?: string | null;
  /** Deadline granted to the member after an unlock (auto-close when over). */
  echeance_reponse?: string | null;
}

export interface DemandeMessageItem {
  id: string;
  auteur_type: string;
  lu_par_membre_le?: string | null;
  lu_par_staff_le?: string | null;
  auteur_nom: string | null;
  corps: string;
  cree_le: string | null;
  document_id?: string | null;
}

export interface DemandeDetailAdmin extends DemandeItem {
  messages: DemandeMessageItem[];
  /** Staff member handling the request (admin view only). */
  pris_en_charge_par_email?: string | null;
}

export function getAdminDemandes(
  token: string,
  filters?: { statut?: string; categorie?: string; q?: string; membre_id?: string },
): Promise<DemandeItem[]> {
  const params = new URLSearchParams();
  if (filters?.statut) params.set("statut", filters.statut);
  if (filters?.categorie) params.set("categorie", filters.categorie);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.membre_id) params.set("membre_id", filters.membre_id);
  const qs = params.toString();
  return authedGet<DemandeItem[]>(`/api/v1/admin/demandes${qs ? `?${qs}` : ""}`, token, "Demandes indisponibles");
}

export function demanderPieceDemande(token: string, id: string, description: string): Promise<DemandeItem> {
  return authedSend(`/api/v1/admin/demandes/${id}/demander-piece`, token, "POST", { description }, "Action impossible");
}

export interface ElementDeblocable {
  cle: string;
  libelle: string;
  type: "champ" | "photo" | "document";
  sensibilite: "haute" | "normale";
}

export function getElementsDeblocables(token: string): Promise<ElementDeblocable[]> {
  return authedGet<ElementDeblocable[]>("/api/v1/admin/deblocage/elements", token, "Catalogue indisponible");
}

export function prendreEnChargeDemande(token: string, id: string): Promise<DemandeItem> {
  return authedSend(`/api/v1/admin/demandes/${id}/prendre-en-charge`, token, "POST", {}, "Action impossible");
}

export function getAdminDemande(token: string, id: string): Promise<DemandeDetailAdmin> {
  return authedGet<DemandeDetailAdmin>(`/api/v1/admin/demandes/${id}`, token, "Demande indisponible");
}

export function replyAdminDemande(token: string, id: string, corps: string): Promise<DemandeMessageItem> {
  return authedSend(`/api/v1/admin/demandes/${id}/messages`, token, "POST", { corps }, "Envoi impossible");
}

export function updateAdminDemande(
  token: string,
  id: string,
  patch: { statut?: string; champs_deverrouilles?: string[]; motif?: string; delai_jours?: number },
): Promise<DemandeItem> {
  return authedSend(`/api/v1/admin/demandes/${id}`, token, "PATCH", patch, "Mise à jour impossible");
}

export interface ModificationDiff {
  champ: string;
  avant: string | number | boolean | null;
  apres: string | number | boolean | null;
}

export interface ModificationItem {
  id: string;
  statut: string;
  propose_le: string | null;
  decide_le: string | null;
  diff: ModificationDiff[];
}

export function getDemandeModifications(token: string, id: string): Promise<ModificationItem[]> {
  return authedGet<ModificationItem[]>(`/api/v1/admin/demandes/${id}/modifications`, token, "Modifications indisponibles");
}

/** Signed preview of a replacement photo the member staged on this request, with
 * its focal point, to review before validating. Returns url null when none. */
export function getDemandePhotoPending(
  token: string,
  id: string,
): Promise<{ url: string | null; focus_x: number | null; focus_y: number | null }> {
  return authedGet(`/api/v1/admin/demandes/${id}/photo-pending`, token, "Aperçu indisponible");
}

export function decideDemandeModification(
  token: string,
  id: string,
  decision: "valider" | "rejeter",
): Promise<{ ok: boolean; statut: string }> {
  return authedSend(`/api/v1/admin/demandes/${id}/modifications/decision`, token, "POST", { decision }, "Décision impossible");
}

// --- Member management (RGPD, block) ---
export function bloquerMembre(token: string, id: string): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/membres/${id}/bloquer`, token, "POST", {}, "Blocage impossible");
}

export function debloquerMembre(token: string, id: string): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/membres/${id}/debloquer`, token, "POST", {}, "Déblocage impossible");
}

export function demanderDocumentMembre(token: string, id: string, type: string, message?: string): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/membres/${id}/demander-document`, token, "POST", { type, message }, "Demande impossible");
}

export function supprimerMembre(token: string, id: string): Promise<void> {
  return request<void>(`/api/v1/admin/membres/${id}`, token, { method: "DELETE" }, "Suppression impossible");
}

export interface TechnicalAdmin {
  id: string;
  email: string | null;
  actif: boolean;
  mfa_actif: boolean;
  mfa_impose: boolean;
  niveau: string;
  audit_count: number;
  supprimable_dur: boolean;
  dernier_login: string | null;
  cree_le: string | null;
  est_membre: boolean;
}
export interface TechnicalAdminsData {
  techniques: TechnicalAdmin[];
  candidats: { id: string; email: string | null; est_membre: boolean }[];
  niveaux: string[];
  mon_niveau: string | null;
  mon_id: string;
  peut_gerer: boolean;
  techniques_actifs: number;
}
export function getTechnicalAdmins(token: string): Promise<TechnicalAdminsData> {
  return authedGet<TechnicalAdminsData>("/api/v1/admin/technical-super-admins", token, "Réservé aux super-admins techniques");
}
export function grantTechnicalAdmin(token: string, id: string): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/technical-super-admins/${id}`, token, "POST", {}, "Octroi impossible");
}
/** Create a NEW applicative technical super-admin from an e-mail (never a member). */
export function createTechnicalAdmin(token: string, email: string, niveau: string): Promise<{ ok: boolean; id: string; email: string; niveau: string; message: string }> {
  return authedSend("/api/v1/admin/technical-super-admins/creer", token, "POST", { email, niveau }, "Création impossible");
}
export function revokeTechnicalAdmin(token: string, id: string): Promise<void> {
  return request<void>(`/api/v1/admin/technical-super-admins/${id}`, token, { method: "DELETE" }, "Révocation impossible");
}
export function setTechnicalAdminNiveau(token: string, id: string, niveau: string): Promise<{ ok: boolean; niveau: string }> {
  return authedSend(`/api/v1/admin/technical-super-admins/${id}/niveau`, token, "PATCH", { niveau }, "Changement de niveau impossible");
}
export function setTechnicalAdminActivation(token: string, id: string, actif: boolean): Promise<{ ok: boolean; actif: boolean }> {
  return authedSend(`/api/v1/admin/technical-super-admins/${id}/activation`, token, "PATCH", { actif }, "Changement d'activation impossible");
}
export function deleteTechnicalAdminDefinitif(token: string, id: string): Promise<void> {
  return request<void>(`/api/v1/admin/technical-super-admins/${id}/definitif`, token, { method: "DELETE" }, "Suppression définitive impossible");
}

export interface SuppressionApercu {
  membre_id: string;
  nom: string;
  statut: string;
  porte_titre_berger: boolean;
  nom_pastoral: string | null;
  fonctions: string[];
  responsable_de_commissions: number;
  appartenances: number;
  espaces_collaboration: number;
  participations: number;
  documents: number;
  a_un_compte: boolean;
  alternatives: string[];
}

/** Pre-flight for an RGPD erasure: what the member holds (titles/functions, memberships,
 * responsibilities, records), so the operator can pick an alternative before deleting. */
export function getSuppressionApercu(token: string, id: string): Promise<SuppressionApercu> {
  return authedGet<SuppressionApercu>(`/api/v1/admin/membres/${id}/suppression-apercu`, token, "Aperçu indisponible");
}

/** Reversible alternative to erasure: archive / deactivate / suspend / reactivate. */
export function changerStatutMembre(token: string, id: string, statut: string): Promise<{ ok: boolean; statut: string }> {
  return authedSend(`/api/v1/admin/membres/${id}/statut`, token, "PATCH", { statut }, "Changement de statut impossible");
}

export interface ConnexionItem {
  ip: string | null;
  appareil: string | null;
  pays: string | null;
  ville: string | null;
  region: string | null;
  cree_le: string | null;
  fin: string | null;
  duree_s: number | null;
  revoque: boolean;
}

export function getConnexions(token: string, id: string): Promise<ConnexionItem[]> {
  return authedGet<ConnexionItem[]>(`/api/v1/admin/membres/${id}/connexions`, token, "Connexions indisponibles");
}

/** Close the current admin session server-side (records the logout and its duration). */
export function logoutSession(token: string): Promise<{ ok: boolean }> {
  return authedSend("/api/v1/auth/logout", token, "POST", {}, "Déconnexion");
}

// --- Consent documents (RGPD, confidentialite, engagement, reglement) ---
export interface ConsentDocAdmin {
  cle: string;
  version: number;
  titre: string;
  titre_en: string;
  contenu: string;
  contenu_en: string;
  bloquant: boolean;
  ordre: number;
  actif: boolean;
}

export interface ConsentDocPayload {
  titre: string;
  titre_en: string;
  contenu: string;
  contenu_en: string;
  bloquant: boolean;
  ordre: number;
}

export function getConsentDocsAdmin(token: string): Promise<ConsentDocAdmin[]> {
  return authedGet<ConsentDocAdmin[]>("/api/v1/admin/consentements", token, "Documents indisponibles");
}

export function publishConsentDoc(
  token: string,
  cle: string,
  payload: ConsentDocPayload,
): Promise<ConsentDocAdmin> {
  return authedSend<ConsentDocAdmin>(
    `/api/v1/admin/consentements/${cle}`,
    token,
    "POST",
    payload,
    "Publication impossible",
  );
}

// --- Country e-signature matrix and manual attestations ---
export interface PaysSignature {
  code_pays: string;
  nom: string;
  nom_en: string | null;
  esignature_reconnue: boolean;
  manuel_requis: boolean;
  source: string | null;
  note: string | null;
}

export interface PaysSignaturePatch {
  manuel_requis?: boolean;
  esignature_reconnue?: boolean;
  note?: string;
  source?: string;
}

export interface Attestation {
  id: string;
  statut: string;
  document_id: string | null;
  echeance: string | null;
  membre: string | null;
  pays: string | null;
  email: string | null;
}

export type DecisionAttestation = "accepted" | "rejected";

export function getPaysSignature(token: string): Promise<PaysSignature[]> {
  return authedGet<PaysSignature[]>("/api/v1/admin/pays-signature", token, "Matrice indisponible");
}

export function updatePaysSignature(
  token: string,
  code: string,
  patch: PaysSignaturePatch,
): Promise<{ ok: boolean }> {
  return authedSend(`/api/v1/admin/pays-signature/${code}`, token, "PATCH", patch, "Mise à jour impossible");
}

export function getAttestations(token: string): Promise<Attestation[]> {
  return authedGet<Attestation[]>("/api/v1/admin/attestations", token, "Attestations indisponibles");
}

export function validerAttestation(
  token: string,
  id: string,
  decision: DecisionAttestation,
): Promise<{ ok: boolean; statut: string }> {
  return authedSend(`/api/v1/admin/attestations/${id}/valider`, token, "POST", { decision }, "Validation impossible");
}

// Signed download URL for an uploaded document (reuses the shared document helper).
export function getDocumentUrl(token: string, documentId: string): Promise<{ url: string | null }> {
  return authedGet<{ url: string | null }>(`/api/v1/admin/documents/${documentId}/url`, token, "Document indisponible");
}

export function apiBaseUrl(): string {
  return BASE;
}

// ---- AI providers (moderator channel transcription and redaction) ----

export interface AiProvider {
  id: string;
  capacite: "stt" | "llm";
  fournisseur: string;
  libelle: string;
  modele: string;
  endpoint: string | null;
  cle_presente: boolean;
  params: Record<string, unknown>;
  actif: boolean;
  gratuit: boolean;
  ordre: number;
}

export interface AiSuggestion {
  fournisseur: string;
  modele: string;
  gratuit?: boolean;
  note: string;
}

export interface AiGuide {
  libelle: string;
  gratuit: boolean;
  resume: string;
  site: string;
  compte_url: string;
  cle_url: string;
  cle_libelle: string;
  etapes: string[];
  params: string[];
}

export interface AiCatalogue {
  capacites: string[];
  fournisseurs: string[];
  guides?: Record<string, AiGuide>;
  suggestions: { stt: AiSuggestion[]; llm: AiSuggestion[] };
}

export interface AiProviderInput {
  capacite: "stt" | "llm";
  fournisseur: string;
  libelle: string;
  modele: string;
  endpoint?: string | null;
  cle?: string | null;
  params?: Record<string, unknown>;
  gratuit?: boolean;
  ordre?: number;
}

export interface AiProviderPatch {
  libelle?: string;
  modele?: string;
  endpoint?: string | null;
  cle?: string | null;
  params?: Record<string, unknown>;
  gratuit?: boolean;
  ordre?: number;
}

export function listAiProviders(token: string): Promise<AiProvider[]> {
  return authedGet(`/api/v1/admin/ai/providers`, token, "Fournisseurs IA indisponibles");
}

export function aiCatalogue(token: string): Promise<AiCatalogue> {
  return authedGet(`/api/v1/admin/ai/catalogue`, token, "Catalogue IA indisponible");
}

export function createAiProvider(token: string, input: AiProviderInput): Promise<AiProvider> {
  return authedSend(`/api/v1/admin/ai/providers`, token, "POST", input, "Creation impossible");
}

export function updateAiProvider(token: string, id: string, patch: AiProviderPatch): Promise<AiProvider> {
  return authedSend(`/api/v1/admin/ai/providers/${id}`, token, "PATCH", patch, "Mise a jour impossible");
}

export function activerAiProvider(token: string, id: string): Promise<AiProvider> {
  return authedSend(`/api/v1/admin/ai/providers/${id}/activer`, token, "POST", undefined, "Activation impossible");
}

export function desactiverAiProvider(token: string, id: string): Promise<AiProvider> {
  return authedSend(`/api/v1/admin/ai/providers/${id}/desactiver`, token, "POST", undefined, "Désactivation impossible");
}

export function deleteAiProvider(token: string, id: string): Promise<void> {
  return authedSend(`/api/v1/admin/ai/providers/${id}`, token, "DELETE", undefined, "Suppression impossible");
}

export function testAiProvider(token: string, id: string): Promise<{ ok: boolean; detail: string }> {
  return authedSend(`/api/v1/admin/ai/providers/${id}/test`, token, "POST", undefined, "Test impossible");
}

// ---------------------------------------------------------------------------
// Organigramme hiérarchique administrable
// A draft (statut 'brouillon') is edited on a canvas, validated, then published.
// Only the single published version is visible to members via /organigramme/publie.
// ---------------------------------------------------------------------------

export type OrgVersionStatut = "brouillon" | "publie" | "archive";

export interface OrganigrammeVersion {
  id: string;
  libelle: string;
  statut: OrgVersionStatut;
  note: string | null;
  cree_le: string;
  publie_le: string | null;
}

export type OrgNodeType = "personne" | "structure" | "groupe" | "separateur" | "note" | "zone";
export type OrgCategorie = "titre" | "fonction_speciale" | "fonction" | "fonction_particuliere" | null;
export type OrgUniteType = "commission" | "coordination" | "intendance" | "tribu" | "college" | "groupe" | null;
export type OrgStatut = "actif" | "vacant" | "attente" | "archive";

export interface OrgNode {
  id: string;
  cle: string;
  type_noeud: OrgNodeType;
  nom: string;
  sous_titre: string | null;
  membre_id: string | null;
  /** Display name of the linked member, resolved server side. */
  membre_nom: string | null;
  /** Photo URL of the linked member, shown on the card when afficher_photo is on. */
  photo_url: string | null;
  /** When true, the card shows the member photo instead of the initials. */
  afficher_photo: boolean;
  /** Optional custom accent color (hex) overriding the status stripe. */
  couleur: string | null;
  fonction_cle: string | null;
  categorie: OrgCategorie;
  unite_type: OrgUniteType;
  unite_id: string | null;
  effectif: number | null;
  statut: OrgStatut;
  pos_x: number | null;
  pos_y: number | null;
  /** Custom footprint, mostly used to size a separator node. */
  largeur: number | null;
  hauteur: number | null;
  ordre: number | null;
}

export type OrgLinkType =
  | "hierarchique"
  | "coordination"
  | "supervision"
  | "suivi_transversal"
  | "responsabilite_tribu"
  | "assistance";

export interface OrgLink {
  id: string;
  source_id: string;
  cible_id: string;
  type_lien: OrgLinkType;
  libelle: string | null;
}

export interface OrgContenu {
  version: OrganigrammeVersion;
  noeuds: OrgNode[];
  liens: OrgLink[];
}

export interface OrgValidation {
  publiable: boolean;
  bloquants: string[];
  avertissements: string[];
  coherence?: CoherenceReport;
  noeuds: OrgNode[];
  liens: OrgLink[];
}

export interface OrgNodeInput {
  nom: string;
  type_noeud: OrgNodeType;
  sous_titre?: string | null;
  membre_id?: string | null;
  fonction_cle?: string | null;
  categorie?: OrgCategorie;
  unite_type?: OrgUniteType;
  unite_id?: string | null;
  statut?: OrgStatut;
  couleur?: string | null;
  afficher_photo?: boolean;
  largeur?: number | null;
  hauteur?: number | null;
  pos_x?: number | null;
  pos_y?: number | null;
}

export interface OrgNodePatch {
  nom?: string;
  sous_titre?: string | null;
  membre_id?: string | null;
  statut?: OrgStatut;
  couleur?: string | null;
  afficher_photo?: boolean;
  fonction_cle?: string | null;
  categorie?: OrgCategorie;
  unite_type?: OrgUniteType;
  unite_id?: string | null;
  largeur?: number | null;
  hauteur?: number | null;
  pos_x?: number | null;
  pos_y?: number | null;
}

export interface OrgAffectationResult {
  ok: boolean;
  membre_nom: string | null;
  profil_applique: boolean;
}

export interface OrgLinkInput {
  source_id: string;
  cible_id: string;
  type_lien: OrgLinkType;
  libelle?: string | null;
}

export interface OrgVersionCreateInput {
  libelle: string;
  /** 'reel' builds a first draft from the live data; 'publie' clones the published one. */
  depuis?: "reel" | "publie";
  note?: string;
}

/** Short server side summary returned after a build, e.g. counts by node kind. */
export type OrgResume = Record<string, unknown> | string | null;

export function listOrganigrammeVersions(token: string): Promise<OrganigrammeVersion[]> {
  return authedGet("/api/v1/admin/organigramme/versions", token, "Versions de l'organigramme indisponibles");
}

// Member-facing display settings for the org chart (visible tabs + display mode).
export interface OrganigrammeReglages {
  onglets: { chaine: boolean; rattachements: boolean; titres: boolean; organigramme: boolean };
  affichage: "interactif" | "image";
}
export function getOrganigrammeReglages(token: string): Promise<OrganigrammeReglages> {
  return authedGet<OrganigrammeReglages>("/api/v1/admin/organigramme/reglages", token, "Réglages indisponibles");
}
export function updateOrganigrammeReglages(token: string, input: Partial<OrganigrammeReglages>): Promise<OrganigrammeReglages> {
  return authedSend<OrganigrammeReglages>("/api/v1/admin/organigramme/reglages", token, "PUT", input, "Enregistrement impossible");
}

export function createOrganigrammeVersion(
  token: string,
  input: OrgVersionCreateInput,
): Promise<{ id: string; resume?: OrgResume }> {
  return authedSend("/api/v1/admin/organigramme/versions", token, "POST", input, "Création du brouillon impossible");
}

export function getOrganigrammeVersion(token: string, id: string): Promise<OrgContenu> {
  return authedGet(`/api/v1/admin/organigramme/versions/${id}`, token, "Version indisponible");
}

export function construireOrganigramme(
  token: string,
  id: string,
): Promise<{ ok: boolean; resume?: OrgResume; noeuds: OrgNode[]; liens: OrgLink[] }> {
  return authedSend(
    `/api/v1/admin/organigramme/versions/${id}/construire`,
    token,
    "POST",
    undefined,
    "Reconstruction impossible",
  );
}

export function deleteOrganigrammeVersion(token: string, id: string): Promise<void> {
  return authedSend(`/api/v1/admin/organigramme/versions/${id}`, token, "DELETE", undefined, "Suppression impossible");
}

export function addOrganigrammeNode(token: string, id: string, input: OrgNodeInput): Promise<{ id: string }> {
  return authedSend(`/api/v1/admin/organigramme/versions/${id}/nodes`, token, "POST", input, "Ajout du nœud impossible");
}

export function patchOrganigrammeNode(token: string, nodeId: string, patch: OrgNodePatch): Promise<void> {
  return authedSend(`/api/v1/admin/organigramme/nodes/${nodeId}`, token, "PATCH", patch, "Mise à jour du nœud impossible");
}

export function deleteOrganigrammeNode(token: string, nodeId: string): Promise<void> {
  return authedSend(`/api/v1/admin/organigramme/nodes/${nodeId}`, token, "DELETE", undefined, "Suppression du nœud impossible");
}

export function addOrganigrammeLink(token: string, id: string, input: OrgLinkInput): Promise<{ id: string }> {
  return authedSend(`/api/v1/admin/organigramme/versions/${id}/links`, token, "POST", input, "Création du lien impossible");
}

export function deleteOrganigrammeLink(token: string, linkId: string): Promise<void> {
  return authedSend(`/api/v1/admin/organigramme/links/${linkId}`, token, "DELETE", undefined, "Suppression du lien impossible");
}

export interface OrgLinkPatch {
  source_id?: string;
  cible_id?: string;
  type_lien?: OrgLinkType;
  libelle?: string | null;
}

/** Move, re-type or re-label a link without deleting it. Only the provided fields
 * change; reconnecting an endpoint (source_id/cible_id) is how a mis-placed link is
 * corrected. A hierarchical result that closes a loop is refused (409). */
export function patchOrganigrammeLink(token: string, linkId: string, patch: OrgLinkPatch): Promise<OrgLink> {
  return authedSend(`/api/v1/admin/organigramme/links/${linkId}`, token, "PATCH", patch, "Modification du lien impossible");
}

/** Bind a member to a node and, when appliquer_au_profil is true, write the node's
 * function or title onto the member profile (a confirmed membre_fonction, or the
 * berger title). The card name is refreshed from the returned membre_nom. */
export function affecterMembreNode(
  token: string,
  nodeId: string,
  input: { membre_id: string; appliquer_au_profil: boolean },
): Promise<OrgAffectationResult> {
  return authedSend(
    `/api/v1/admin/organigramme/nodes/${nodeId}/affecter`,
    token,
    "POST",
    input,
    "Affectation impossible",
  );
}

export function validerOrganigramme(token: string, id: string): Promise<OrgValidation> {
  return authedSend(`/api/v1/admin/organigramme/versions/${id}/valider`, token, "POST", undefined, "Validation impossible");
}

export function publierOrganigramme(token: string, id: string): Promise<{ ok: boolean; publie: boolean }> {
  return authedSend(`/api/v1/admin/organigramme/versions/${id}/publier`, token, "POST", undefined, "Publication impossible");
}

export function restaurerOrganigramme(token: string, id: string): Promise<{ id: string; noeuds: OrgNode[] }> {
  return authedSend(`/api/v1/admin/organigramme/versions/${id}/restaurer`, token, "POST", undefined, "Restauration impossible");
}

/** Published organigramme, the read only view offered to members and to the
 * consultation mode. A 404 (nothing published yet) is surfaced as a typed error
 * the page turns into an empty state. */
export function getOrganigrammePublie(token: string): Promise<OrgContenu> {
  return authedGet("/api/v1/organigramme/publie", token, "Organigramme publié indisponible");
}

// --- Coherence report + interim (suppleance) --------------------------------

export interface CoherenceFinding {
  code: string;
  niveau: "bloquant" | "avertissement" | "info";
  message: string;
}
export interface CoherenceReport {
  findings: CoherenceFinding[];
  bloquants: CoherenceFinding[];
  avertissements: CoherenceFinding[];
  infos: CoherenceFinding[];
  resume: { bloquants: number; avertissements: number; infos: number };
}

export function getRapportCoherence(token: string): Promise<CoherenceReport> {
  return authedGet("/api/v1/admin/organigramme/coherence", token, "Rapport de cohérence indisponible");
}

export interface Interim {
  id: string;
  fonction_cle: string;
  perimetre: string | null;
  titulaire_id: string | null;
  suppleant_id: string | null;
  motif: string | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: "actif" | "termine" | "annule";
}
export interface InterimInput {
  fonction_cle: string;
  perimetre?: string | null;
  titulaire_id?: string | null;
  suppleant_id: string;
  motif?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
}

export function listInterims(token: string, statut?: string): Promise<Interim[]> {
  const q = statut ? `?statut=${encodeURIComponent(statut)}` : "";
  return authedGet(`/api/v1/admin/organigramme/interims${q}`, token, "Intérims indisponibles");
}
export function creerInterim(token: string, input: InterimInput): Promise<Interim> {
  return authedSend("/api/v1/admin/organigramme/interims", token, "POST", input, "Création de l'intérim impossible");
}
export function terminerInterim(token: string, id: string): Promise<Interim> {
  return authedSend(`/api/v1/admin/organigramme/interims/${id}/terminer`, token, "POST", undefined, "Clôture de l'intérim impossible");
}
export function annulerInterim(token: string, id: string): Promise<Interim> {
  return authedSend(`/api/v1/admin/organigramme/interims/${id}/annuler`, token, "POST", undefined, "Annulation de l'intérim impossible");
}

// --- Informations (internal communication) ---------------------------------

export type InformationPriorite = "normale" | "importante" | "urgente";
export type InformationStatut = "brouillon" | "programme" | "envoye" | "archive";

export interface InfoCroisement {
  commission_id?: string | null;
  intendance_id?: string | null;
  coordination_id?: string | null;
  groupe?: string | null;
}

export interface InfoCibleRef {
  code: string;
  cible_id?: string | null;
  /** Manual selection: explicit member ids, used with the reserved code "selection". */
  membre_ids?: string[];
  /** Crossed targeting (commission inside a coordination/stewardship, sub-group). */
  croisement?: InfoCroisement;
  /** Display label kept client side (unit or member names) so chips stay readable. */
  libelle?: string;
}

/** Connected account's own member profile, used to prefill the author field. */
export interface MonProfilAuteur {
  nom_affiche?: string | null;
  prenoms?: string | null;
  nom?: string | null;
  fonction_cle?: string | null;
  fonctions?: { cle: string; libelle?: string | null; principale?: boolean }[];
}

export function getMonProfilAuteur(token: string): Promise<MonProfilAuteur> {
  return authedGet("/api/v1/membres/me", token, "Profil indisponible");
}

export interface Information {
  id: string;
  titre: string;
  sous_titre: string | null;
  contenu: string;
  priorite: InformationPriorite;
  auteur: string | null;
  signature: string | null;
  signature_url: string | null;
  protege: boolean;
  institutionnelle: boolean;
  affiche_entete: boolean;
  canaux: string[];
  statut: InformationStatut;
  requiert_accuse: boolean;
  lecture_vocale_auto: boolean;
  lien_url: string | null;
  action_label: string | null;
  action_url: string | null;
  audio_url: string | null;
  image_url: string | null;
  document_url: string | null;
  expire_le: string | null;
  epingle_jusqu: string | null;
  cibles: InfoCibleRef[];
  cree_le: string | null;
  envoye_le: string | null;
}

export interface InformationInput {
  titre: string;
  sous_titre?: string | null;
  contenu: string;
  priorite: InformationPriorite;
  auteur?: string | null;
  signature?: string | null;
  signature_url?: string | null;
  protege?: boolean;
  institutionnelle?: boolean;
  affiche_entete?: boolean;
  canaux?: string[];
  requiert_accuse?: boolean;
  lecture_vocale_auto?: boolean;
  lien_url?: string | null;
  action_label?: string | null;
  action_url?: string | null;
  expire_le?: string | null;
  epingle_jusqu?: string | null;
  cibles: InfoCibleRef[];
}

export interface InformationStats {
  destinataires: number;
  lus: number;
  confirmes: number;
  non_lus: number;
  taux_lecture: number;
  taux_confirmation: number;
}

/** A reusable targeting segment from the shared destination referential. */
export interface CibleReference {
  code: string;
  libelle: string;
  description: string | null;
  categorie: string | null;
  type_regle: string;
}

export interface PageInformations {
  items: Information[];
  total: number;
  page: number;
  taille: number;
  pages: number;
}

/** Paginated list. Media payloads are not carried here: each item advertises which
 * media exist through `medias`, and opening one information fetches the content. */
export function listInformationsPage(
  token: string,
  opts: { statut?: InformationStatut; page?: number; taille?: number } = {},
): Promise<PageInformations> {
  const p = new URLSearchParams();
  if (opts.statut) p.set("statut", opts.statut);
  p.set("page", String(opts.page ?? 1));
  p.set("taille", String(opts.taille ?? 10));
  return authedGet(`/api/v1/admin/informations?${p.toString()}`, token, "Informations indisponibles");
}

/** Kept for callers that just want the current page as a plain array. */
export async function listInformations(token: string, statut?: InformationStatut): Promise<Information[]> {
  const page = await listInformationsPage(token, { statut, taille: 100 });
  return page.items;
}

export function createInformation(token: string, input: InformationInput): Promise<Information> {
  return authedSend("/api/v1/admin/informations", token, "POST", input, "Création de l'information impossible");
}

export function updateInformation(token: string, id: string, input: Partial<InformationInput>): Promise<Information> {
  return authedSend(`/api/v1/admin/informations/${id}`, token, "PATCH", input, "Modification impossible");
}

export function deleteInformation(token: string, id: string): Promise<void> {
  return authedSend(`/api/v1/admin/informations/${id}`, token, "DELETE", undefined, "Suppression impossible");
}

export function publishInformation(token: string, id: string): Promise<{ ok: boolean; destinataires: number }> {
  return authedSend(`/api/v1/admin/informations/${id}/publier`, token, "POST", undefined, "Publication impossible");
}

export function archiveInformation(token: string, id: string): Promise<Information> {
  return authedSend(`/api/v1/admin/informations/${id}/archiver`, token, "POST", undefined, "Archivage impossible");
}

export function apercuDestinataires(token: string, id: string): Promise<{ destinataires_uniques: number; segments: number }> {
  return authedSend(`/api/v1/admin/informations/${id}/apercu-destinataires`, token, "POST", undefined, "Aperçu impossible");
}

export function getInformationStats(token: string, id: string): Promise<InformationStats> {
  return authedGet(`/api/v1/admin/informations/${id}/statistiques`, token, "Statistiques indisponibles");
}

export function getCiblesReference(token: string): Promise<CibleReference[]> {
  return authedGet("/api/v1/reference/cibles-activite", token, "Destinations indisponibles");
}

/** Attach (or clear with an empty data URL) a voice note, cover image or document
 * on an Information draft. The payload is a base64 data URL, stored inline. */
export function uploadInformationMedia(
  token: string,
  id: string,
  kind: "audio" | "image" | "document",
  dataUrl: string,
): Promise<Information> {
  return authedSend(`/api/v1/admin/informations/${id}/media`, token, "POST", { kind, data_url: dataUrl }, "Envoi du média impossible");
}

export interface OrgAnomalie {
  code: string;
  libelle: string;
  nombre: number;
}

/** Live counters for the organisation, computed server side from the real data,
 * never hand-entered. ``effectif_unique`` counts distinct members holding an active
 * responsibility; ``affectations_actives`` counts the responsibilities themselves,
 * so the gap measures the cumul. Structural placement is reported apart. */
export interface OrgStatistiques {
  affectations: {
    effectif_unique: number;
    affectations_actives: number;
    membres_en_cumul: number;
    ecart_cumul: number;
    principales: number;
    secondaires: number;
  };
  placement: {
    membres_places: number;
    intendances: number;
    coordinations: number;
    commissions: number;
    tribus: number;
    bergers: number;
  };
  anomalies: OrgAnomalie[];
}

export function getOrganigrammeStatistiques(token: string): Promise<OrgStatistiques> {
  return authedGet("/api/v1/organigramme/statistiques", token, "Statistiques de l'organisation indisponibles");
}

/** One registration that has not reached a usable account, with the reason.
 * ``cause`` and ``action`` are sentences the server writes, so the interface
 * never has to guess what a status code means for a real person. */
export interface InscriptionBloquee {
  membre_id: string;
  matricule: string | null;
  email: string | null;
  nom: string | null;
  statut_inscription: string | null;
  inscrit_le: string | null;
  compte: boolean;
  connecte_au_moins_une_fois: boolean;
  etat_envoi: string;
  dernier_envoi_le: string | null;
  gravite: "bloquant" | "attention" | "information";
  cause: string;
  action: string;
}

export interface InscriptionsBloqueesPage {
  items: InscriptionBloquee[];
  total: number;
  page: number;
  taille: number;
  pages: number;
  resume: Record<string, number>;
  /** False when the diagnosis ceiling truncated the summary, so the badge is a
   *  floor rather than the exact count. */
  resume_complet: boolean;
}

export function getInscriptionsAReparer(token: string, page = 1, taille = 10): Promise<InscriptionsBloqueesPage> {
  return authedGet(
    `/api/v1/admin/inscriptions/a-reparer?page=${page}&taille=${taille}`,
    token,
    "Inscriptions bloquées indisponibles",
  );
}

/** One message the platform tried to send, and what became of it. */
export interface EnvoiEmail {
  id: string;
  destinataire: string | null;
  template: string | null;
  sujet: string | null;
  statut: string | null;
  etat_lisible: string;
  fournisseur: string | null;
  erreur: string | null;
  tentatives: number | null;
  cree_le: string | null;
  envoye_le: string | null;
  delivre_le: string | null;
  ouvert_le: string | null;
  echoue_le: string | null;
  evenements: { evenement_fournisseur: string; statut_normalise: string; motif: string | null; survenu_le: string }[];
}

export function getEnvoisEmailMembre(token: string, membreId: string): Promise<{ membre_id: string; envois: EnvoiEmail[]; total: number }> {
  return authedGet(`/api/v1/admin/membres/${membreId}/envois-email`, token, "Historique d'envoi indisponible");
}

export interface ReparationApercu {
  apercu: true;
  destinataires: { membre_id: string; matricule: string | null; email: string | null; nom: string | null }[];
  ecartes: { membre_id: string; motif: string }[];
  total: number;
}

export interface ReparationResultat {
  apercu: false;
  traites: number;
  envoyes: number;
  ecartes: { membre_id: string; motif: string }[];
  resultats: { membre_id: string; email: string | null; envoye: boolean; canal?: string | null; erreur?: string }[];
}

export function reparerInscriptions(
  token: string,
  membreIds: string[],
  apercu: boolean,
): Promise<ReparationApercu | ReparationResultat> {
  return authedSend(
    `/api/v1/admin/inscriptions/reparer-en-masse?apercu=${apercu ? "true" : "false"}`,
    token,
    "POST",
    membreIds,
    "Réparation impossible",
  );
}

/** Sending health over the last thirty days, expressed as counts to act on. */
export interface SanteEmail {
  periode: string;
  total_envois: number;
  par_statut: Record<string, number>;
  adresses_en_echec: { adresse: string; echecs: number; dernier: string }[];
  alerte: boolean;
}

export function getSanteEmail(token: string): Promise<SanteEmail> {
  return authedGet("/api/v1/admin/email/sante", token, "Santé des envois indisponible");
}

/** The exact callback address to paste into the mail provider's configuration.
 *  Composed server side because it carries the shared secret in its query string,
 *  and one wrong character means the provider's calls are silently refused. */
export interface AdresseRappel {
  configuree: boolean;
  adresse: string | null;
  evenements?: string[];
  message: string;
}

export function getAdresseRappelEmail(token: string): Promise<AdresseRappel> {
  return authedGet("/api/v1/admin/email/adresse-rappel", token, "Adresse de rappel indisponible");
}

/** Which permission can be exercised from which application.
 *  This referential is what makes an application-tagged access group actually
 *  bounded: it decides what such a group confers, so it is a security surface. */
export interface ApplicationPorteuse {
  code: string;
  nom: string | null;
  actif: boolean;
  administre_tout: boolean;
  membres_concernes: number;
}

export interface ReferentielApplications {
  applications: ApplicationPorteuse[];
  par_permission: Record<string, string[]>;
  total_couples: number;
}

export function getReferentielApplications(token: string): Promise<ReferentielApplications> {
  return authedGet("/api/v1/admin/permissions-applications", token, "Référentiel par application indisponible");
}

export function setPermissionApplications(
  token: string,
  permission: string,
  applications: string[],
): Promise<{ permission: string; applications: string[]; ajoutees: string[]; retirees: string[] }> {
  return authedSend(
    "/api/v1/admin/permissions-applications",
    token,
    "PUT",
    { permission, applications },
    "Enregistrement impossible",
  );
}

/** Who answers for a tribe, since when, and appointed by whom.
 *  Distinct from the patriarche, who must belong to the tribe: a supervisor
 *  is often external, and one person can carry several tribes. */
export interface Supervision {
  id: string;
  tribu: { id: string; nom: string | null };
  porteur: { type: "membre" | "equipe"; id: string; libelle: string; matricule: string | null };
  role: string;
  debut: string | null;
  fin: string | null;
  en_cours: boolean;
  motif: string | null;
  attribue_par: string | null;
}

export interface SupervisionsPage {
  items: Supervision[];
  total: number;
  page: number;
  taille: number;
  pages: number;
  tribus_sans_supervision: { id: string; nom: string }[];
}

export function getSupervisions(
  token: string,
  opts: { tribuId?: string; inclureCloses?: boolean; page?: number; taille?: number } = {},
): Promise<SupervisionsPage> {
  const p = new URLSearchParams();
  if (opts.tribuId) p.set("tribu_id", opts.tribuId);
  if (opts.inclureCloses) p.set("inclure_closes", "true");
  p.set("page", String(opts.page ?? 1));
  p.set("taille", String(opts.taille ?? 10));
  return authedGet(`/api/v1/admin/tribus/supervisions?${p}`, token, "Supervisions indisponibles");
}

export function designerSupervision(
  token: string,
  body: { tribu_id: string; membre_id?: string; equipe_speciale_id?: string; role: string; motif?: string },
): Promise<{ id: string; tribu_id: string; en_cours: boolean }> {
  return authedSend("/api/v1/admin/tribus/supervisions", token, "POST", body, "Désignation impossible");
}

export function cloreSupervision(token: string, id: string, motif?: string): Promise<{ id: string; en_cours: boolean }> {
  return authedSend(`/api/v1/admin/tribus/supervisions/${id}/clore`, token, "POST", { motif }, "Clôture impossible");
}

/** A member who declared belonging to the leading team, waiting for an answer. */
export interface DeclarationDirigeante {
  id: string;
  membre_id: string;
  nom: string | null;
  email: string | null;
  matricule: string | null;
  statut_inscription: string | null;
  declaree_le: string | null;
  statut: "a_traiter" | "confirmee" | "refusee";
  traitee_le: string | null;
  traitee_par: string | null;
  commentaire: string | null;
  deja_membre: boolean;
}

export interface DeclarationsPage {
  items: DeclarationDirigeante[];
  total: number;
  page: number;
  taille: number;
  pages: number;
  en_attente: number;
}

export function getDeclarationsDirigeante(
  token: string,
  statut = "a_traiter",
  page = 1,
  taille = 10,
): Promise<DeclarationsPage> {
  return authedGet(
    `/api/v1/admin/equipe-dirigeante/declarations?statut=${statut}&page=${page}&taille=${taille}`,
    token,
    "Déclarations indisponibles",
  );
}

export function deciderDeclaration(
  token: string,
  id: string,
  confirmee: boolean,
  commentaire?: string,
): Promise<{ id: string; statut: string; membre_id: string }> {
  return authedSend(
    `/api/v1/admin/equipe-dirigeante/declarations/${id}`,
    token,
    "POST",
    { confirmee, commentaire },
    "Décision impossible",
  );
}
