import { deploymentStatus } from "../api/Site";
import { flatten, getCollection, relatedResource } from "../lib/forge";
import { IDeployment, IServer, ISite } from "../types";
import { ServerMatch, accounts, orgSlugs } from "./helpers";

const PER_PAGE = 15;

// Forge honours a smaller page[size] but caps it at 30
const perPage = (limit?: number) => Math.min(30, Math.max(1, Math.trunc(limit ?? PER_PAGE)));

type Stream = { token: string; tokenKey: string; sshUser: string; slug: string };

// A cursor only works with the exact query and account that produced it
type Position = {
  mode: "sites" | "servers" | "server-sites";
  tokenKey: string;
  slug: string;
  serverId: string;
  cursor: string;
  search: string;
};

const pathFor = ({ mode, slug, serverId, search }: Position) => {
  if (mode === "servers") return `orgs/${slug}/servers${search}`;
  if (mode === "server-sites") return `orgs/${slug}/servers/${serverId}/sites${search}`;
  return `sites${search}`;
};

const encode = (position: Position) => Buffer.from(JSON.stringify(position)).toString("base64url");

const BAD_PAGE = "That page value did not come from this tool. Leave it empty to start over.";

const decode = (page: string): Position => {
  try {
    const { mode, tokenKey, slug, serverId, cursor, search } = JSON.parse(Buffer.from(page, "base64url").toString());
    if (!["sites", "servers", "server-sites"].includes(mode)) throw new Error(BAD_PAGE);
    return {
      mode,
      tokenKey: String(tokenKey ?? ""),
      slug: String(slug ?? ""),
      serverId: String(serverId ?? ""),
      cursor: String(cursor ?? ""),
      search: String(search ?? ""),
    };
  } catch {
    throw new Error(BAD_PAGE);
  }
};

// A token continues the call that minted it; other arguments only shape a first page
const onePage = async (
  streams: Stream[],
  page: string | undefined,
  start: Omit<Position, "tokenKey" | "slug" | "cursor">,
) => {
  const position: Position = page
    ? decode(page)
    : { ...start, tokenKey: streams[0]?.tokenKey ?? "", slug: streams[0]?.slug ?? "", cursor: "" };

  const found = streams.find((stream) => stream.tokenKey === position.tokenKey && stream.slug === position.slug);
  // A server-sites token continues without the server argument: it names its own stream
  const account = accounts().find(({ tokenKey }) => tokenKey === position.tokenKey);
  const at =
    found ??
    (page && position.mode === "server-sites" && account
      ? { token: account.token, tokenKey: account.tokenKey, sshUser: account.sshUser, slug: position.slug }
      : undefined);
  if (!at) {
    if (page) throw new Error(BAD_PAGE);
    return { stream: undefined, items: [], included: [], next: undefined };
  }

  const fetched = await getCollection(pathFor(position), at.token, { pages: 1, from: position.cursor });
  const following = found ? streams[streams.indexOf(found) + 1] : undefined;
  const next = fetched.nextCursor
    ? encode({ ...position, cursor: fetched.nextCursor })
    : following
      ? encode({ ...position, tokenKey: following.tokenKey, slug: following.slug, cursor: "" })
      : undefined;

  return { stream: at, items: fetched.items, included: fetched.included, next };
};

const query = (filters: Record<string, string | undefined>, extra: string[] = [], limit?: number) => {
  const parts = [...extra, `page[size]=${perPage(limit)}`];
  for (const [name, value] of Object.entries(filters)) {
    if (value?.trim()) parts.push(`filter[${name}]=${encodeURIComponent(value.trim())}`);
  }
  return `?${parts.join("&")}`;
};

export const sitePage = async (options: {
  name?: string;
  page?: string;
  owner?: ServerMatch;
  limit?: number;
  includeRevoked?: boolean;
}) => {
  const { owner } = options;
  const streams: Stream[] = owner
    ? [
        {
          token: owner.token,
          tokenKey: owner.server.api_token_key,
          sshUser: owner.server.ssh_user,
          slug: owner.server.org_slug,
        },
      ]
    : accounts().map(({ token, tokenKey, sshUser }) => ({ token, tokenKey, sshUser, slug: "" }));

  const { stream, items, included, next } = await onePage(streams, options.page, {
    mode: owner ? "server-sites" : "sites",
    serverId: owner ? String(owner.server.id) : "",
    search: query({ name: options.name }, ["include=server,latestDeployment"], options.limit),
  });

  const all = items.flatMap((item) => {
    const resource = relatedResource(item, "server", included);
    if (!resource) return [];
    const flat = flatten<ISite>(item);
    const deployment = relatedResource(item, "latestDeployment", included);
    return [
      {
        site: {
          ...flat,
          deployment_status: deploymentStatus(flat.deployment_status),
          latest_deployment: deployment && flatten<IDeployment>(deployment),
        } as ISite,
        server: {
          ...flatten<IServer>(resource),
          api_token_key: stream?.tokenKey,
          ssh_user: stream?.sshUser,
        } as IServer,
      },
    ];
  });

  const sites = all.filter(({ server }) => options.includeRevoked || !server.revoked);

  return { sites, next, hidden: all.length - sites.length };
};

export const serverPage = async (options: {
  filters: Record<string, string | undefined>;
  sort?: string;
  page?: string;
  limit?: number;
  includeRevoked?: boolean;
}) => {
  const slugs = await orgSlugs();
  const streams: Stream[] = accounts().flatMap(({ token, tokenKey, sshUser }) =>
    (slugs.get(tokenKey) ?? []).map((slug) => ({ token, tokenKey, sshUser, slug })),
  );

  const { stream, items, next } = await onePage(streams, options.page, {
    mode: "servers",
    serverId: "",
    search: query(
      options.filters,
      options.sort?.trim() ? [`sort=${encodeURIComponent(options.sort.trim())}`] : [],
      options.limit,
    ),
  });

  const all = items.map(
    (item) =>
      ({
        ...flatten<IServer>(item),
        org_slug: stream?.slug,
        api_token_key: stream?.tokenKey,
        ssh_user: stream?.sshUser,
      }) as IServer,
  );

  const servers = all.filter((server) => options.includeRevoked || !server.revoked);

  return { servers, next, hidden: all.length - servers.length };
};
