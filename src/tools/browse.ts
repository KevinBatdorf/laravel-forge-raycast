import { deploymentStatus } from "../api/Site";
import { flatten, getCollection, relatedResource } from "../lib/forge";
import { IDeployment, IServer, ISite } from "../types";
import { accounts, orgSlugs } from "./helpers";

const PER_PAGE = 15;

// Forge honours a smaller page[size] but caps it at 30
const perPage = (limit?: number) => Math.min(30, Math.max(1, Math.trunc(limit ?? PER_PAGE)));

type Stream = { token: string; tokenKey: string; sshUser: string; slug: string };

// A Forge cursor belongs to one stream, and an account with several orgs has several
type Position = { stream: number; cursor: string };

const encode = (position: Position) => Buffer.from(JSON.stringify(position)).toString("base64url");

const decode = (page?: string): Position => {
  if (!page) return { stream: 0, cursor: "" };
  try {
    const { stream, cursor } = JSON.parse(Buffer.from(page, "base64url").toString());
    return { stream: Number(stream) || 0, cursor: String(cursor ?? "") };
  } catch {
    throw new Error("That page value did not come from this tool. Leave it empty to start over.");
  }
};

const siteStreams = async (): Promise<Stream[]> =>
  accounts().map(({ token, tokenKey, sshUser }) => ({ token, tokenKey, sshUser, slug: "" }));

const serverStreams = async (): Promise<Stream[]> => {
  const slugs = await orgSlugs();
  return accounts().flatMap(({ token, tokenKey, sshUser }) =>
    (slugs.get(tokenKey) ?? []).map((slug) => ({ token, tokenKey, sshUser, slug })),
  );
};

// One Forge page, and where the next one starts
const onePage = async (streams: Stream[], page: string | undefined, path: (stream: Stream) => string) => {
  const { stream, cursor } = decode(page);
  if (stream >= streams.length) return { stream: streams.at(-1), items: [], included: [], next: undefined };

  const at = streams[stream];
  const fetched = await getCollection(path(at), at.token, { pages: 1, from: cursor });
  const next = fetched.nextCursor
    ? encode({ stream, cursor: fetched.nextCursor })
    : stream + 1 < streams.length
      ? encode({ stream: stream + 1, cursor: "" })
      : undefined;

  return { stream: at, items: fetched.items, included: fetched.included, next };
};

const query = (filters: Record<string, string | undefined>, extra: string[] = [], limit?: number) => {
  const parts = [...extra, `page[size]=${perPage(limit)}`];
  for (const [name, value] of Object.entries(filters)) {
    if (value?.trim()) parts.push(`filter[${name}]=${encodeURIComponent(value.trim())}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
};

export const sitePage = async (options: { name?: string; page?: string; serverPath?: string; limit?: number }) => {
  const streams = await siteStreams();
  const search = query({ name: options.name }, ["include=server,latestDeployment"], options.limit);
  const { stream, items, included, next } = await onePage(streams, options.page, () =>
    options.serverPath ? `${options.serverPath}/sites${search}` : `sites${search}`,
  );

  const sites = items.flatMap((item) => {
    const owner = relatedResource(item, "server", included);
    if (!owner) return [];
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
          ...flatten<IServer>(owner),
          api_token_key: stream?.tokenKey,
          ssh_user: stream?.sshUser,
        } as IServer,
      },
    ];
  });

  return { sites, next };
};

export const serverPage = async (options: {
  filters: Record<string, string | undefined>;
  sort?: string;
  page?: string;
  limit?: number;
}) => {
  const streams = await serverStreams();
  const search = query(
    options.filters,
    options.sort?.trim() ? [`sort=${encodeURIComponent(options.sort.trim())}`] : [],
    options.limit,
  );
  const { stream, items, next } = await onePage(streams, options.page, ({ slug }) => `orgs/${slug}/servers${search}`);

  const servers = items
    .map(
      (item) =>
        ({
          ...flatten<IServer>(item),
          org_slug: stream?.slug,
          api_token_key: stream?.tokenKey,
          ssh_user: stream?.sshUser,
        }) as IServer,
    )
    .filter((server) => !server.revoked);

  return { servers, next };
};
