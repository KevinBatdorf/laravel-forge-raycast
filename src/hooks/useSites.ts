import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import { IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";
import { LocalStorage } from "@raycast/api";

type key = [IServer["id"], IServer["api_token_key"]];

const fetcher = async ([serverId, tokenKey]: key) => {
  const cacheKey = `sites-${serverId}`;
  Site.getAll({
    serverId,
    token: unwrapToken(tokenKey),
  }).then((data) => {
    LocalStorage.setItem(cacheKey, JSON.stringify(data));
  });
  return await backupData(cacheKey);
};

export const useSites = (server?: IServer, optons: Partial<SWRConfiguration> = {}) => {
  const cacheKey = `sites-${server?.id}`;
  const { data, error } = useSWR<ISite[]>(server?.id ? [server.id, server.api_token_key] : null, fetcher, optons);

  if (error) LocalStorage.removeItem(cacheKey);

  return {
    sites: data,
    loading: !error && !data,
    error: error,
  };
};

const backupData = async (cacheKey: string) => {
  const data = await LocalStorage.getItem(cacheKey);
  if (typeof data === "string") return JSON.parse(data);
  return data;
};
