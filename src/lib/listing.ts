import { ForgeResource, getCollection } from "./forge";
import { OrgRef, everyOrg, isKnownOrg } from "./orgs";

const PER_PAGE = 15;

// Forge honours a smaller page[size] but caps it at 30
export const perPage = (limit?: number) => Math.min(30, Math.max(1, Math.trunc(limit ?? PER_PAGE)));

// One cursor per org, so the key names the account too: two accounts can hold the same slug
export type Cursors = Record<string, string>;

export const cursorKey = ({ account, org }: OrgRef) => `${account.tokenKey}/${org}`;

// The org half of a key lands in the request path, so only a slug we already
// fetched is ever used. Anything else is dropped rather than trusted.
export const usableCursors = async (cursors?: Cursors): Promise<Cursors | undefined> => {
  if (!cursors || typeof cursors !== "object") return undefined;
  const entries = await Promise.all(
    Object.entries(cursors).map(async ([key, value]) => {
      const slash = key.indexOf("/");
      if (slash < 1 || typeof value !== "string" || !value) return undefined;
      const tokenKey = key.slice(0, slash);
      const org = key.slice(slash + 1);
      return (await isKnownOrg(tokenKey, org)) ? ([key, value] as const) : undefined;
    }),
  );
  const kept = entries.filter(Boolean) as Array<readonly [string, string]>;
  return kept.length ? Object.fromEntries(kept) : undefined;
};

export const queryString = (filters: Record<string, string | undefined>, extra: string[], limit?: number) => {
  const parts = [...extra, `page[size]=${perPage(limit)}`];
  for (const [name, value] of Object.entries(filters)) {
    if (value?.trim()) parts.push(`filter[${name}]=${encodeURIComponent(value.trim())}`);
  }
  return parts.join("&");
};

export type Page = { rows: Array<{ ref: OrgRef; item: ForgeResource; included: ForgeResource[] }>; next?: Cursors };

// A first call reads every org. A follow-up reads only the orgs that had more.
export const walkOrgs = async (
  path: (ref: OrgRef) => string,
  search: string,
  cursors?: Cursors,
  only?: OrgRef[],
): Promise<Page> => {
  const refs = only ?? (await everyOrg());
  const resuming = await usableCursors(cursors);
  const wanted = resuming ? refs.filter((ref) => resuming[cursorKey(ref)]) : refs;

  const pages = await Promise.all(
    wanted.map(async (ref) => {
      const from = resuming?.[cursorKey(ref)] ?? "";
      const { items, included, nextCursor } = await getCollection(`${path(ref)}?${search}`, ref.account.token, {
        pages: 1,
        from,
      });
      return { ref, items, included, nextCursor };
    }),
  );

  const rows = pages.flatMap(({ ref, items, included }) => items.map((item) => ({ ref, item, included })));
  const next = Object.fromEntries(
    pages.filter((page) => page.nextCursor).map((page) => [cursorKey(page.ref), String(page.nextCursor)]),
  );

  return { rows, next: Object.keys(next).length ? next : undefined };
};
