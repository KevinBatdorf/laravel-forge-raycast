import { serverPage } from "./browse";
import { askedFor, serverRowExtras } from "./fields";

const TRUNCATED = "Rows are short. Call probe-api to see all field names. Then pass the ones you want in fields.";

type Input = {
  /**
   * Part of a server name. Forge matches on contains.
   */
  name?: string;
  /**
   * A provider region to match exactly, like nyc3.
   */
  region?: string;
  /**
   * A provider to match exactly, like ocean2.
   */
  provider?: string;
  /**
   * A default PHP version to match exactly, like php83.
   */
  phpVersion?: string;
  /**
   * A database engine to match exactly, like mysql.
   */
  databaseType?: string;
  /**
   * An Ubuntu release to match exactly, like 24.04.
   */
  ubuntuVersion?: string;
  /**
   * A provider size to match exactly, like s-2vcpu-2gb.
   */
  size?: string;
  /**
   * A public IP address to match exactly.
   */
  ipAddress?: string;
  /**
   * Which order Forge returns them in. A leading minus reverses it.
   */
  sort?:
    | "name"
    | "-name"
    | "provider"
    | "-provider"
    | "ubuntu_version"
    | "-ubuntu_version"
    | "region"
    | "-region"
    | "php_version"
    | "-php_version"
    | "created_at"
    | "-created_at"
    | "updated_at"
    | "-updated_at";
  /**
   * Extra field names to add to every row, comma separated. probe-api a server to see what it holds.
   */
  fields?: string;
  /**
   * The page value from a previous call. It carries that call's filters, sort and limit.
   * Leave empty for the first page.
   */
  page?: string;
  /**
   * How many servers to return. Up to 30. Defaults to 15.
   */
  limit?: number;
  /**
   * Set true to also return servers Forge has been disconnected from. Defaults to false.
   */
  includeRevoked?: boolean;
};

export default async function tool({ fields, page, sort, limit, includeRevoked, ...filters }: Input) {
  const { servers, next, hidden } = await serverPage({
    page,
    sort,
    limit,
    includeRevoked,
    filters: {
      name: filters.name,
      region: filters.region,
      provider: filters.provider,
      php_version: filters.phpVersion,
      database_type: filters.databaseType,
      ubuntu_version: filters.ubuntuVersion,
      size: filters.size,
      ip_address: filters.ipAddress,
    },
  });

  const asked = askedFor("server", fields);
  const rows = servers.map((server) => ({
    id: server.id,
    name: server.name,
    connectionStatus: server.connection_status,
    isReady: server.is_ready,
    ...(includeRevoked ? { revoked: server.revoked } : {}),
    ...asked.from(serverRowExtras(server)),
  }));

  const notes = [`This is one page: ${rows.length} servers. Forge does not say how many there are in total.`];
  if (hidden) notes.push(`${hidden} more are revoked and not shown. Pass includeRevoked to see them.`);
  if (next) notes.push("Pass page to get the next page.");
  if (!asked.requested) notes.push(TRUNCATED);
  notes.push(...asked.notes);

  return { note: notes.join(" "), ...(next ? { page: next } : {}), servers: rows };
}
