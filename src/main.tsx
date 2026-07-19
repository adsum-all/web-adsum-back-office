import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { initTheme } from "./lib/theme.js";
import "@adsum/tokens/tokens.css";
import "./styles.css";

// Apply the persisted display theme before the first paint (no flash of the wrong theme).
initTheme();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
