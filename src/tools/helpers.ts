import { getPreferenceValues } from "@raycast/api";
import { sortBy } from "lodash";
import { deploymentStatus } from "../api/Site";
import { unwrapToken } from "../lib/auth";
import { cachedOwner, forgetOwner, rememberOwner } from "../lib/org-cache";
import { ForgeResource, flatten, getCollection, probeResource, relatedResource } from "../lib/forge";
import { IDeployment, IServer, ISite } from "../types";

export type ServerMatch = { server: IServer; token: string };
export type SiteMatch = { site: ISite; server: IServer; token: string };

type Account = { tokenKey: string; token: string; sshUser: string };

// One fetch serves a whole answer: a confirmation and its tool, or two tools the model chains
const once = <T>(build: () => Promise<T>) => {
  let pending: Promise<T> | undefined;
  return () => (pending ??= build());
};

export const accounts = (): Account[] => {
  const preferences = getPreferenceValues();
  return [
    { tokenKey: "laravel_forge_api_token", sshUser: String(preferences?.laravel_forge_ssh_user || "forge") },
    { tokenKey: "laravel_forge_api_token_two", sshUser: String(preferences?.laravel_forge_ssh_user_two || "forge") },
  ]
    .map((account) => ({ ...account, token: unwrapToken(account.tokenKey) }))
    .filter((account) => account.token);
};

export const orgSlugs = once(async () => {
  const entries = await Promise.all(
    accounts().map(async ({ tokenKey, token }) => {
      const { items } = await getCollection("orgs", token);
      return [tokenKey, items.map((org) => String(org.attributes?.slug ?? ""))] as const;
    }),
  );
  return new Map(entries);
});

const eachOrg = async <T>(probe: (slug: string, token: string, account: Account) => Promise<T[]>) => {
  const slugs = await orgSlugs();
  const perAccount = await Promise.all(
    accounts().map(async (account) => {
      const perOrg = await Promise.all(
        (slugs.get(account.tokenKey) ?? []).map((slug) => probe(slug, account.token, account)),
      );
      return perOrg.flat();
    }),
  );
  return perAccount.flat();
};

const serverFrom = (item: ForgeResource, slug: string, { token, tokenKey, sshUser }: Account): ServerMatch => ({
  server: { ...flatten<IServer>(item), org_slug: slug, api_token_key: tokenKey, ssh_user: sshUser },
  token,
});

// Forge filters match names, never ids, so an id is fetched from each org directly
const serverById = async (id: string): Promise<ServerMatch[]> => {
  const known = await cachedOwner("server", id);
  if (known) {
    const account = accounts().find(({ tokenKey }) => tokenKey === known.tokenKey);
    const body = account && (await probeResource(`orgs/${known.slug}/servers/${id}`, account.token));
    if (account && body?.data) return [serverFrom(body.data, known.slug, account)];
    await forgetOwner("server", id);
  }
  return eachOrg(async (slug, token, account) => {
    const body = await probeResource(`orgs/${slug}/servers/${id}`, token);
    if (!body?.data) return [];
    await rememberOwner("server", id, { slug, tokenKey: account.tokenKey });
    return [serverFrom(body.data, slug, account)];
  });
};

const serverMatches = async (query: string): Promise<ServerMatch[]> => {
  const slugs = await orgSlugs();
  const perAccount = await Promise.all(
    accounts().map(async ({ tokenKey, token, sshUser }) => {
      const perOrg = await Promise.all(
        (slugs.get(tokenKey) ?? []).map(async (slug) => {
          const path = query
            ? `orgs/${slug}/servers?filter[name]=${encodeURIComponent(query)}`
            : `orgs/${slug}/servers`;
          const { items } = await getCollection(path, token);
          return items.map((server) => ({
            server: { ...flatten<IServer>(server), org_slug: slug, api_token_key: tokenKey, ssh_user: sshUser },
            token,
          }));
        }),
      );
      return perOrg.flat();
    }),
  );
  return sortBy(
    perAccount.flat().filter(({ server }) => !server.revoked),
    ({ server }) => server.name?.toLowerCase(),
  );
};

export const allServers = once(() => serverMatches(""));

const orgByServerId = async (tokenKey: string) => {
  const servers = await allServers();
  return new Map(
    servers.filter(({ server }) => server.api_token_key === tokenKey).map(({ server }) => [server.id, server.org_slug]),
  );
};

const SITE_INCLUDES = "include=server,latestDeployment";

const siteMatch = (item: ForgeResource, included: ForgeResource[], server: IServer, token: string): SiteMatch => {
  const flat = flatten<ISite>(item);
  const deployment = relatedResource(item, "latestDeployment", included);
  return {
    site: {
      ...flat,
      server_id: server.id,
      deployment_status: deploymentStatus(flat.deployment_status),
      latest_deployment: deployment && flatten<IDeployment>(deployment),
    },
    server,
    token,
  };
};

const siteById = (id: string): Promise<SiteMatch[]> =>
  eachOrg(async (slug, token, { tokenKey, sshUser }) => {
    const body = await probeResource(`orgs/${slug}/sites/${id}?${SITE_INCLUDES}`, token);
    if (!body?.data) return [];
    const resource = relatedResource(body.data, "server", body.included ?? []);
    if (!resource) return [];
    const server: IServer = {
      ...flatten<IServer>(resource),
      org_slug: slug,
      api_token_key: tokenKey,
      ssh_user: sshUser,
    };
    return [siteMatch(body.data, body.included ?? [], server, token)];
  });

