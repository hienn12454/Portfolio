import { useEffect, useState } from "react";
import { getProjectsUseCase } from "../../application/getProjectsUseCase";
import { projectsApiRepository } from "../../infrastructure/projectsApiRepository";

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getProjectsUseCase(projectsApiRepository);
        if (mounted) {
          setProjects(data);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    projects,
    isLoading,
    error
  };
}
