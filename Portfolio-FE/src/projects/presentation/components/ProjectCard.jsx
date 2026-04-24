export function ProjectCard({ project }) {
  return (
    <article className="project-card">
      <header className="project-card__header">
        <h3>{project.title}</h3>
        {project.isFeatured ? <span className="badge">Featured</span> : null}
      </header>

      <p>{project.summary || "No summary available."}</p>

      <footer className="project-card__actions">
        {project.repositoryUrl ? (
          <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
            Repository
          </a>
        ) : null}

        {project.demoUrl ? (
          <a href={project.demoUrl} target="_blank" rel="noreferrer">
            Demo
          </a>
        ) : null}
      </footer>
    </article>
  );
}
