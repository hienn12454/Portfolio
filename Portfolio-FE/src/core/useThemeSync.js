import { useEffect } from "react";

/**
 * Reads the theme preference from localStorage and applies it to
 * document.documentElement (as data-theme="dark"|"light").
 *
 * Call this at the top of every page component that is NOT the HomePage
 * (HomePage already manages the theme toggle itself).
 */
export function useThemeSync() {
  useEffect(() => {
    const saved = localStorage.getItem("portfolio-theme");
    document.documentElement.setAttribute(
      "data-theme",
      saved === "light" ? "light" : "dark"
    );
  }, []);
}
