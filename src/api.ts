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
  commission: string | null;
}

export interface MembreCreateInput {
  email: string;
  nom?: string;
  prenoms?: string;
  telephone?: string;
  commission_id?: string;
  groupe?: string;
}

export interface MembreUpdateInput {
  nom?: string;
  prenoms?: string;
  telephone?: string;
  commission_id?: string;
  groupe?: string;
  statut?: string;
  verifie?: boolean;
}

export interface Commission {
  id: string;
  nom: string;
  description: string | null;
}

export interface CommissionCreateInput {
  nom: string;
  description?: string;
}

export interface Evenement {
  id: string;
  titre: string;
  type: string | null;
  volet: string;
  debut: string;
  fin: string | null;
  lieu: string | null;
}

export interface EvenementCreateInput {
  titre: string;
  type?: string;
  volet?: string;
  debut: string;
  fin?: string;
  lieu?: string;
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
  if (status === 401) return "Session expiree";
  if (status === 403) return "Acces refuse";
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
  method: "POST" | "PATCH",
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
  return authedSend<MembreProfile>("/api/v1/admin/membres", token, "POST", input, "Creation impossible");
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
    "Mise a jour impossible",
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
    "Creation impossible",
  );
}

export function getEvenements(token: string): Promise<Evenement[]> {
  return authedGet<Evenement[]>("/api/v1/admin/evenements", token, "Evenements indisponibles");
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
    "Creation impossible",
  );
}

export function apiBaseUrl(): string {
  return BASE;
}
