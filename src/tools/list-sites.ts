import { sitePage } from "./browse";
import { namesAsked, pick, siteRowExtras } from "./fields";
import { findServer, siteDeploymentStatus } from "./helpers";

const TRUNCATED =
  "Each row is a summary. probe-api a site to see every field it holds, then name the ones you need in fields.";

type Input = {
  /**
   * Part of a site name. Forge matches on contains, so "6-8" finds 6-8.example.com. It cannot
   * see aliases.
   */
  site?: string;
  /**
   * A server id or exact name, to list only that server's sites.
   */
  server?: string;
  /**
   * Extra field names to add to every row, comma separated. probe-api a site to see what it holds.
   */
  fields?: string;
  /**
   * The page value from a previous call, to read the next page. Leave empty for the first.
   */
  page?: string;
};

export default async function tool({ site, server, fields, page }: Input) {
  const owner = server ? await findServer(server) : undefined;
  const serverPath = owner && `orgs/${owner.server.org_slug}/servers/${owner.server.id}`;
  const { sites, next } = await sitePage({ name: site, page, serverPath });

  const asked = namesAsked(fields);
  const unknown = new Set<string>();
  const rows = sites.map(({ site: found, server: host }) => {
    const extra = pick(siteRowExtras(found), asked);
    extra.unknown.forEach((name) => unknown.add(name));
    return {
      id: found.id,
      name: found.name,
      server: host.name,
      url: found.url,
      status: found.status,
      deploymentStatus: siteDeploymentStatus(found),
      ...extra.picked,
    };
  });

  const notes = [`One Forge page of ${rows.length} sites. Forge reports no total.`];
  if (next) notes.push("Pass page for the next one.");
  if (site && !rows.length) notes.push(`Forge matched no site name containing "${site}". It cannot match an alias.`);
  if (!asked.length) notes.push(TRUNCATED);
  if (unknown.size) notes.push(`No site field matches ${[...unknown].join(", ")}. probe-api a site for its names.`);

  return { note: notes.join(" "), ...(next ? { page: next } : {}), sites: rows };
}
