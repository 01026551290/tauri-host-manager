import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { HostProvider } from "./context/host-provider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <HostProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </HostProvider>
);
