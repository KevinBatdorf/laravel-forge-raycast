import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import { ISite } from "../Site";
import { sortBy, mapKeys, camelCase } from "lodash";
import { IServer } from "../Server";
import { checkServerisOnline } from "../helpers";
import { FORGE_API_URL } from "../config";

function theHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

export const Site = {
  async getAll(server: IServer) {
    const headers = theHeaders(server.apiToken);
    try {
      const response = await fetch(`${FORGE_API_URL}/servers/${server.id}/sites`, {
        method: "get",
        headers,
      });
      const siteData = (await response.json()) as Sites;
      let sites = siteData?.sites ?? [];
      // do a check to see if the server is returning 200
      sites = await Promise.all(
        sites.map(async (s) => {
          s.isOnline = await checkServerisOnline([...s.aliases, s.name]);
          return s;
        })
      );
      // eslint-disable-next-line
      // @ts-ignore Not sure how to convert Dictionary from lodash to IServer
      sites = sites.map((s) => mapKeys(s, (_, k) => camelCase(k)) as ISite);
      return sortBy(sites, "name") as ISite[];
    } catch (error: unknown) {
      showToast(ToastStyle.Failure, (error as ErrorEvent).message);
      return;
    }
  },
  async get(site: ISite, server: IServer) {
    const headers = theHeaders(server.apiToken);
    try {
      const response = await fetch(`${FORGE_API_URL}/servers/${server.id}/sites/${site.id}`, {
        method: "get",
        headers,
      });
      const siteData = (await response.json()) as ISite;
      // eslint-disable-next-line
      // @ts-ignore Not sure how to convert Dictionary from lodash to IServer
      return mapKeys(siteData["site"], (_, k) => camelCase(k)) as ISite;
    } catch (error: unknown) {
      showToast(ToastStyle.Failure, (error as ErrorEvent).message);
      return;
    }
  },
  async deploy(site: ISite, server: IServer) {
    const headers = theHeaders(server.apiToken);
    try {
      await fetch(`${FORGE_API_URL}/servers/${server.id}/sites/${site.id}/deployment/deploy`, {
        method: "post",
        headers,
      });
    } catch (error: unknown) {
      showToast(ToastStyle.Failure, (error as ErrorEvent).message);
      return;
    }
  },
};

type Sites = {
  sites: ISite[];
};
