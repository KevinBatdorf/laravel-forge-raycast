import { getPreferenceValues } from "@raycast/api";
import { getResource } from "../lib/forge";
import { forgeServerUrl, forgeSiteUrl } from "../lib/url";
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
  /**
   * Field names to read the values of, comma separated, taken from an earlier probe of the
   * same target. Leave empty to list which fields Forge holds and what each one is.
   */
  fields?: string;
};

type Field = {
  description: string;
  // Withheld unless the user turns on AI access in preferences
  protect?: string;
  // Not a Forge field, so it never carries a value
  elsewhere?: boolean;
};

const SITE_FIELDS: Record<string, Field> = {
  name: { description: "The site's primary domain." },
  status: { description: "Where the site is in its install, like installed or installing." },
  url: { description: "The address Forge shows for the site." },
  user: { description: "The Linux user the site runs as." },
  https: { description: "Whether Forge has TLS turned on for the site." },
  web_directory: { description: "The directory nginx serves from, like /public." },
  root_directory: { description: "The site's root directory on the server." },
  aliases: { description: "The other domains pointed at this site." },
  php_version: { description: "The PHP version the site runs, like php83." },
  deployment_status: { description: "Filled in only while a deploy is running, otherwise empty." },
  quick_deploy: { description: "Whether Forge deploys by itself on every push." },
  isolated: { description: "Whether the site runs under its own Linux user." },
  shared_paths: { description: "The directories carried across zero-downtime releases." },
  repository: { description: "The git repository, branch and provider the site deploys from." },
  database: { description: "The name of the database Forge made for the site." },
  maintenance_mode: { description: "Whether the site is in maintenance mode." },
  zero_downtime_deployments: { description: "Whether deploys swap in an atomic release." },
  deployment_retention: { description: "How many old releases Forge keeps on disk." },
  wildcards: { description: "Whether a wildcard subdomain points at the site." },
  app_type: { description: "The kind of app, like laravel or Custom." },
  uses_envoyer: { description: "Whether Envoyer handles deploys instead of Forge." },
  healthcheck_url: { description: "The URL Forge pings to check the site is healthy." },
  created_at: { description: "When the site was created." },
  updated_at: { description: "When the site last changed." },
  deployment_script: {
    description: "The commands Forge runs on each deploy.",
    protect:
      "Contents not returned. Give the user links.deploymentSettings as a markdown link to view or edit it in Forge.",
  },
  deployment_url: {
    description: "A URL that triggers a deploy with no sign-in.",
    protect: "Not returned: anyone holding this URL can deploy the site.",
  },
  environment: {
    description: "The site's env file, which Forge keeps on its own endpoint rather than on the site record.",
    elsewhere: true,
    protect: "Contents not returned. Give the user links.environment as a markdown link to view or edit it in Forge.",
  },
};

const SERVER_FIELDS: Record<string, Field> = {
  id: { description: "The server's Forge id." },
  name: { description: "The server's name in Forge." },
  slug: { description: "The server's slug, used in its Forge URL." },
  type: { description: "What the server is set up as, like app or worker." },
  provider: { description: "The hosting provider, like ocean2 or a custom VPS." },
  identifier: { description: "The provider's own id for the machine." },
  credential_id: { description: "The provider credential Forge built the server with, if any." },
  size: { description: "The provider's plan or instance size." },
  region: { description: "The provider region the server runs in." },
  ubuntu_version: { description: "The Ubuntu release on the server." },
  ssh_port: { description: "The port SSH listens on." },
  php_version: { description: "The PHP version new sites get by default." },
  php_cli_version: { description: "The PHP version the command line uses." },
  opcache_status: { description: "Whether PHP's opcache is on." },
  database_type: { description: "The database engine installed, like mysql8 or postgres16." },
  db_status: { description: "Whether the database is installed and running." },
  redis_status: { description: "Whether Redis is installed and running." },
  ip_address: { description: "The server's public IP address." },
  private_ip_address: { description: "The server's private network address." },
  connection_status: { description: "Whether Forge can reach the server over SSH." },
  is_ready: { description: "Whether provisioning has finished." },
  revoked: { description: "Whether Forge has been disconnected from the server." },
  timezone: { description: "The server's timezone." },
  local_public_key: {
    description:
      "The server's own SSH public key, the one a git host takes as a deploy key. Several hundred characters.",
  },
  created_at: { description: "When the server was created." },
  updated_at: { description: "When the server last changed." },
};

// Catches a credential Forge adds later that the field list does not name yet
const SECRET = /token|secret|password|private_key/i;

const UNDESCRIBED = "Unknown: no description for this one. Read its value to see what it holds.";

const PROTECTED = "Withheld: the field name reads as a credential.";

const TARGETS = {
  async site(id: string) {
    const { site, server, token } = await findSite(id);
    const forgeUrl = forgeSiteUrl(server, site.id);
    return {
      path: `orgs/${server.org_slug}/sites/${site.id}`,
      token,
      known: SITE_FIELDS,
      links: {
        site: forgeUrl,
        environment: forgeUrl && `${forgeUrl}/environment`,
        deploymentSettings: forgeUrl && `${forgeUrl}/settings/deployments`,
      },
    };
  },
  async server(id: string) {
    const { server, token } = await findServer(id);
    return {
      path: `orgs/${server.org_slug}/servers/${server.id}`,
      token,
      known: SERVER_FIELDS,
      links: { server: forgeServerUrl(server) },
    };
  },
};

const describe = (name: string, known: Record<string, Field>): Field =>
  known[name] ?? { description: UNDESCRIBED, ...(SECRET.test(name) ? { protect: PROTECTED } : {}) };

const mayReadProtected = () => getPreferenceValues()?.laravel_forge_ai_protected_values === true;

export default async function tool({ target, id, fields }: Input) {
  const { path, token, links, known } = await TARGETS[target](id);
  const resource = await getResource(path, token);
  if (!resource) throw new Error(`Forge returned no ${target} at ${path}.`);

  const attributes = (resource.attributes ?? {}) as Record<string, unknown>;
  const wanted = (fields ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  const head = { target, id: Number(resource.id), name: attributes.name, links };

  if (!wanted.length) {
    // Forge's fields, plus the ones it keeps on another endpoint
    const names = [...Object.keys(attributes), ...Object.keys(known).filter((name) => known[name].elsewhere)];
    const listed = Object.fromEntries(
      names.map((name) => {
        const field = describe(name, known);
        return [name, field.protect ? `${field.description} ${field.protect}` : field.description];
      }),
    );
    return {
      ...head,
      fields: listed,
      note: "These are field names, not values. Probe again with fields set to the ones the user needs.",
    };
  }

  const values: Record<string, unknown> = {};
  const handling: Record<string, string> = {};
  const unlocked = mayReadProtected();

  for (const name of wanted) {
    const field = describe(name, known);
    if (field.protect && !unlocked) {
      handling[name] = field.protect;
      continue;
    }
    if (field.elsewhere) {
      // Nothing on the record to read, whatever the preference says
      handling[name] = field.protect ?? `${name} is not part of the ${target} record.`;
      continue;
    }
    if (!(name in attributes)) {
      handling[name] = `Forge did not return a ${name} field on this ${target}.`;
      continue;
    }
    values[name] = attributes[name];
    if (field.protect) handling[name] = "Shown because the user turned on AI access to protected values.";
  }

  return { ...head, values, handling };
}
