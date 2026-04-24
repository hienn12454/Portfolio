import { ProjectCard } from "../components/ProjectCard";
import { useProjects } from "../hooks/useProjects";

export function ProjectsPage() {
  const { projects, isLoading, error } = useProjects();

  return (
    <main className="container">
      <h1>Portfolio Projects</h1>

      {isLoading ? <p>Loading projects...</p> : null}
      {error ? <p className="error">Cannot load projects: {error}</p> : null}

      {!isLoading && !error ? (
        <section className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
