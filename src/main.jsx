import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "./App.jsx";
import {bootstrap} from "./lib/storage.js";
import "@fontsource-variable/inter";
import "./styles.css";

// Saved maps load from IndexedDB before the first render.
bootstrap().then(initial=>{
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App initial={initial}/>
    </StrictMode>
  );
});
