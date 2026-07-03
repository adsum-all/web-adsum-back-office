import type { JSX } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  /** Accessible label describing what the switch controls. */
  label: string;
}

/**
 * Accessible On/Off toggle switch (track plus sliding knob), styled with the
 * theme tokens. Replaces plain checkboxes and text pills so a state is readable
 * at a glance and operable by keyboard (role="switch", aria-checked).
 */
export function Switch({ checked, onChange, disabled = false, label }: SwitchProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={checked ? "Activé" : "Désactivé"}
      disabled={disabled}
      onClick={onChange}
      style={{
        position: "relative",
        width: 46,
        height: 26,
        flexShrink: 0,
        padding: 0,
        border: "none",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "var(--adsum-ok, #1f9d55)" : "var(--adsum-line, #cbd2dd)",
        transition: "background 160ms ease",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
          transition: "left 160ms ease",
        }}
      />
    </button>
  );
}
