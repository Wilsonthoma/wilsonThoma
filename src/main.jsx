import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AppContextProvider } from "./context/AppContext.jsx";
import { Toaster } from "react-hot-toast"; // ✅ Add this import

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppContextProvider>
        <App />
        {/* ✅ Add Toaster here so toast works globally */}
        <Toaster position="top-right" reverseOrder={false} />
      </AppContextProvider>
    </BrowserRouter>
  </StrictMode>
);
