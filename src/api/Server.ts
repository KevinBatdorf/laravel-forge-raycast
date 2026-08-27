import { sortBy } from "lodash";
import { IEvent, IServer, ISite } from "../types";
import { accounts } from "../lib/accounts";
import { ForgeResource, flatten, getCollection, getResource, postAction } from "../lib/forge";
import { everyOrg } from "../lib/orgs";
import { Site } from "./Site";

export type ServiceAction = "reboot" | "reload" | "stop";
export type Service = "php" | "nginx" | "database" | "redis";

// Forge has no start: a stopped service comes back with reboot, and anything else 422s
export const SERVICE_ACTIONS: Record<Service, ServiceAction[]> = {
  php: ["reboot", "reload"],
  nginx: ["reboot", "stop"],
  database: ["reboot", "stop"],
  redis: ["reboot"],
};

// Forge's mysql and postgres endpoints both act on whichever engine the server runs
export const databaseService = (server: IServer) => {
  if (!server.database_type) throw new Error(`${server.name ?? server.id} has no database installed.`);
  return server.database_type.startsWith("postgres") ? "postgres" : "mysql";
};

type RunAction = {
  server: IServer;
  token: string;
  action?: ServiceAction;
  service?: Service;
};

type ServerWithToken = { server: IServer; token: string };

export type Tail = Record<string, { cursor: string; hash: string }>;

const pageHash = (items: ForgeResource[], nextCursor?: string | null) =>
  `${items.map((item) => item.id).join(",")}|${nextCursor ? "more" : "end"}`;

export const Server = {
  async getAll() {
    const { servers } = await Server.walk();
    return servers;
  },

  // Ids ascend, so anything new lands on the final page and nowhere else
  async walk(): Promise<{ servers: IServer[]; tail: Tail }> {
    const perOrg = await Promise.all(
      (await everyOrg()).map(async ({ account, org }) => {
        const rows: ForgeResource[] = [];
        let from = "";
        let opensLastPage = "";
        let hash = "";
        for (let page = 0; page < 20; page++) {
          const { items, nextCursor } = await getCollection(`orgs/${org}/servers`, account.token, { pages: 1, from });
          rows.push(...items);
          opensLastPage = from;
          hash = pageHash(items, nextCursor);
          if (!nextCursor) break;
          from = String(nextCursor);
        }
        return {
          key: `${account.tokenKey}/${org}`,
          cursor: opensLastPage,
          hash,
          servers: rows.map((server) => ({
            ...flatten<IServer>(server),
            org_slug: org,
            api_token_key: account.tokenKey,
            ssh_user: account.sshUser,
          })),
        };
      }),
    );

    return {
      servers: sortBy(
        perOrg.flatMap((entry) => entry.servers).filter((server) => !server.revoked),
        (server) => server?.name?.toLowerCase(),
      ),
      tail: Object.fromEntries(perOrg.map(({ key, cursor, hash }) => [key, { cursor, hash }])),
    };
  },

  async tailChanged(tail: Tail) {
    const refs = await everyOrg();
    if (refs.length !== Object.keys(tail).length) return true;
    const checks = await Promise.all(
      refs.map(async ({ account, org }) => {
        const held = tail[`${account.tokenKey}/${org}`];
        if (!held) return true;
        const { items, nextCursor } = await getCollection(`orgs/${org}/servers`, account.token, {
          pages: 1,
          from: held.cursor,
        });
        return pageHash(items, nextCursor) !== held.hash;
      }),
    );
    return checks.some(Boolean);
  },

  async runAction({ server, token, action = "reboot", service }: RunAction) {
    const slug = service === "database" ? databaseService(server) : service;
    const endpoint = slug
      ? `orgs/${server.org_slug}/servers/${server.id}/services/${slug}/actions`
      : `orgs/${server.org_slug}/servers/${server.id}/actions`;
    // PHP runs one pool per installed version, so the action has to name one
    const payload = service === "php" ? { action, version: server.php_version } : { action };
    await postAction(endpoint, token, payload);
  },

  async getEvents({ server, token }: ServerWithToken) {
    const endpoint = `orgs/${server.org_slug}/servers/${server.id}/events?sort=-created_at`;
    const { items } = await getCollection(endpoint, token, { pages: 1 });
    return items.map((event) => flatten<IEvent>(event));
  },

  async getEventOutput({ server, token, eventId }: ServerWithToken & { eventId: IEvent["id"] }) {
    const endpoint = `orgs/${server.org_slug}/servers/${server.id}/events/${eventId}/output`;
    const event = await getResource(endpoint, token);
    return String(event?.attributes?.output ?? "");
  },
};

// Two requests and most of the load time, and only the search bar uses it
export const serverKeywords = async (): Promise<Record<number, string[]>> => {
  const perAccount = await Promise.all(
    accounts().map(({ token }) => Site.getSitesWithoutServer({ token }).catch(() => [] as ISite[])),
  );
  const byServer = getSiteKeywords(perAccount.flat());
  return Object.fromEntries(Object.entries(byServer).map(([id, names]) => [Number(id), [...names]]));
};

const getSiteKeywords = (sites: ISite[]) => {
  return sites?.reduce(
    (acc, site): Record<number, Set<string>> => {
      if (!site?.server_id) return acc;
      const keywords = [site?.name ?? "", ...(site?.aliases ?? [])];
      if (!acc[site.server_id]) {
        acc[site.server_id] = new Set<string>();
      }
      keywords.forEach((keyword) => site?.server_id && acc[site.server_id].add(keyword));
      return acc;
    },
    <Record<number, Set<string>>>{},
  );
};
