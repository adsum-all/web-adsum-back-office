import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  apiBaseUrl,
  createMembre,
  getCommissions,
  getEvenements,
  getMembres,
  login,
  updateMembre,
} from "./api.js";

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function mockFetch(status: number, body: unknown): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      };
    }),
  );
  return { calls };
}

describe("admin api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("targets the deployed API by default", () => {
    expect(apiBaseUrl()).toMatch(/^https?:\/\//);
  });

  it("returns the session token and role on login", async () => {
    mockFetch(200, { access_token: "jwt-123", token_type: "bearer", role: "admin" });
    const session = await login("a@b.c", "pw");
    expect(session.token).toBe("jwt-123");
    expect(session.role).toBe("admin");
  });

  it("raises a typed error on invalid credentials", async () => {
    mockFetch(401, { detail: "invalid credentials" });
    await expect(login("a@b.c", "bad")).rejects.toBeInstanceOf(ApiError);
  });

  it("lists members with search and pagination query", async () => {
    const { calls } = mockFetch(200, []);
    await getMembres("jwt", { limit: 10, offset: 20, q: "ada" });
    const url = calls.at(0)?.url ?? "";
    expect(url).toContain("/api/v1/admin/membres");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=20");
    expect(url).toContain("q=ada");
  });

  it("surfaces a typed error when the admin endpoint is missing", async () => {
    mockFetch(404, { detail: "Not Found" });
    await expect(getMembres("jwt")).rejects.toMatchObject({ status: 404 });
  });

  it("creates a member and sends a JSON body with a bearer token", async () => {
    const { calls } = mockFetch(200, {
      id: "m1",
      matricule: "ADS-000001",
      email: "n@adsum.org",
      nom: null,
      prenoms: null,
      telephone: null,
      groupe: null,
      statut: "actif",
      verifie: false,
      commission: null,
    });
    const created = await createMembre("jwt", { email: "n@adsum.org" });
    expect(created.matricule).toBe("ADS-000001");
    const init = calls.at(0)?.init;
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("n@adsum.org");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("patches a member with the PATCH verb", async () => {
    const { calls } = mockFetch(200, {
      id: "m1",
      matricule: "ADS-000001",
      email: "n@adsum.org",
      nom: "Doe",
      prenoms: null,
      telephone: null,
      groupe: null,
      statut: "actif",
      verifie: true,
      commission: null,
    });
    const updated = await updateMembre("jwt", "m1", { nom: "Doe", verifie: true });
    expect(updated.nom).toBe("Doe");
    expect(calls.at(0)?.init?.method).toBe("PATCH");
  });

  it("fetches commissions", async () => {
    mockFetch(200, [{ id: "c1", nom: "Logistique", description: null }]);
    const commissions = await getCommissions("jwt");
    expect(commissions.at(0)?.nom).toBe("Logistique");
  });

  it("fetches events", async () => {
    mockFetch(200, [
      {
        id: "e1",
        titre: "Assemblee",
        type: null,
        volet: "A",
        debut: "2026-07-01T10:00:00Z",
        fin: null,
        lieu: null,
      },
    ]);
    const events = await getEvenements("jwt");
    expect(events).toHaveLength(1);
    expect(events.at(0)?.titre).toBe("Assemblee");
  });
});
