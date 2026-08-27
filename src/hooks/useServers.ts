import { Cache } from "@raycast/api";
import useSWR from "swr";
import { Server } from "../api/Server";
import { IServer } from "../types";
import { USE_FAKE_DATA } from "../config";
import { MockServer } from "../api/Mock";

const cache = new Cache();
const KEY = "servers-list";

// Forge exposes no count, ETag or timestamp to poll, so staleness is the user's call
export const loadServers = async () => {
  const stored = cache.get(KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as IServer[];
    } catch {
      cache.remove(KEY);
    }
  }
  const servers = await Server.getAll();
  cache.set(KEY, JSON.stringify(servers));
  return servers;
};

export const forgetServers = () => cache.remove(KEY);

export const useServers = () => {
  const { data, error, mutate } = useSWR<IServer[]>("servers-list", USE_FAKE_DATA ? MockServer.getAll : loadServers);
  return {
    servers: data,
    loading: !error && !data,
    error: error,
    refresh: async () => {
      forgetServers();
      await mutate();
    },
  };
};
