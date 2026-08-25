import { sitePage } from "./browse";
import { askedFor, siteRowExtras } from "./fields";
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
   * The page value from a previous call. It carries that call's filters and limit. Leave
   * empty for the first page.
   */
  page?: string;
  /**
   * How many sites to return. Up to 30. Defaults to 15.
   */
  limit?: number;
  /**
   * Set true to also return sites on servers Forge has been disconnected from. Defaults to false.
   */
  includeRevoked?: boolean;
};

export default async function tool({ site, server, fields, page, limit, includeRevoked }: Input) {
  const owner = server ? await findServer(server) : undefined;
  const { sites, next, hidden } = await sitePage({ name: site, page, owner, limit, includeRevoked });

  const asked = askedFor("site", fields);
  const rows = sites.map(({ site: found, server: host }) => ({
    id: found.id,
    name: found.name,
    server: host.name,
    url: found.url,
    status: found.status,
    deploymentStatus: siteDeploymentStatus(found),
    ...asked.from(siteRowExtras(found)),
  }));

  const notes = [`This is one page: ${rows.length} sites. Forge does not say how many there are in total.`];
  if (hidden) notes.push(`${hidden} more are on revoked servers and not shown. Pass includeRevoked to see them.`);
  if (next) notes.push("Pass page to get the next page.");
  if (site && !rows.length) notes.push(`No site name contains "${site}". Forge cannot match an alias.`);
  if (!asked.requested) notes.push(TRUNCATED);
  notes.push(...asked.notes);

  return { note: notes.join(" "), ...(next ? { page: next } : {}), sites: rows };
}
