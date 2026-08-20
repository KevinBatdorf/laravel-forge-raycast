import { Server } from "../api/Server";
import { Site } from "../api/Site";
import { IServer, ISite } from "../types";
import { unwrapToken } from "../lib/auth";

export type ServerMatch = { server: IServer; token: string };
export type SiteMatch = { site: ISite; server: IServer; token: string };

type Candidate<T> = { entry: T; label: string; score: number };

const normalize = (value: string) => value.trim().toLowerCase();

const score = (name: string | undefined, query: string) => {
  const target = normalize(name ?? "");
  const search = normalize(query);
  if (!target || !search) return 0;
  if (target === search) return 2;
  return target.includes(search) ? 1 : 0;
};

// Errors instead of a best guess, so the model re-asks rather than hitting the wrong server
const pick = <T>(candidates: Candidate<T>[], query: string, kind: string) => {
  const best = Math.max(0, ...candidates.map((candidate) => candidate.score));
  const labels = candidates.map((candidate) => candidate.label).join(", ");
  if (!best) throw new Error(`No ${kind} matches "${query}". Available ${kind}s: ${labels}`);
  const winners = candidates.filter((candidate) => candidate.score === best);
  if (winners.length > 1) {
    throw new Error(`"${query}" matches several ${kind}s: ${winners.map((w) => w.label).join(", ")}. Ask which one.`);
  }
  return winners[0].entry;
};

export const allServers = async (): Promise<ServerMatch[]> => {
  const servers = await Server.getAll();
  return servers.map((server) => ({ server, token: unwrapToken(server.api_token_key) }));
};

export const findServer = async (query: string) => {
  const servers = await allServers();
  return pick(
    servers.map((entry) => ({
      entry,
      label: entry.server.name ?? String(entry.server.id),
      score: Math.max(score(entry.server.name, query), String(entry.server.id) === normalize(query) ? 2 : 0),
    })),
    query,
    "server",
  );
};

export const allSites = async (): Promise<SiteMatch[]> => {
  const servers = await allServers();
  const tokenKeys = [...new Set(servers.map(({ server }) => server.api_token_key))];
  const perAccount = await Promise.all(
    tokenKeys.map(async (tokenKey) => {
      const token = unwrapToken(tokenKey);
      const sites = await Site.getSitesWithoutServer({ token });
      return sites.flatMap((site) => {
        // Server ids only mean anything within the account they came from
        const owner = servers.find(({ server }) => server.api_token_key === tokenKey && server.id === site.server_id);
        return owner ? [{ site, server: owner.server, token }] : [];
      });
    }),
  );
  return perAccount.flat();
};

export const findSite = async (query: string) => {
  const sites = await allSites();
  return pick(
    sites.map((entry) => ({
      entry,
      label: entry.site.name ?? String(entry.site.id),
      score: Math.max(
        score(entry.site.name, query),
        String(entry.site.id) === normalize(query) ? 2 : 0,
        ...(entry.site.aliases ?? []).map((alias) => score(alias, query)),
      ),
    })),
    query,
    "site",
  );
};

// Logs run to megabytes and the whole result is fed to the model
export const tail = (output: string, limit = 4_000) =>
  output.length > limit ? `…truncated…\n${output.slice(-limit)}` : output;
