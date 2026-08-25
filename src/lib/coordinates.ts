import { Account, accountFor } from "./accounts";
import { Coordinates, forget, lookup } from "./index-cache";

export type Located = { account: Account; org: string; serverId?: number };

const listFirst = (kind: "site" | "server", id: number | string) =>
  new Error(
    `This extension has no coordinates for ${kind} ${id}. Call list-${kind}s now, then retry with an id it returns.`,
  );

// Ids only come from a list or get tool, so a miss is stale, not a cue to search
export const locate = async (kind: "site" | "server", id: number | string): Promise<Located> => {
  const where = await lookup(kind, id);
  if (!where) throw listFirst(kind, id);
  const account = accountFor(where.tokenKey);
  if (!account) {
    await forget(kind, id);
    throw listFirst(kind, id);
  }
  return { account, org: where.org, serverId: where.serverId };
};

// A site needs its server in the path too, and Forge has no route without one
export const locateSite = async (id: number | string) => {
  const found = await locate("site", id);
  if (!found.serverId) {
    await forget("site", id);
    throw listFirst("site", id);
  }
  return { ...found, serverId: found.serverId };
};

export const sitePath = (at: { org: string; serverId: number }, siteId: number | string, tail = "") =>
  `orgs/${at.org}/servers/${at.serverId}/sites/${siteId}${tail}`;

export const serverPath = (at: { org: string }, serverId: number | string, tail = "") =>
  `orgs/${at.org}/servers/${serverId}${tail}`;

export const asCoordinates = (tokenKey: string, org: string, serverId?: number): Coordinates => ({
  tokenKey,
  org,
  serverId,
});
