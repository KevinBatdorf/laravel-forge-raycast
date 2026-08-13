import { getPreferenceValues } from "@raycast/api";
import { sortBy } from "lodash";
import { IServer, ISite } from "../types";
import { flatten, getCollection, postAction } from "../lib/forge";
import { Site } from "./Site";

type Reboot = {
  server: IServer;
  token: string;
  service?: string;
};

export const Server = {
  async getAll() {
    const preferences = getPreferenceValues();
    // Because we have support for two accounts, pass the key through
    let servers = await getServers({
      tokenKey: "laravel_forge_api_token",
      token: preferences?.laravel_forge_api_token as string,
      sshUser: (preferences?.laravel_forge_ssh_user as string) || "forge",
    });

    if (preferences?.laravel_forge_api_token_two) {
      const serversTwo = await getServers({
        tokenKey: "laravel_forge_api_token_two",
        token: preferences?.laravel_forge_api_token_two as string,
        sshUser: (preferences?.laravel_forge_ssh_user_two as string) || "forge",
      });
      servers = [...servers, ...serversTwo];
    }
    return sortBy(servers, (s) => s?.name?.toLowerCase()) ?? {};
  },

  async reboot({ server, token, service }: Reboot) {
    const endpoint = service
      ? `orgs/${server.org_slug}/servers/${server.id}/services/${service}/actions`
      : `orgs/${server.org_slug}/servers/${server.id}/actions`;
    // PHP runs one pool per installed version, so the reboot has to name one
    const payload = service === "php" ? { action: "reboot", version: server.php_version } : { action: "reboot" };
    await postAction(endpoint, token, payload);
  },
};

const getServers = async ({ token, tokenKey, sshUser }: { token: string; tokenKey: string; sshUser: string }) => {
  if (!token) return [];
  const organizations = await getCollection("orgs", token);
  const serversByOrg = await Promise.all(
    organizations.map(async (organization) => {
      const orgSlug = String(organization?.attributes?.slug ?? "");
      const servers = await getCollection(`orgs/${orgSlug}/servers`, token);
      return servers.map((server) => ({
        ...flatten<IServer>(server),
        org_slug: orgSlug,
        api_token_key: tokenKey,
        ssh_user: sshUser,
      }));
    }),
  );

  // Get site data which will by searchable along with servers
  let keywordsByServer: Record<number, Set<string>> = {};
  try {
    const sites = await Site.getSitesWithoutServer({ token });
    keywordsByServer = getSiteKeywords(sites ?? []);
  } catch (error) {
    console.error(error);
    // fail gracefully here as it's not critical information
  }

  return serversByOrg
    .flat()
    .map((server) => {
      server.keywords = server?.id && keywordsByServer[server.id] ? [...keywordsByServer[server.id]] : [];
      return server;
    })
    .filter((s) => !s.revoked);
};

const getSiteKeywords = (sites: ISite[]) => {
  return sites?.reduce(
    (acc, site): Record<number, Set<string>> => {
      if (!site?.server_id) return acc;
      const keywords = [site?.name ?? "", ...(site?.aliases ?? [])];
      if (!acc[site.server_id]) {
        acc[site.server_id] = new Set<string>();
      }
      keywords.forEach((keyword) => site?.server_id && acc[site.server_id].add(keyword));
      return acc;
    },
    <Record<number, Set<string>>>{},
  );
};
