export function toProjectModel(rawProject) {
  return {
    id: rawProject.id,
    title: rawProject.title ?? "",
    slug: rawProject.slug ?? "",
    summary: rawProject.summary ?? "",
    repositoryUrl: rawProject.repositoryUrl ?? "",
    demoUrl: rawProject.demoUrl ?? "",
    isFeatured: Boolean(rawProject.isFeatured)
  };
}
