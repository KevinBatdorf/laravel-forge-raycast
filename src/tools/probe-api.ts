import { getCollection, getResource } from "../lib/forge";
import { unwrapToken } from "../lib/auth";
import { tail } from "./helpers";

type Input = {
  /**
   * A Laravel Forge API v2 path, relative and without a leading slash, for example
   * `sites?filter[name]=example.com` or `orgs/<slug>/servers/<id>/events`. Read-only: this issues a
   * GET. Use it when no other tool covers the question, or to find out what an endpoint returns.
   */
  path: string;
  /**
   * Set when the answer is a single resource rather than a list, for example a deployment or a log.
   */
  single?: boolean;
};

export default async function tool({ path, single }: Input) {
  const clean = path.trim().replace(/^\/*(api\/)?/, "");
  if (/^[a-z]+:\/\//i.test(clean)) throw new Error("Pass a path relative to the Forge API, not a full URL.");

  const token = unwrapToken("laravel_forge_api_token");
  if (!token) throw new Error("No Laravel Forge API token is configured.");

  if (single) {
    const data = await getResource(clean, token);
    return { path: clean, data: JSON.parse(tail(JSON.stringify(data ?? null), 6_000)) };
  }

  const { items, included } = await getCollection(clean, token, { pages: 1 });
  return {
    path: clean,
    count: items.length,
    items: JSON.parse(tail(JSON.stringify(items), 6_000)),
    includedTypes: [...new Set(included.map((resource) => resource.type))],
  };
}
