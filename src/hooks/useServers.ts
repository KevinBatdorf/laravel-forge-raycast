import { Cache } from "@raycast/api";
import useSWR from "swr";
import { Server, fleetStamp } from "../api/Server";
import { IServer } from "../types";
import { USE_FAKE_DATA } from "../config";
import { MockServer } from "../api/Mock";

const cache = new Cache();
const KEY = "servers-list";

type Stored = { stamp: string; servers: IServer[] };

const stored = (): Stored | undefined => {
  try {
    const raw = cache.get(KEY);
    return raw ? (JSON.parse(raw) as Stored) : undefined;
  } catch {
    return undefined;
  }
};

export const loadServers = async () => {
  const held = stored();
  const stamp = await fleetStamp().catch(() => "");
  if (held && stamp && held.stamp === stamp) return held.servers;

  const servers = await Server.getAll();
  cache.set(KEY, JSON.stringify({ stamp, servers }));
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
