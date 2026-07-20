/**
 * Contextual help marker: a small "?" that explains a complex field (what it is,
 * where it shows, whether members see it, whether it recurs). Accessible via title +
 * aria-label so it works with keyboard and screen readers, no extra dependency.
 */
export function Aide({ texte }: Readonly<{ texte: string }>): JSX.Element {
  return (
    <span
      className="inst-aide"
      role="img"
      tabIndex={0}
      title={texte}
      aria-label={`Aide : ${texte}`}
    >
      ?
    </span>
  );
}
