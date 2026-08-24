import { namesAsked, pick, siteRowExtras } from "./fields";
import { allSites, searchSites, siteDeploymentStatus, walkedEverything } from "./helpers";
import { paged } from "./paging";

const TRUNCATED =
  "Each row is a summary. probe-api a site to see every field it holds, then name the ones you need in fields.";

type Input = {
  /**
   * Part of a site name to search for. Forge matches on contains, so "6-8" finds 6-8.example.com.
   */
  site?: string;
  /**
   * A server id, or part of a server name, to filter by. Leave empty for every site.
   */
  server?: string;
  /**
   * Extra field names to add to every row, comma separated. probe-api a site to see what it holds.
   */
  fields?: string;
  /**
   * How many sites to return. Defaults to 30.
   */
  limit?: number;
  /**
   * Where to start, for the page after the one already read. Defaults to 0.
   */
  offset?: number;
};

export default async function tool({ site, server, fields, limit, offset }: Input) {
  let sites = site ? await searchSites(site) : await allSites();
  let note;
  if (site && !sites.length) {
    // Forge's filter only sees site names; the match may be in an alias or the server's name
    const all = await allSites();
    const query = site.trim().toLowerCase();
    sites = all.filter(({ site: found, server: owner }) =>
      [found.name, ...(found.aliases ?? []), owner.name]
        .filter(Boolean)
        .some((name) => String(name).toLowerCase().includes(query)),
    );
    if (!sites.length) {
      sites = all;
      note = `Nothing matches "${site}" by site name, alias or server name. Every site follows instead.`;
    }
  }

  const asked = namesAsked(fields);
  const unknown = new Set<string>();
  const wanted = server?.trim().toLowerCase();
  const listed = sites
    .filter(
      (match) =>
        !wanted || (match.server.name ?? "").toLowerCase().includes(wanted) || String(match.server.id) === wanted,
    )
    .map(({ site, server: owner }) => {
      const extra = pick(siteRowExtras(site), asked);
      extra.unknown.forEach((name) => unknown.add(name));
      return {
        id: site.id,
        name: site.name,
        server: owner.name,
        url: site.url,
        status: site.status,
        deploymentStatus: siteDeploymentStatus(site),
        ...extra.picked,
      };
    });

  const page = paged(listed, { kind: "sites", offset, limit, complete: walkedEverything("sites") });
  const notes = [note, page.note, asked.length ? undefined : TRUNCATED].filter(Boolean);
  if (unknown.size) notes.push(`No site field matches ${[...unknown].join(", ")}. probe-api a site for its names.`);
  return { note: notes.join(" "), perPage: page.perPage, offset: page.offset, total: page.total, sites: page.rows };
}
