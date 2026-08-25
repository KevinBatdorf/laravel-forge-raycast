import { LocalStorage } from "@raycast/api";

// One blob, not a key per record: a fleet of thousands stays one read
const KEY = "forge:index";

export type Coordinates = { tokenKey: string; org: string; serverId?: number };

type Index = {
  orgs: Record<string, string[]>;
  sites: Record<string, Coordinates>;
  servers: Record<string, Coordinates>;
};

const empty = (): Index => ({ orgs: {}, sites: {}, servers: {} });

// A malformed blob is not worth recovering; the next list call rebuilds it
const read = async (): Promise<Index> => {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
};

const write = (index: Index) => LocalStorage.setItem(KEY, JSON.stringify(index));

// Every entry here is immutable, so nothing expires: a wrong one 404s and is dropped
export const rememberOrgs = async (tokenKey: string, orgs: string[]) => {
  const index = await read();
  index.orgs[tokenKey] = orgs;
  await write(index);
};

export const knownOrgs = async (tokenKey: string) => (await read()).orgs[tokenKey];

export const allKnownOrgs = async () => (await read()).orgs;

export const forgetOrgs = async (tokenKey: string) => {
  const index = await read();
  delete index.orgs[tokenKey];
  await write(index);
};

type Kind = "site" | "server";

export const remember = async (kind: Kind, id: number | string, where: Coordinates) => {
  if (!where.tokenKey || !where.org) return;
  const index = await read();
  index[`${kind}s`][String(id)] = where;
  await write(index);
};

// One write for a page of rows; remember() per row would rewrite the blob N times
export const rememberMany = async (kind: Kind, entries: Array<[number | string, Coordinates]>) => {
  const usable = entries.filter(([, where]) => where.tokenKey && where.org);
  if (!usable.length) return;
  const index = await read();
  for (const [id, where] of usable) index[`${kind}s`][String(id)] = where;
  await write(index);
};

export const lookup = async (kind: Kind, id: number | string): Promise<Coordinates | undefined> =>
  (await read())[`${kind}s`][String(id)];

export const forget = async (kind: Kind, id: number | string) => {
  const index = await read();
  delete index[`${kind}s`][String(id)];
  await write(index);
};
