import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";

function App() {
  return (
    <BrowserRouter>
      <PwaInstallPrompt />
      <Routes>
        <Route path="/login" element={<div>Login Page Placeholder</div>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<div>404 — Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
