import { allSites } from "./helpers";

type Input = {
  /**
   * A server id, or part of a server name, to filter by. Leave empty for every site.
   */
  server?: string;
};

export default async function tool({ server }: Input) {
  const sites = await allSites();
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
      deploymentStatus: site.deployment_status,
      repository: site.repository?.url,
      branch: site.repository?.branch,
      quickDeploy: site.quick_deploy,
    }));
}
