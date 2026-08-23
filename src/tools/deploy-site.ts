import { Tool } from "@raycast/api";
import { Site } from "../api/Site";
import { repositoryLabel } from "../lib/url";
import { findSite, resolveForConfirmation } from "./helpers";

type Input = {
  /**
   * The site's id from list-sites, or its exact name as shown in Forge (for example "example.com").
   * Look it up first: names repeat across servers, and a partial name is refused.
   */
  site: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ site }) => {
  const match = await resolveForConfirmation(() => findSite(site));
  if (!match) return { message: `Deploy "${site}"?` };
  const { site: found, server } = match;
  return {
    message: `Deploy ${found.name}?`,
    info: [
      { name: "Server", value: server.name ?? String(server.id) },
      { name: "Repository", value: repositoryLabel(found.repository) || "none" },
      { name: "Branch", value: found.repository?.branch ?? "unknown" },
      { name: "Current status", value: found.deployment_status ?? "idle" },
      { name: "Quick deploy", value: found.quick_deploy ? "on" : "off" },
    ],
  };
};

export default async function tool({ site }: Input) {
  const { site: found, server, token } = await findSite(site);
  await Site.deploy({ orgSlug: server.org_slug, serverId: server.id, siteId: found.id, token });
  return { site: found.name, server: server.name, started: true };
}
