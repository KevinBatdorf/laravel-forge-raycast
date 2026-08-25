import { getCollection } from "./forge";
import { Account, accounts } from "./accounts";
import { knownOrgs, rememberOrgs } from "./index-cache";

// An org list only ever grows, and a new one is undetectable — nothing 404s.
// So it is cached without expiry and refreshed when a lookup finds nothing.
const fetchOrgs = async ({ tokenKey, token }: Account) => {
  const { items } = await getCollection("orgs", token);
  const slugs = items.map((org) => String(org.attributes?.slug ?? "")).filter(Boolean);
  await rememberOrgs(tokenKey, slugs);
  return slugs;
};

export const orgsFor = async (account: Account) => (await knownOrgs(account.tokenKey)) ?? fetchOrgs(account);

export const refreshOrgs = (account: Account) => fetchOrgs(account);

export type OrgRef = { account: Account; org: string };

// Every listing walks these: one entry per org of every configured account
export const everyOrg = async (): Promise<OrgRef[]> => {
  const perAccount = await Promise.all(
    accounts().map(async (account) => (await orgsFor(account)).map((org) => ({ account, org }))),
  );
  return perAccount.flat();
};

export const refreshEveryOrg = async (): Promise<OrgRef[]> => {
  const perAccount = await Promise.all(
    accounts().map(async (account) => (await refreshOrgs(account)).map((org) => ({ account, org }))),
  );
  return perAccount.flat();
};

// A slug the model handed back is only trusted if we already knew it: org goes in the path
export const isKnownOrg = async (tokenKey: string, org: string) => {
  const account = accounts().find((one) => one.tokenKey === tokenKey);
  if (!account) return false;
  return (await orgsFor(account)).includes(org);
};
