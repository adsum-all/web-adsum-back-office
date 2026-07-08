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
export type OrgEntity = "coordinations" | "intendances" | "commissions" | "groupes";

export function renameOrganisation(token: string, entity: OrgEntity, id: string, nom: string): Promise<{ id: string; nom: string }> {
  return authedSend(`/api/v1/admin/organisation/${entity}/${id}`, token, "PATCH", { nom }, "Renommage impossible");
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

export type CibleType =
  | "general"
  | "coordination"
  | "commission"
  | "intendance"
  | "tribu"
  | "bergers"
  | "responsables"
  | "liste";
/** Scope of a series operation: the clicked date only, or every date of the series. */
export type PorteeSerie = "cette_occurrence" | "toute_la_serie";

export interface EvenementCreateInput {
  titre: string;
  type?: string;
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
  return fallback;
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
    throw new ApiError(messageForStatus(res.status, onError), res.status);
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
}
export interface CollabCompte {
  id: string;
  nom: string;
  courriel: string;
  initiales: string;
}
export function listCollabEspaces(token: string): Promise<CollabEspace[]> {
  return authedGet<CollabEspace[]>("/api/v1/collaboration/espaces", token, "Espaces de collaboration indisponibles");
}
export function listCollabComptes(token: string): Promise<CollabCompte[]> {
  return authedGet<CollabCompte[]>("/api/v1/collaboration/membres", token, "Comptes de collaboration indisponibles");
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

export interface FonctionHonorifique {
  cle: string;
  libelle_h: string;
  libelle_f: string;
  libelle_n: string;
  est_vip: boolean;
  ordre: number;
  actif: boolean;
}

export interface FonctionCreateInput {
  cle: string;
  libelle_h: string;
  libelle_f: string;
  libelle_n: string;
  est_vip: boolean;
  ordre: number;
}

export interface FonctionUpdateInput {
  libelle_h?: string;
  libelle_f?: string;
  libelle_n?: string;
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

export function deleteNiveau(token: string, cle: string): Promise<void> {
  return request<void>(`/api/v1/admin/niveaux-engagement/${cle}`, token, { method: "DELETE" }, "Retrait impossible");
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

export function getQuestionnaireFenetre(token: string): Promise<{ heures: number }> {
  return authedGet<{ heures: number }>("/api/v1/admin/parametres/questionnaire-fenetre", token, "Paramètre indisponible");
}

export function setQuestionnaireFenetre(token: string, heures: number): Promise<{ heures: number }> {
  return authedSend("/api/v1/admin/parametres/questionnaire-fenetre", token, "PUT", { heures }, "Mise à jour impossible");
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
  input: { email: string; role: string; password: string; membre_id?: string },
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
}

export interface CreateGroupeInput {
  cle: string;
  libelle: string;
  description?: string | null;
  mode: "role" | "permissions";
  role_accorde?: string | null;
  permissions?: string[];
}

export interface UpdateGroupeInput {
  libelle?: string;
  description?: string | null;
  actif?: boolean;
  permissions?: string[];
}

export interface Appartenance {
  appartenance_id: string;
  groupe_id: string;
  cle: string;
  libelle: string;
  role_accorde: string;
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
  detecte_le: string | null;
  membre_a: DetectionMembre;
  membre_b: DetectionMembre;
}

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

export function deciderDoublon(token: string, id: string, statut: "confirme" | "ignore"): Promise<{ ok: boolean; statut: string }> {
  return authedSend(`/api/v1/admin/doublons/${id}/statut`, token, "POST", { statut }, "Décision impossible");
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
  prenoms: string | null;
  nom: string | null;
  email: string;
  telephone: string | null;
  pays: string | null;
  ville: string | null;
  statut_inscription: string;
  verifie: boolean;
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
