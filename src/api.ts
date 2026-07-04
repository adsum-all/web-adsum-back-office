// Thin client for the ADSUM admin API. The base URL is configurable so the app
// can point at the deployed API (https://adsum-api.vercel.app) or a local one.
// Admin endpoints are built in parallel by the backend, so reads are defensive:
// a 404 is surfaced as a typed error the UI can present without crashing.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "https://adsum-api.vercel.app";

export type Role = "admin" | "super_admin" | string;

export interface Session {
  token: string;
  role: Role;
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
  email: string;
  nom: string | null;
  prenoms: string | null;
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
  intendance_id?: string;
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
}

export interface MembreUpdateInput {
  nom?: string;
  prenoms?: string;
  telephone?: string;
  commission_id?: string;
  groupe?: string;
  statut?: string;
  verifie?: boolean;
  genre?: string;
  date_naissance?: string;
  pays?: string;
  ville?: string;
  intendance_id?: string;
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
}

export interface Intendance {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  coordination_id: string | null;
  coordination: string | null;
  publie: boolean;
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
  publie: boolean;
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
}

export interface Statistiques {
  membres_total: number;
  membres_actifs: number;
  membres_verifies: number;
  membres_en_attente: number;
  evenements_total: number;
  presences_total: number;
  commissions_total: number;
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
}

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
  /** Response window in hours after the end; empty = admin default (6h). */
  fenetre_reponse_heures?: number;
}

export interface MembreListQuery {
  limit?: number;
  offset?: number;
  q?: string;
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
  method: "POST" | "PATCH" | "PUT",
  body: unknown,
  onError: string,
): Promise<T> {
  return request<T>(path, token, { method, body: JSON.stringify(body) }, onError);
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(
      res.status === 401 ? "Identifiants invalides" : "Service indisponible",
      res.status,
    );
  }
  const data = (await res.json()) as { access_token: string; role?: Role };
  return { token: data.access_token, role: data.role ?? "" };
}

export function getMe(token: string): Promise<Me> {
  return authedGet<Me>("/api/v1/auth/me", token, "Session indisponible");
}

function buildQuery(query: MembreListQuery): string {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.q) params.set("q", query.q);
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

export function getMembre(token: string, id: string): Promise<MembreProfile> {
  return authedGet<MembreProfile>(`/api/v1/admin/membres/${id}`, token, "Membre indisponible");
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

export interface ReponseQuestionnaire {
  membre_nom: string;
  matricule: string;
  reponses: Record<string, string>;
  soumis_le: string | null;
}

export function getReponsesQuestionnaire(token: string, eventId: string): Promise<ReponseQuestionnaire[]> {
  return authedGet<ReponseQuestionnaire[]>(`/api/v1/admin/evenements/${eventId}/reponses`, token, "Réponses indisponibles");
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

export function createIntendance(
  token: string,
  input: { nom: string; pays?: string; ville?: string; coordination_id?: string },
): Promise<Intendance> {
  return authedSend<Intendance>("/api/v1/admin/intendances", token, "POST", input, "Création impossible");
}

export function getBergers(token: string): Promise<Berger[]> {
  return authedGet<Berger[]>("/api/v1/admin/bergers", token, "Bergers indisponibles");
}

export function getCoordinations(token: string): Promise<Coordination[]> {
  return authedGet<Coordination[]>("/api/v1/admin/coordinations", token, "Coordinations indisponibles");
}

export function createCoordination(
  token: string,
  input: { nom: string; description?: string },
): Promise<Coordination> {
  return authedSend<Coordination>("/api/v1/admin/coordinations", token, "POST", input, "Création impossible");
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
  comptes: { email: string; password: string; role: string }[],
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
  soumis_le: string | null;
  nb_documents: number;
}

export function getInscriptions(token: string): Promise<InscriptionItem[]> {
  return authedGet<InscriptionItem[]>("/api/v1/admin/inscriptions", token, "Inscriptions indisponibles");
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
  geo: string | null;
  cree_le: string | null;
  revoque: boolean;
}

export function getConnexions(token: string, id: string): Promise<ConnexionItem[]> {
  return authedGet<ConnexionItem[]>(`/api/v1/admin/membres/${id}/connexions`, token, "Connexions indisponibles");
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
