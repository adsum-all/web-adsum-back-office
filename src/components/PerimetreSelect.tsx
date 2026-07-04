import { useState } from "react";

import { getCommissions, getCoordinations, getIntendances, getSousCommissions, getTribus } from "../api.js";
import { uniteLabel } from "../format.js";
import { useResource } from "../useResource.js";

const CUSTOM = "__custom__";

/**
 * Selects the scope ("perimetre") of a function or consecration from the real
 * organisational units (commissions and missions, sous-commissions,
 * coordinations, intendances, tribes) instead of free typing, so the value is
 * never mistyped. A last "Autre" option keeps a free-text escape hatch for a
 * scope that is not an existing unit.
 */
export function PerimetreSelect({
  token,
  value,
  onChange,
  disabled,
}: {
  token: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}): JSX.Element {
  const commissions = useResource(() => getCommissions(token), [token]);
  const sous = useResource(() => getSousCommissions(token), [token]);
  const coords = useResource(() => getCoordinations(token), [token]);
  const intend = useResource(() => getIntendances(token), [token]);
  const tribus = useResource(() => getTribus(token), [token]);

  const groups: { label: string; options: string[] }[] = [
    { label: "Commissions & missions", options: (commissions.data ?? []).map((c) => uniteLabel(c)) },
    { label: "Sous-commissions", options: (sous.data ?? []).map((s) => `Sous-commission ${s.nom}`) },
    { label: "Coordinations", options: (coords.data ?? []).map((c) => `Coordination ${c.nom}`) },
    { label: "Intendances", options: (intend.data ?? []).map((i) => `Intendance ${i.nom}`) },
    { label: "Tribus", options: (tribus.data ?? []).map((t) => `Tribu ${t.nom}`) },
  ];
  const known = groups.flatMap((g) => g.options);
  const loaded = commissions.data && sous.data && coords.data && intend.data && tribus.data;
  // A stored value that is not (yet) a known unit is treated as a free entry.
  const [forceCustom, setForceCustom] = useState(false);
  const isCustom = forceCustom || (!!value && !!loaded && !known.includes(value));
  const selectValue = isCustom ? CUSTOM : known.includes(value) ? value : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <select
        value={selectValue}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setForceCustom(true);
          } else {
            setForceCustom(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Aucun</option>
        {groups.map((g) =>
          g.options.length > 0 ? (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </optgroup>
          ) : null,
        )}
        <option value={CUSTOM}>Autre (saisie libre)...</option>
      </select>
      {isCustom && (
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Préciser le périmètre"
        />
      )}
    </div>
  );
}
