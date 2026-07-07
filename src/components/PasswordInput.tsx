import { useState } from "react";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Champ de saisie de mot de passe avec bouton d'affichage / masquage.
 *
 * Reprend le style des inputs du back-office (`.auth-card input`,
 * `.form-card input`). Le bouton est de type "button" pour ne jamais
 * soumettre le formulaire parent. Chaque instance gere son propre etat de
 * visibilite, ce qui permet d'avoir plusieurs champs independants dans un
 * meme formulaire (ancien, nouveau, confirmation).
 */
export function PasswordInput(props: PasswordInputProps): JSX.Element {
  const [voir, setVoir] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={voir ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVoir((v) => !v)}
        aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={voir}
        title={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {voir ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 10 7-.5 1.2-1.4 2.6-2.7 3.8M6.3 6.3C4.3 7.6 2.8 9.6 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        )}
      </button>
    </div>
  );
}
