import { faker } from "@faker-js/faker";
import { IServer, ISite } from "../types";

export const createFakeServer = (count = 1): IServer[] => {
  const fakeServer = (): IServer => ({
    id: faker.datatype.number(),
    api_token_key: faker.datatype.string(),
    ssh_user: faker.internet.userName(),
    org_slug: faker.internet.domainWord(),
    credential_id: faker.datatype.number(),
    name: faker.company.name(),
    slug: faker.internet.domainWord(),
    type: faker.datatype.string(),
    provider: faker.helpers.arrayElement(["ocean2", "linode", "vultr", "aws", "hetzner", "custom"]),
    identifier: faker.datatype.string(),
    size: faker.datatype.string(),
    region: faker.datatype.string(),
    ubuntu_version: faker.datatype.string(),
    db_status: faker.datatype.string(),
    redis_status: faker.datatype.string(),
    php_version: faker.datatype.string(),
    php_cli_version: faker.datatype.string(),
    opcache_status: faker.datatype.string(),
    database_type: faker.datatype.string(),
    ip_address: faker.internet.ip(),
    ssh_port: faker.datatype.number(),
    private_ip_address: faker.internet.ip(),
    local_public_key: faker.datatype.string(),
    connection_status: faker.helpers.arrayElement(["connected", "failed"]),
    timezone: "UTC",
    revoked: faker.datatype.boolean(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.past().toISOString(),
    is_ready: faker.datatype.boolean(),
    keywords: faker.helpers.arrayElements([faker.internet.domainName(), faker.internet.domainName()]),
  });
  return Array.from({ length: count }, fakeServer);
};

export const createFakeSite = (serverId: IServer["id"], count = 1): ISite[] => {
  const fakeSite = (): ISite => ({
    id: faker.datatype.number(),
    server_id: serverId,
    name: faker.internet.domainName(),
    status: "installed",
    url: faker.internet.url(),
    user: faker.internet.userName(),
    https: faker.datatype.boolean(),
    web_directory: faker.datatype.string(),
    root_directory: faker.datatype.string(),
    aliases: [],
    php_version: faker.helpers.arrayElement(["PHP 8.2", "PHP 8.3", "PHP 8.4"]),
    deployment_status: faker.helpers.arrayElement(["deploying", "deployed", "failed", null]),
    quick_deploy: faker.datatype.boolean(),
    isolated: faker.datatype.boolean(),
    shared_paths: [],
    repository: {
      provider: "GitHub",
      url: faker.internet.url(),
      branch: "main",
      status: "installed",
    },
    database: faker.datatype.string(),
    maintenance_mode: { enabled: false, status: null },
    zero_downtime_deployments: faker.datatype.boolean(),
    wildcards: faker.datatype.boolean(),
    app_type: faker.datatype.string(),
    uses_envoyer: false,
    deployment_url: faker.internet.url(),
    healthcheck_url: null,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.past().toISOString(),
  });
  return Array.from({ length: count }, fakeSite);
};
