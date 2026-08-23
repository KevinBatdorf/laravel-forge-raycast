import { allSites, searchSites, siteDeploymentStatus } from "./helpers";

type Input = {
  /**
   * Part of a site name to search for. Forge matches on contains, so "6-8" finds 6-8.example.com.
   */
  site?: string;
  /**
   * A server id, or part of a server name, to filter by. Leave empty for every site.
   */
  server?: string;
};

export default async function tool({ site, server }: Input) {
  const sites = site ? await searchSites(site) : await allSites();
  const wanted = server?.trim().toLowerCase();
  return sites
    .filter(
      (match) =>
        !wanted || (match.server.name ?? "").toLowerCase().includes(wanted) || String(match.server.id) === wanted,
    )
    .map(({ site, server: owner }) => ({
      id: site.id,
      name: site.name,
      server: owner.name,
      url: site.url,
      phpVersion: site.php_version,
      status: site.status,
      deploymentStatus: siteDeploymentStatus(site),
      repository: site.repository?.url,
      branch: site.repository?.branch,
      quickDeploy: site.quick_deploy,
    }));
}
