import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { IServer, ISite } from "../types";

const defaultHeaders = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
};

type DynamicReboot = {
  serverId: number;
  token: string;
  key?: string;
  label?: string;
};

export const Server = {
  async getAll() {
    const preferences = getPreferenceValues();
    // Because we have support for two accounts, pass the key through
    let servers = await getServers({
      tokenKey: "laravel_forge_api_key",
      token: preferences?.laravel_forge_api_key as string,
    });

    if (preferences?.laravel_forge_api_key_two) {
      const serversTwo = await getServers({
        tokenKey: "laravel_forge_api_key_two",
        token: preferences?.laravel_forge_api_key_two as string,
      });
      servers = servers.concat(serversTwo);
    }
    return sortBy(servers, (s) => s?.name?.toLowerCase()) ?? {};
  },

  async reboot({ serverId, token, key = "", label = "server" }: DynamicReboot) {
    const endpoint = key ? `servers/${serverId}/${key}/reboot` : `servers/${serverId}/reboot`;
    try {
      await fetch(`${FORGE_API_URL}/${endpoint}`, {
        method: "post",
        headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
      });
      showToast(Toast.Style.Success, `Rebooting ${label}...`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, error?.message ?? "Error rebooting server");
      }
      // Rethrow the error so the caller can handle it
      throw error;
    }
  },
};

const getServers = async ({ token, tokenKey }: { token: string; tokenKey: string }) => {
  const response = await fetch(`${FORGE_API_URL}/servers`, {
    method: "get",
    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    throw new Error("Error authenticating with Forge");
  }
  // Get site data which will by searchable along with servers
  let keywordsByServer: Record<number, Set<string>> = {};
  try {
    const sitesResponse = await fetch(`${FORGE_API_URL}/sites`, {
      method: "get",
      headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    });
    const sitesData = (await sitesResponse.json()) as { sites: ISite[] };
    keywordsByServer = getSiteKeywords(sitesData?.sites ?? []);
  } catch (error) {
    console.error(error);
    // fail gracefully here as it's not critical information
  }

  // Get the server data
  const serverData = (await response.json()) as ServersResponse;
  const servers: IServer[] = serverData?.servers ?? [];
  return servers
    .map((server) => {
      server.keywords = server?.id && keywordsByServer[server.id] ? [...keywordsByServer[server.id]] : [];
      server.api_token_key = tokenKey;
      return server;
    })
    .filter((s) => !s.revoked);
};

const getSiteKeywords = (sites: ISite[]) => {
  return sites?.reduce((acc, site): Record<number, Set<string>> => {
    if (!site?.server_id) return acc;
    const keywords = [site?.name ?? "", ...(site?.aliases ?? [])];
    if (!acc[site.server_id]) {
      acc[site.server_id] = new Set<string>();
    }
    keywords.forEach((keyword) => site?.server_id && acc[site.server_id].add(keyword));
    return acc;
  }, <Record<number, Set<string>>>{});
};

type ServersResponse = {
  servers?: IServer[];
};
