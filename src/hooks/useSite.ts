import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import { IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";
import { LocalStorage } from "@raycast/api";

type key = [IServer["id"], ISite["id"], IServer["api_token_key"]];

const fetcher = async ([serverId, siteId, tokenKey]: key) => {
  const cacheKey = `site-${serverId}-${siteId}`;
  Site.get({
    serverId,
    siteId,
    token: unwrapToken(tokenKey),
  })
    .then((data) => LocalStorage.setItem(cacheKey, JSON.stringify(data)))
    .catch(() => LocalStorage.removeItem(cacheKey));

  return await backupData(cacheKey);
};

export const useSite = (server?: IServer, site?: ISite, optons: Partial<SWRConfiguration> = {}) => {
  const key = server?.id && site?.id ? [server.id, site?.id, server.api_token_key] : null;
  const { data, error } = useSWR<ISite>(key, fetcher, optons);

  return {
    site: data,
    loading: !error && !data,
    error: error,
  };
};

const backupData = async (cacheKey: string) => {
  const data = await LocalStorage.getItem(cacheKey);
  if (typeof data === "string") return JSON.parse(data);
  return data;
};
