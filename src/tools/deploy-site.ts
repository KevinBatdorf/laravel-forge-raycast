import { Tool } from "@raycast/api";
import { Site } from "../api/Site";
import { findSite } from "./helpers";

type Input = {
  /**
   * Name of the site to deploy, as shown in Forge (for example "example.com").
   */
  site: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ site }) => {
  const { site: found, server } = await findSite(site);
  return {
    message: `Deploy ${found.name}?`,
    info: [
      { name: "Server", value: server.name ?? String(server.id) },
      { name: "Branch", value: found.repository?.branch ?? "unknown" },
    ],
  };
};

export default async function tool({ site }: Input) {
  const { site: found, server, token } = await findSite(site);
  await Site.deploy({ orgSlug: server.org_slug, serverId: server.id, siteId: found.id, token });
  return { site: found.name, server: server.name, started: true };
}
