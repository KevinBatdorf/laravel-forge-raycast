import { accounts } from "./accounts";
import { refreshOrgs } from "./orgs";

// The menu bar runs every 10s; refreshing the org list there keeps the AI tools
// warm and is the one place a newly created org gets picked up on its own.
export const warmOrgCache = () => {
  Promise.all(accounts().map((account) => refreshOrgs(account).catch(() => undefined))).catch(() => undefined);
};
