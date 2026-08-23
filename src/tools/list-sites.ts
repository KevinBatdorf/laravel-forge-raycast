import { allSites } from "./helpers";

type Input = {
  /**
   * A server's id as a string, or part of its name, to limit the list to. Leave empty for every
   * server and account.
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
      zeroDowntimeDeployments: site.zero_downtime_deployments,
      usesEnvoyer: site.uses_envoyer,
      isolated: site.isolated,
      appType: site.app_type,
      webDirectory: site.web_directory,
      healthcheckUrl: site.healthcheck_url,
      maintenanceMode: site.maintenance_mode?.enabled,
      aliases: site.aliases,
    }));
}
