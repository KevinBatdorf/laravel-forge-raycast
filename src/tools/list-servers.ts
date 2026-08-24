import { namesAsked, pick, serverRowExtras } from "./fields";
import { allServers } from "./helpers";

const TRUNCATED =
  "Each row is a summary. probe-api a server to see every field it holds, then name the ones you need in fields.";

type Input = {
  /**
   * Extra field names to add to every row, comma separated. probe-api a server to see what it holds.
   */
  fields?: string;
};

export default async function tool({ fields }: Input) {
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

  const notes = [asked.length ? undefined : TRUNCATED].filter(Boolean);
  if (unknown.size) notes.push(`No server field matches ${[...unknown].join(", ")}. probe-api a server for its names.`);
  return { ...(notes.length ? { note: notes.join(" ") } : {}), servers: listed };
}
