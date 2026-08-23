import { deploymentStatus } from "../api/Site";
import { allSites, SiteMatch } from "./helpers";

// Forge only fills a site's own deployment_status while a deploy is running
const statusOf = ({ site }: SiteMatch) => site.deployment_status ?? deploymentStatus(site.latest_deployment?.status);

export default async function tool() {
  const sites = await allSites();
  const named = (status: string) =>
    sites
      .filter((match) => statusOf(match) === status)
      .map(({ site, server }) => ({ site: site.name, server: server.name }));

  return { deploying: named("deploying"), failed: named("failed") };
}
