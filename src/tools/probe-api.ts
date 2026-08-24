import forgeFields from "./forge-fields.json";

type Input = {
  /**
   * Whether to name a site's fields or a server's.
   */
  target: "site" | "server";
};

type Target = {
  fields: Record<string, string>;
  inForgeOnly: string[];
  onRequest: string[];
  filters: string[];
  sorts: string[];
};

const ASKS: Record<string, string> = {
  site: "These are field names, not values. Pass the ones you want to list-sites in fields, or to get-site in include.",
  server:
    "These are field names, not values. Pass the ones you want to list-servers in fields, or to get-server in include.",
};

export default async function tool({ target }: Input) {
  const { fields, inForgeOnly, onRequest, filters, sorts } = forgeFields[target] as Target;
  const describe = (name: string, description: string) => {
    if (inForgeOnly.includes(name))
      return `${description} You cannot read this. The get tool gives a Forge link instead.`;
    if (onRequest.includes(name)) return `${description} Ask for it by name in include.`;
    return description;
  };

  return {
    target,
    fields: Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, describe(name, text)])),
    filters,
    sorts,
    note: ASKS[target],
    ...(filters.length
      ? { filterNote: "Forge can filter on these. Pass one to the list tool. Forge does the work." }
      : {}),
    ...(sorts.length ? { sortNote: "Forge can sort on these. Add a minus to reverse, like -created_at." } : {}),
  };
}
