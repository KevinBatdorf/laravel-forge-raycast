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

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Forge answers 401 for a route that does not exist, not only for a bad token
    if (/^401\b|\b401 /.test(message)) {
      throw new Error(
        `Forge answered 401 for "${clean}". That is also what it answers for a path that is not a real route: servers and their sites live under orgs/<slug>/, and there is no top-level servers or sites/<id>. Probe "orgs" for the slug, then "orgs/<slug>/servers".`,
      );
    }
    throw error;
  }
}
