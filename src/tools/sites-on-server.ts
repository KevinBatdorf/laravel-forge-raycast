import { Account } from "../lib/accounts";
import { queryString, walkOrgs } from "../lib/listing";

export const sitesOn = async ({ account, org, serverId }: { account: Account; org: string; serverId: number }) => {
  const { rows } = await walkOrgs(() => `orgs/${org}/servers/${serverId}/sites`, queryString({}, [], 30), undefined, [
    { account, org },
  ]).catch(() => ({ rows: [], next: undefined }));
  return rows.map(({ item }) => String(item.attributes?.name ?? item.id));
};
