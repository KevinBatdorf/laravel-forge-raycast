import { Site } from "../api/Site";
import { IDeployment, IServer, ISite } from "../types";
import { Located, locate, locateSite, serverPath } from "./coordinates";
import { flatten, getResource } from "./forge";
import { forget } from "./index-cache";

// apiFetch puts the status at the front of the message
const isMissing = (error: unknown) => /^404\b/.test(error instanceof Error ? error.message : "");

// Coordinates only ever come from Forge, so a 404 means deleted, not misrouted
const dropOnMiss = async <T>(kind: "site" | "server", id: number | string, read: () => Promise<T>) => {
  try {
    return await read();
  } catch (error) {
    if (!isMissing(error)) throw error;
    await forget(kind, id);
    throw new Error(`Forge no longer has ${kind} ${id}. Call list-${kind}s now for the current ids.`);
  }
};

export type ServerRecord = Located & { server: IServer };

export const serverRecord = async (serverId: number): Promise<ServerRecord> => {
  const at = await locate("server", serverId);
  const resource = await dropOnMiss("server", serverId, () => getResource(serverPath(at, serverId), at.account.token));
  if (!resource) throw new Error(`Forge returned nothing for server ${serverId}.`);
  return {
    ...at,
    server: {
      ...flatten<IServer>(resource),
      org_slug: at.org,
      api_token_key: at.account.tokenKey,
      ssh_user: at.account.sshUser,
    },
  };
};

export type SiteRecord = Located & { serverId: number; site: ISite };

// Forge has no include on the single-site route, so the latest deploy is its own read
export const siteRecord = async (siteId: number, { withDeployment = false } = {}): Promise<SiteRecord> => {
  const at = await locateSite(siteId);
  const resource = await dropOnMiss("site", siteId, () =>
    getResource(`orgs/${at.org}/sites/${siteId}`, at.account.token),
  );
  if (!resource) throw new Error(`Forge returned nothing for site ${siteId}.`);
  const site = { ...flatten<ISite>(resource), server_id: at.serverId };

  if (!withDeployment) return { ...at, site };

  const [latest] = await Site.getDeploymentHistory({
    orgSlug: at.org,
    serverId: at.serverId,
    siteId,
    token: at.account.token,
  }).catch(() => [] as IDeployment[]);

  return { ...at, site: { ...site, latest_deployment: latest } };
};
