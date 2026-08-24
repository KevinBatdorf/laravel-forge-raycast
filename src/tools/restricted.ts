import { forgeSiteUrl } from "../lib/url";
import { IServer } from "../types";

export const siteRestrictions = (server: IServer, siteId: number) => {
  const forgeUrl = forgeSiteUrl(server, siteId);
  if (!forgeUrl) return {};
  return {
    environment: `Not returned. Read or edit it at ${forgeUrl}/environment`,
    deploymentScript: `Not returned. Read or edit it at ${forgeUrl}/settings/deployments`,
    // Anyone holding this URL can deploy the site
    deploymentUrl: `Not returned. Find or rotate it at ${forgeUrl}/settings/deployments`,
  };
};
