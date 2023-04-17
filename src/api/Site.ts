import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { ConfigFile, IServer, ISite } from "../types";
import { apiFetch, apiFetchText } from "../lib/api";

const defaultHeaders = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
};
type ServerWithToken = { serverId: IServer["id"]; token: string };
type ServerSiteWithToken = { serverId: IServer["id"]; siteId: ISite["id"]; token: string };

export const Site = {
  async getAll({ serverId, token }: ServerWithToken) {
    const { sites } = await apiFetch<{ sites: ISite[] }>(`${FORGE_API_URL}/servers/${serverId}/sites`, {
      method: "get",
      headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    });
    const filtered =
      sites?.map((site) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { telegram_secret, ...siteData } = site;
        return siteData;
      }) ?? [];
    return sortBy(filtered, "name") as ISite[];
  },

  async get({ serverId, siteId, token }: ServerSiteWithToken) {
    const { site } = await apiFetch<{ site: ISite }>(`${FORGE_API_URL}/servers/${serverId}/sites/${siteId}`, {
      method: "get",
      headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    });
    return site;
  },

  async deploy({ serverId, siteId, token }: ServerSiteWithToken) {
    await apiFetch(`${FORGE_API_URL}/servers/${serverId}/sites/${siteId}/deployment/deploy`, {
      method: "post",
      headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    });
  },

  async getConfig({ serverId, siteId, token, type }: ServerSiteWithToken & { type: ConfigFile }) {
    const response = await apiFetchText<string>(`${FORGE_API_URL}/servers/${serverId}/sites/${siteId}/${type}`, {
      method: "get",
      headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    });
    return response.trim();
  },
};