export const searchSites = async (query: string): Promise<SiteMatch[]> => {
  const slugs = await orgSlugs();
  const perAccount = await Promise.all(
    accounts().map(async ({ tokenKey, token, sshUser }) => {
      const path = query
        ? `sites?${SITE_INCLUDES}&filter[name]=${encodeURIComponent(query)}`
        : `sites?${SITE_INCLUDES}`;
      const { items, included } = await getCollection(path, token);
      const orgs = slugs.get(tokenKey) ?? [];
      // The site list carries its server; only the org slug needs the server walk
      const owners = orgs.length > 1 ? await orgByServerId(tokenKey) : undefined;

      return items.flatMap((item) => {
        const resource = relatedResource(item, "server", included);
        if (!resource) return [];
        const server: IServer = {
          ...flatten<IServer>(resource),
          org_slug: owners ? (owners.get(Number(resource.id)) ?? "") : (orgs[0] ?? ""),
          api_token_key: tokenKey,
          ssh_user: sshUser,
        };
        return [siteMatch(item, included, server, token)];
      });
    }),
  );
  return sortBy(perAccount.flat(), ({ site }) => site.name?.toLowerCase());
};

export const allSites = once(() => searchSites(""));

// Forge only fills a site's own deployment_status while a deploy is running
export const siteDeploymentStatus = (site: ISite) =>
  site.deployment_status ?? deploymentStatus(site.latest_deployment?.status);

export const sitesOnServer = async (server: IServer, token: string) => {
  if (server.org_slug) {
    try {
      const { items } = await getCollection(`orgs/${server.org_slug}/servers/${server.id}/sites`, token);
      return items.map((item) => String(item.attributes?.name ?? item.id));
    } catch {
      // A stale slug or revoked token falls back to the full walk
    }
  }
  const sites = await allSites();
  return sites
    .filter((match) => match.server.id === server.id && match.server.api_token_key === server.api_token_key)
    .map(({ site }) => site.name ?? String(site.id));
};

const normalize = (value: string) => value.trim().toLowerCase();

// Errors instead of a best guess, so the model re-asks rather than hitting the wrong server
const noMatch = (kind: string, query: string, names: string[]) =>
  new Error(`No ${kind} matches "${query}". Available ${kind}s: ${names.join(", ")}`);

const ambiguous = (kind: string, query: string, names: string[]) =>
  new Error(`"${query}" matches several ${kind}s: ${names.join(", ")}. Ask which one.`);

const notExact = (kind: string, query: string, names: string[]) =>
  new Error(
    `No ${kind} is named exactly "${query}". Closest: ${names.join(", ")}. Confirm which one, then pass its id.`,
  );

export const findServer = async (query: string) => {
  const search = normalize(query);
  const narrowed = /^\d+$/.test(search) ? await serverById(search) : await serverMatches(query);
  const servers = narrowed.length ? narrowed : await allServers();
  const label = ({ server }: ServerMatch) => `${server.name ?? server.id} (id ${server.id})`;

  const exact = servers.filter(({ server }) => normalize(server.name ?? "") === search || String(server.id) === search);
  const partial = servers.filter(({ server }) => normalize(server.name ?? "").includes(search));

  if (!exact.length) {
    throw partial.length ? notExact("server", query, partial.map(label)) : noMatch("server", query, servers.map(label));
  }
  if (exact.length > 1) throw ambiguous("server", query, exact.map(label));
  const found = exact[0];
  await rememberOwner("server", found.server.id, {
    slug: found.server.org_slug,
    tokenKey: found.server.api_token_key,
  });
  return found;
};

export const findSite = async (query: string) => {
  const search = normalize(query);
  // filter[name] is a contains match, and it cannot see ids or aliases
  const narrowed = /^\d+$/.test(search) ? await siteById(search) : await searchSites(query);
  const sites = narrowed.length ? narrowed : await allSites();
  // A site name can repeat on another server, so only the id identifies one
  const label = ({ site, server }: SiteMatch) =>
    `${site.name ?? site.id} (id ${site.id} on ${server.name ?? server.id})`;
  const names = ({ site }: SiteMatch) => [site.name ?? "", ...(site.aliases ?? [])].map(normalize);

  const exact = sites.filter((match) => names(match).includes(search) || String(match.site.id) === search);
  const partial = sites.filter((match) => names(match).some((name) => name.includes(search)));

  if (!exact.length) {
    throw partial.length ? notExact("site", query, partial.map(label)) : noMatch("site", query, sites.map(label));
  }
  if (exact.length > 1) throw ambiguous("site", query, exact.map(label));
  const found = exact[0];
  await rememberOwner("site", found.site.id, {
    slug: found.server.org_slug,
    tokenKey: found.server.api_token_key,
  });
  return found;
};

export const targetServer = async ({ server, site }: { server?: string; site?: string }): Promise<ServerMatch> => {
  if (server) return findServer(server);
  if (site) {
    const match = await findSite(site);
    return { server: match.server, token: match.token };
  }
  throw new Error("Name the server, or a site that runs on it.");
};

export const nameList = (names: string[], limit = 8) => {
  if (!names.length) return "none";
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} and ${names.length - limit} more`;
};

// Logs run to megabytes and the whole result is fed to the model
export const tail = (output: string, limit = 4_000) =>
  output.length > limit ? `…truncated…\n${output.slice(-limit)}` : output;
