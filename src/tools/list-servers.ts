import { serverPage } from "./browse";
import { namesAsked, pick, serverRowExtras } from "./fields";

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
   * The page value from a previous call, to read the next page. Leave empty for the first.
   */
  page?: string;
};

export default async function tool({ fields, page, sort, ...filters }: Input) {
  const { servers, next } = await serverPage({
    page,
    sort,
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

  const asked = namesAsked(fields);
  const unknown = new Set<string>();
  const rows = servers.map((server) => {
    const extra = pick(serverRowExtras(server), asked);
    extra.unknown.forEach((name) => unknown.add(name));
    return {
      id: server.id,
      name: server.name,
      connectionStatus: server.connection_status,
      isReady: server.is_ready,
      ...extra.picked,
    };
  });

  const notes = [`This is one page: ${rows.length} servers. Forge does not say how many there are in total.`];
  if (next) notes.push("Pass page to get the next page.");
  if (!asked.length) notes.push(TRUNCATED);
  if (unknown.size)
    notes.push(`There is no server field called ${[...unknown].join(", ")}. Call probe-api for the real names.`);

  return { note: notes.join(" "), ...(next ? { page: next } : {}), servers: rows };
}
