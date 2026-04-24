export async function getProjectsUseCase(projectRepository) {
  const projects = await projectRepository.getAll();
  return projects.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return Number(b.isFeatured) - Number(a.isFeatured);
    }
    return a.title.localeCompare(b.title);
  });
}
