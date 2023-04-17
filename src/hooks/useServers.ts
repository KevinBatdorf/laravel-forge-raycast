import useSWR from "swr";
import { Server } from "../api/Server";
import { IServer } from "../types";

export const useServers = () => {
  const { data, error } = useSWR<IServer[]>("servers-list", Server.getAll);
  return {
    servers: data,
    loading: !error && !data,
    error: error,
  };
};
