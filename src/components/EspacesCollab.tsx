import {
  type CollabCompte,
  type CollabEspace,
  listCollabComptes,
  listCollabEspaces,
} from "../api.js";
import { useResource } from "../useResource.js";

// Read-only supervision of the collaboration spaces for an administrator: which
// account belongs to which space, with which space role, plus pending access
// requests. The actual membership management (add, change role, accept request)
// stays in the collaboration application, governed per space by its owners; this
// screen only answers "who can see and do what, and where" from the back office.

const ROLE_LABELS: Record<string, string> = {
  proprietaire: "Proprietaire",
  admin: "Administrateur",
  membre: "Membre",
  observateur: "Observateur",
};
const ROLE_ORDRE = ["proprietaire", "admin", "membre", "observateur"];

export function EspacesCollab({ token }: { token: string }): JSX.Element {
  const espaces = useResource(() => listCollabEspaces(token), [token]);
  const comptes = useResource<CollabCompte[]>(() => listCollabComptes(token), [token]);

  if (espaces.loading || comptes.loading) {
    return (
      <section className="panel">
        <p>Chargement des espaces de collaboration...</p>
      </section>
    );
  }
  if (espaces.error) {
    return (
      <section className="panel">
        <p style={{ color: "var(--danger, #c0392b)" }}>{espaces.error}</p>
      </section>
    );
  }

  const nomPar = new Map<string, string>((comptes.data ?? []).map((c) => [c.id, c.nom]));
  const nom = (id: string): string => nomPar.get(id) ?? id;
  const liste = [...(espaces.data ?? [])].sort((a, b) => Number(a.archive) - Number(b.archive) || a.nom.localeCompare(b.nom));
  const collaborateurs = new Set<string>();
  liste.forEach((e) => e.membres.forEach((m) => collaborateurs.add(m.membre_id)));
  const demandesEnAttente = liste.reduce((n, e) => n + e.demandes_acces.length, 0);

  return (
    <section className="panel">
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Espaces collaboration</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Supervision en lecture seule : qui a acces a quel espace, avec quel role. L'ajout de membres et le
          changement de role se font dans l'application de collaboration, par les responsables de chaque espace.
        </p>
      </header>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
        <Kpi valeur={liste.length} libelle="espaces" />
        <Kpi valeur={collaborateurs.size} libelle="collaborateurs distincts" />
        <Kpi valeur={demandesEnAttente} libelle="demandes en attente" />
      </div>

      {liste.length === 0 && <p className="muted">Aucun espace de collaboration pour l'instant.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {liste.map((espace) => (
          <EspaceCarte key={espace.id} espace={espace} nom={nom} />
        ))}
      </div>
    </section>
  );
}

function Kpi({ valeur, libelle }: { valeur: number; libelle: string }): JSX.Element {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{valeur}</div>
      <div className="muted" style={{ fontSize: 13 }}>{libelle}</div>
    </div>
  );
}

function EspaceCarte({ espace, nom }: { espace: CollabEspace; nom: (id: string) => string }): JSX.Element {
  return (
    <article
      style={{
        border: "1px solid var(--border, #e2e2e2)",
        borderRadius: 10,
        padding: "14px 16px",
        opacity: espace.archive ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            background: espace.couleur || "#4b5563",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {espace.initiale}
        </span>
        <strong>{espace.nom}</strong>
        <span className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>{espace.type}</span>
        {espace.archive && <span className="muted" style={{ fontSize: 12 }}>(archive)</span>}
      </div>

      {espace.description && (
        <p className="muted" style={{ margin: "8px 0 0" }}>{espace.description}</p>
      )}

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {ROLE_ORDRE.map((role) => {
          const membres = espace.membres.filter((m) => m.role === role);
          if (membres.length === 0) return null;
          return (
            <div key={role} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, minWidth: 130 }}>{ROLE_LABELS[role] ?? role} ({membres.length})</span>
              <span className="muted">{membres.map((m) => nom(m.membre_id)).join(", ")}</span>
            </div>
          );
        })}
        {espace.membres.length === 0 && <span className="muted">Aucun membre.</span>}
      </div>

      {espace.demandes_acces.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, minWidth: 130, color: "var(--danger, #c0392b)" }}>
            Demandes en attente ({espace.demandes_acces.length})
          </span>
          <span className="muted">{espace.demandes_acces.map((d) => nom(d.membre_id)).join(", ")}</span>
        </div>
      )}
    </article>
  );
}
