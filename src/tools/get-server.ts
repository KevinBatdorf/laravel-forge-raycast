import { queryString, walkOrgs } from "../lib/listing";
import { serverRecord } from "../lib/records";
import { forgeLink, forgeServerUrl } from "../lib/url";
import { included, serverIncludable } from "./fields";

type Input = {
  /**
   * A server id from list-servers, for example 678350.
   */
  serverId: number;
  /**
   * Extra field names to add to the answer, comma separated. Call probe-api for the names.
   */
  include?: string;
};

export default async function tool({ serverId, include }: Input) {
  const { server: found, account, org } = await serverRecord(serverId);

  const { rows } = await walkOrgs(() => `orgs/${org}/servers/${serverId}/sites`, queryString({}, [], 30), undefined, [
    { account, org },
  ]);
  const sites = rows.map(({ item }) => ({ id: Number(item.id), name: String(item.attributes?.name ?? item.id) }));

  return {
    id: found.id,
    name: found.name,
    slug: found.slug,
    type: found.type,
    provider: found.provider,
    providerId: found.identifier,
    region: found.region,
    size: found.size,
    ipAddress: found.ip_address,
    privateIpAddress: found.private_ip_address,
    sshPort: found.ssh_port,
    timezone: found.timezone,
    ubuntuVersion: found.ubuntu_version,
    phpVersion: found.php_version,
    phpCliVersion: found.php_cli_version,
    databaseType: found.database_type,
    dbStatus: found.db_status,
    redisStatus: found.redis_status,
    opcacheStatus: found.opcache_status,
    connectionStatus: found.connection_status,
    isReady: found.is_ready,
    revoked: found.revoked,
    createdAt: found.created_at,
    updatedAt: found.updated_at,
    forgeUrl: forgeLink(forgeServerUrl(found), `${found.name} on Forge`),
    ...included(serverIncludable(found), include),
    note: `${sites.length} site${sites.length === 1 ? "" : "s"} on this server. Pass a site id to any site tool.`,
    sites,
  };
}
