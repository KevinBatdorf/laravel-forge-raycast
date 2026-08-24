import { namesAsked, pick, serverRowExtras } from "./fields";
import { allServers, walkedEverything } from "./helpers";
import { paged } from "./paging";

const TRUNCATED =
  "Each row is a summary. probe-api a server to see every field it holds, then name the ones you need in fields.";

type Input = {
  /**
   * Extra field names to add to every row, comma separated. probe-api a server to see what it holds.
   */
  fields?: string;
  /**
   * How many servers to return. Defaults to 30.
   */
  limit?: number;
  /**
   * Where to start, for the page after the one already read. Defaults to 0.
   */
  offset?: number;
};

export default async function tool({ fields, limit, offset }: Input) {
  const servers = await allServers();
  const asked = namesAsked(fields);
  const unknown = new Set<string>();

  const listed = servers.map(({ server }) => {
    const extra = pick(serverRowExtras(server), asked);
    extra.unknown.forEach((name) => unknown.add(name));
    return {
      id: server.id,
      name: server.name,
      connectionStatus: server.connection_status,
      isReady: server.is_ready,
      ...extra.picked,
    };
  });

  const page = paged(listed, { kind: "servers", offset, limit, complete: walkedEverything("servers") });
  const notes = [page.note, asked.length ? undefined : TRUNCATED].filter(Boolean);
  if (unknown.size) notes.push(`No server field matches ${[...unknown].join(", ")}. probe-api a server for its names.`);
  return { note: notes.join(" "), perPage: page.perPage, offset: page.offset, total: page.total, servers: page.rows };
}
