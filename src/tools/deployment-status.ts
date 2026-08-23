import { deploymentStatus } from "../api/Site";
import { allSites, SiteMatch } from "./helpers";

// Forge only fills a site's own deployment_status while a deploy is running
const statusOf = ({ site }: SiteMatch) => site.deployment_status ?? deploymentStatus(site.latest_deployment?.status);

// A deploy sits at queued until the server picks it up
const IN_FLIGHT = ["deploying", "queued"];

export default async function tool() {
  const sites = await allSites();
  console.log(
    "[deployment-status] sites:",
    sites.length,
    "| non-idle:",
    JSON.stringify(
      sites
        .map(({ site }) => ({
          name: site.name,
          attr: site.deployment_status,
          dep: site.latest_deployment?.status,
        }))
        .filter((row) => row.attr || row.dep),
    ),
  );
  const listed = (wanted: string[]) =>
    sites
      .filter((match) => wanted.includes(statusOf(match) ?? ""))
      .map((match) => ({ site: match.site.name, server: match.server.name, status: statusOf(match) }));

  const nonIdle = sites
    .map(({ site }) => ({ name: site.name, attr: site.deployment_status, dep: site.latest_deployment?.status }))
    .filter((row) => row.attr || row.dep);
  const result = {
    testing: { build: "dev-1512", sitesSeen: sites.length, nonIdle },
    deploying: listed(IN_FLIGHT),
    failed: listed(["failed"]),
  };
  console.log("[deployment-status] result:", JSON.stringify(result));
  return result;
}
