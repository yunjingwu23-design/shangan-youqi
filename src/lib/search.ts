import { jobs, posts, companyAliases, roleSynonyms } from "./data";
export function searchJobs(query: string, precise = false) {
  const q = query.trim().toLocaleLowerCase().replace(/\s/g, "");
  if (!q) return jobs;
  return jobs.filter((j) => {
    const direct = [j.company, j.title, ...j.tags].some((v) =>
      v.toLocaleLowerCase().replace(/\s/g, "").includes(q),
    );
    if (precise || direct) return direct;
    const aliases = companyAliases[j.company] || [];
    if (aliases.some((v) => v.toLocaleLowerCase() === q)) return true;
    return Object.entries(roleSynonyms).some(
      ([key, terms]) =>
        [key, ...terms].some((v) => v.toLocaleLowerCase() === q) &&
        [key, ...terms].some((v) => j.title.replace(/\s/g, "").includes(v)),
    );
  });
}
export function searchPosts(query: string, precise = false) {
  const q = query.trim().toLowerCase();
  const companies = new Set(searchJobs(query, precise).map((j) => j.company));
  return posts.filter(
    (p) =>
      !q ||
      [p.company, p.title, p.category].some((s) =>
        s.toLowerCase().includes(q),
      ) ||
      (!precise && companies.has(p.company)),
  );
}
