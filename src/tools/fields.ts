import { forgeSiteUrl } from "../lib/url";
import { IServer, ISite } from "../types";

// probe-api reports Forge's own snake_case, so a name is matched however it is spelled
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export const namesAsked = (input?: string) =>
  (input ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

export const pick = (available: Record<string, unknown>, asked: string[]) => {
  const byKey = new Map(Object.keys(available).map((name) => [key(name), name]));
  const picked: Record<string, unknown> = {};
  const unknown: string[] = [];
  for (const name of asked) {
    const match = byKey.get(key(name));
    if (match) picked[match] = available[match];
    else unknown.push(name);
  }
  return { picked, unknown };
};

export const siteRowExtras = (site: ISite) => ({
  aliases: site.aliases,
  phpVersion: site.php_version,
  appType: site.app_type,
  user: site.user,
  isolated: site.isolated,
  https: site.https,
  wildcards: site.wildcards,
  webDirectory: site.web_directory,
  rootDirectory: site.root_directory,
  sharedPaths: site.shared_paths,
  database: site.database,
  repository: site.repository,
  quickDeploy: site.quick_deploy,
  zeroDowntimeDeployments: site.zero_downtime_deployments,
  deploymentRetention: site.deployment_retention,
  usesEnvoyer: site.uses_envoyer,
  maintenanceMode: site.maintenance_mode,
  healthcheckUrl: site.healthcheck_url,
  createdAt: site.created_at,
  updatedAt: site.updated_at,
});

export const serverRowExtras = (server: IServer) => ({
  slug: server.slug,
  type: server.type,
  provider: server.provider,
  providerId: server.identifier,
  region: server.region,
  size: server.size,
  ipAddress: server.ip_address,
  privateIpAddress: server.private_ip_address,
  sshPort: server.ssh_port,
  timezone: server.timezone,
  ubuntuVersion: server.ubuntu_version,
  phpVersion: server.php_version,
  phpCliVersion: server.php_cli_version,
  databaseType: server.database_type,
  dbStatus: server.db_status,
  redisStatus: server.redis_status,
  opcacheStatus: server.opcache_status,
  revoked: server.revoked,
  createdAt: server.created_at,
  updatedAt: server.updated_at,
});

export const serverIncludable = (server: IServer) => ({
  credentialId: server.credential_id,
  localPublicKey: server.local_public_key,
});

export const siteIncludable = () => ({});

const notice = (available: Record<string, unknown>, picked: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(available)
      .filter((name) => !(name in picked))
      .map((name) => [name, `Not returned. Pass include: ${name} to get it.`]),
  );

export const included = (available: Record<string, unknown>, include?: string) => {
  const { picked, unknown } = pick(available, namesAsked(include));
  return { ...notice(available, picked), ...picked, ...(unknown.length ? { unknownInclude: unknown } : {}) };
};

// Never returned: Forge holds these off the record, or handing one over hands over the site
export const siteLinks = (server: IServer, siteId: number) => {
  const forgeUrl = forgeSiteUrl(server, siteId);
  if (!forgeUrl) return {};
  return {
    environment: `Not returned. Read or edit it at ${forgeUrl}/environment`,
    deploymentScript: `Not returned. Read or edit it at ${forgeUrl}/settings/deployments`,
    deploymentUrl: `Not returned. Find or rotate it at ${forgeUrl}/settings/deployments`,
  };
};
