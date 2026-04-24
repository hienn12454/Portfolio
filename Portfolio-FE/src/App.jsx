import { HomePage } from "./home/HomePage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "./admin/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
