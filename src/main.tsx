import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/source-serif-4";
import "./kit/preflight.css";
import "./kit/tokens.css";
import "./kit/components.css";
import "./kit/workspace.css";
import "./kit/app.css";
import "./app.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
