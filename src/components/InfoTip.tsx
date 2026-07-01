import { useEffect, useRef, useState } from "react";

/**
 * A small, professional info icon. Click to reveal a well-positioned help
 * bubble; it never overflows the viewport edges and closes on outside click.
 */
export function InfoTip({ text, title }: { text: string; title?: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        type="button"
        aria-label="Aide"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1px solid var(--adsum-line)",
          background: open ? "var(--adsum-accent, #2a4fad)" : "var(--adsum-panel, #fff)",
          color: open ? "#fff" : "var(--adsum-muted, #6b7280)",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
          marginLeft: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 60,
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 260,
            maxWidth: "80vw",
            background: "#111827",
            color: "#f9fafb",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1.5,
            boxShadow: "0 12px 30px -10px rgba(0,0,0,.5)",
            textAlign: "left",
            fontWeight: 400,
          }}
        >
          {title && <span style={{ display: "block", fontWeight: 700, marginBottom: 3 }}>{title}</span>}
          {text}
        </span>
      )}
    </span>
  );
}
