import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "../core/http/apiClient";

export function usePublicPortfolioData() {
  const apiClient = useMemo(() => createApiClient(async () => null), []);
  const [data, setData] = useState({
    page: null,
    contact: null,
    articles: [],
    skills: [],
    projects: []
  });

  useEffect(() => {
    async function load() {
      try {
        const [page, contact, articles, skills, projects] = await Promise.all([
          apiClient.getPublic("/api/content/page"),
          apiClient.getPublic("/api/content/contact"),
          apiClient.getPublic("/api/articles"),
          apiClient.getPublic("/api/skills"),
          apiClient.getPublic("/api/projects")
        ]);

        setData({
          page: page ?? null,
          contact: contact ?? null,
          articles: Array.isArray(articles) ? articles : [],
          skills: Array.isArray(skills) ? skills : [],
          projects: Array.isArray(projects) ? projects : []
        });
      } catch {
        // Keep static fallback content when API is unavailable.
      }
    }

    load();
  }, [apiClient]);

  return data;
}
