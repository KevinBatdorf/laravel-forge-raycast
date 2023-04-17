import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { ConfigFile, IServer, ISite } from "../types";

const defaultHeaders = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
};
type ServerWithToken = { serverId: IServer["id"]; token: string };
type ServerSiteWithToken = { serverId: IServer["id"]; siteId: ISite["id"]; token: string };

export const Site = {
  async getAll({ serverId, token }: ServerWithToken) {
    const response = await fetch(`${FORGE_API_URL}/servers/${serverId}/sites`, {
      method: "get",
      headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    });
    const siteData = (await response.json()) as { sites: ISite[] };
    const sites =
      siteData?.sites?.map((site) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { telegram_secret, ...siteData } = site;
        return siteData;
      }) ?? [];
    return sortBy(sites, "name") as ISite[];
  },

  async get({ serverId, siteId, token }: ServerSiteWithToken) {
    try {
      const response = await fetch(`${FORGE_API_URL}/servers/${serverId}/sites/${siteId}`, {
        method: "get",
        headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
      });
      const siteData = (await response.json()) as { site: ISite };
      if (!siteData?.site?.id) throw new Error("Site not found");
      return siteData.site;
    } catch (error: unknown) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, error?.message ?? "Site not found");
      }
      // Rethrow the error so the caller can handle it
      throw error;
    }
  },

  async deploy({ serverId, siteId, token }: ServerSiteWithToken) {
    const toast = new Toast({ style: Toast.Style.Animated, title: "Deploying..." });
    try {
      toast.show();
      await fetch(`${FORGE_API_URL}/servers/${serverId}/sites/${siteId}/deployment/deploy`, {
        method: "post",
        headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
      });
      await new Promise((resolve) => setTimeout(resolve, 3000));
      toast.hide();
    } catch (error: unknown) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, error?.message ?? "There was an error deploying.");
      }
      // Rethrow the error so the caller can handle it
      throw error;
    }
  },

  async getConfig({ serverId, siteId, token, type }: ServerSiteWithToken & { type: ConfigFile }) {
    try {
      const response = await fetch(`${FORGE_API_URL}/servers/${serverId}/sites/${siteId}/${type}`, {
        method: "get",
        headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
      });
      return (await response.text())?.trim();
    } catch (error: unknown) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, error?.message ?? "Config not found");
      }
      // Rethrow the error so the caller can handle it
      throw error;
    }
  },
};
