import { allServers } from "./helpers";

const TRUNCATED = "Each row is a summary, not the whole record. For any other field, probe-api the server.";

export default async function tool() {
  const servers = await allServers();
  const listed = servers.map(({ server }) => ({
    id: server.id,
    name: server.name,
    provider: server.provider,
    region: server.region,
    ipAddress: server.ip_address,
    phpVersion: server.php_version,
    databaseType: server.database_type,
    connectionStatus: server.connection_status,
    isReady: server.is_ready,
  }));
  return { note: TRUNCATED, servers: listed };
}
