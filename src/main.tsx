import './index.css'
import App from './App.tsx'
import {createRoot} from "react-dom/client";
import {StrictMode} from "react";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App/>
  </StrictMode>
);
