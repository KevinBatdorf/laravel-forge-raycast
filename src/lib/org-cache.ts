import { LocalStorage } from "@raycast/api";

// An entry can only go stale by deletion, and the probe on use catches that
const TTL = 7 * 24 * 60 * 60 * 1000;

type Kind = "server" | "site";
type Owner = { slug: string; tokenKey: string };

const key = (kind: Kind, id: number | string) => `org-of-${kind}-${id}`;

export const rememberOwner = async (kind: Kind, id: number | string, owner: Owner) => {
  if (!owner.slug || !owner.tokenKey) return;
  await LocalStorage.setItem(key(kind, id), JSON.stringify({ ...owner, at: Date.now() }));
};

export const cachedOwner = async (kind: Kind, id: number | string): Promise<Owner | undefined> => {
  const raw = await LocalStorage.getItem<string>(key(kind, id));
  if (!raw) return undefined;
  try {
    const { slug, tokenKey, at } = JSON.parse(raw);
    if (!slug || !tokenKey || Date.now() - Number(at) > TTL) {
      await LocalStorage.removeItem(key(kind, id));
      return undefined;
    }
    return { slug: String(slug), tokenKey: String(tokenKey) };
  } catch {
    return undefined;
  }
};

export const forgetOwner = (kind: Kind, id: number | string) => LocalStorage.removeItem(key(kind, id));
