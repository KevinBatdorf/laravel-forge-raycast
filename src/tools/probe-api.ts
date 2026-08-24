import { getResource } from "../lib/forge";
import { findServer, findSite } from "./helpers";

type Input = {
  /**
   * Whether to probe a site or a server.
   */
  target: "site" | "server";
  /**
   * The site or server id as a string, for example "2882133", or its exact name.
   */
  id: string;
};

const SITE_FIELDS: Record<string, string> = {
  name: "The site's primary domain.",
  status: "Where the site is in its install, like installed or installing.",
  url: "The address Forge shows for the site.",
  user: "The Linux user the site runs as.",
  https: "Whether Forge has TLS turned on for the site.",
  web_directory: "The directory nginx serves from, like /public.",
  root_directory: "The site's root directory on the server.",
  aliases: "The other domains pointed at this site.",
  php_version: "The PHP version the site runs, like php83.",
  deployment_status: "Filled in only while a deploy is running, otherwise empty.",
  quick_deploy: "Whether Forge deploys by itself on every push.",
  isolated: "Whether the site runs under its own Linux user.",
  shared_paths: "The directories carried across zero-downtime releases.",
  repository: "The git repository, branch and provider the site deploys from.",
  database: "The name of the database Forge made for the site.",
  maintenance_mode: "Whether the site is in maintenance mode.",
  zero_downtime_deployments: "Whether deploys swap in an atomic release.",
  deployment_retention: "How many old releases Forge keeps on disk.",
  deployment_script: "The commands Forge runs on each deploy.",
  wildcards: "Whether a wildcard subdomain points at the site.",
  app_type: "The kind of app, like laravel or Custom.",
  uses_envoyer: "Whether Envoyer handles deploys instead of Forge.",
  deployment_url: "A URL that triggers a deploy with no sign-in.",
  healthcheck_url: "The URL Forge pings to check the site is healthy.",
  created_at: "When the site was created.",
  updated_at: "When the site last changed.",
  environment: "The site's env file, which Forge keeps on its own endpoint rather than on the site record.",
};

const SERVER_FIELDS: Record<string, string> = {
  id: "The server's Forge id.",
  name: "The server's name in Forge.",
  slug: "The server's slug, used in its Forge URL.",
  type: "What the server is set up as, like app or worker.",
  provider: "The hosting provider, like ocean2 or a custom VPS.",
  identifier: "The provider's own id for the machine.",
  credential_id: "The stored provider key Forge built the server with. Empty on a custom VPS.",
  size: "The provider's plan or instance size.",
  region: "The provider region the server runs in.",
  ubuntu_version: "The Ubuntu release on the server.",
  ssh_port: "The port SSH listens on.",
  php_version: "The PHP version new sites get by default.",
  php_cli_version: "The PHP version the command line uses.",
  opcache_status: "Whether PHP's opcache is on.",
  database_type: "The database engine installed, like mysql8 or postgres16.",
  db_status: "Whether the database is installed and running.",
  redis_status: "Whether Redis is installed and running.",
  ip_address: "The server's public IP address.",
  private_ip_address: "The server's private network address.",
  connection_status: "Whether Forge can reach the server over SSH.",
  is_ready: "Whether provisioning has finished.",
  revoked: "Whether Forge has been disconnected from the server.",
  timezone: "The server's timezone.",
  local_public_key: "The server's own SSH public key, the one a git host takes as a deploy key.",
  created_at: "When the server was created.",
  updated_at: "When the server last changed.",
};

const IN_FORGE_ONLY = new Set(["environment", "deployment_script", "deployment_url"]);

const ON_REQUEST = new Set(["credential_id", "local_public_key"]);

// Catches a credential Forge adds later that the field list does not name yet
const SECRET = /token|secret|password|private_key/i;

const TARGETS = {
  async site(id: string) {
    const { site, server, token } = await findSite(id);
    return {
      path: `orgs/${server.org_slug}/sites/${site.id}`,
      token,
      known: SITE_FIELDS,
      extra: ["environment"],
      asks: "Name any of these in list-sites fields, or get-site include.",
    };
  },
  async server(id: string) {
    const { server, token } = await findServer(id);
    return {
      path: `orgs/${server.org_slug}/servers/${server.id}`,
      token,
      known: SERVER_FIELDS,
      extra: [],
      asks: "Name any of these in list-servers fields, or get-server include.",
    };
  },
};

const describe = (name: string, known: Record<string, string>) => {
  const description = known[name] ?? "Unknown: no description for this one.";
  if (IN_FORGE_ONLY.has(name)) return `${description} Not handed over; the get tool returns a Forge link for it.`;
  if (ON_REQUEST.has(name) || (!known[name] && SECRET.test(name))) return `${description} Only by name on include.`;
  return description;
};

export default async function tool({ target, id }: Input) {
  const { path, token, known, extra, asks } = await TARGETS[target](id);
  const resource = await getResource(path, token);
  if (!resource) throw new Error(`Forge returned no ${target} at ${path}.`);

  const attributes = (resource.attributes ?? {}) as Record<string, unknown>;
  const names = [...Object.keys(attributes), ...extra];

  return {
    target,
    id: Number(resource.id),
    name: attributes.name,
    fields: Object.fromEntries(names.map((name) => [name, describe(name, known)])),
    note: `${asks} Spelling of the name does not matter. These are names, not values.`,
  };
}
