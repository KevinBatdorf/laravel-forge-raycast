import { sitePage } from "./browse";
import { namesAsked, pick, siteRowExtras } from "./fields";
import { findServer, siteDeploymentStatus } from "./helpers";

const TRUNCATED = "Rows are short. Call probe-api to see all field names. Then pass the ones you want in fields.";

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
  /**
   * How many sites to return. Up to 30. Defaults to 15.
   */
  limit?: number;
};

export default async function tool({ site, server, fields, page, limit }: Input) {
  const owner = server ? await findServer(server) : undefined;
  const serverPath = owner && `orgs/${owner.server.org_slug}/servers/${owner.server.id}`;
  const { sites, next } = await sitePage({ name: site, page, serverPath, limit });

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

  const notes = [`This is one page: ${rows.length} sites. Forge does not say how many there are in total.`];
  if (next) notes.push("Pass page to get the next page.");
  if (site && !rows.length) notes.push(`No site name contains "${site}". Forge cannot match an alias.`);
  if (!asked.length) notes.push(TRUNCATED);
  if (unknown.size)
    notes.push(`There is no site field called ${[...unknown].join(", ")}. Call probe-api for the real names.`);

  return { note: notes.join(" "), ...(next ? { page: next } : {}), sites: rows };
}
