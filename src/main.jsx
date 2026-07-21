import ReactDOM from "react-dom/client";
import React from "react";
import App from "./App.jsx";
import "./assets/styles/index.css";
import { initI18n } from "./i18n";

const rootEl = document.getElementById("root");
if (rootEl) {
  initI18n().then(() => {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
}
