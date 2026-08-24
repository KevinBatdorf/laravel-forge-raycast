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
};

const ASKS: Record<string, string> = {
  site: "Name any of these in list-sites fields, or get-site include.",
  server: "Name any of these in list-servers fields, or get-server include.",
};

export default async function tool({ target }: Input) {
  const { fields, inForgeOnly, onRequest } = forgeFields[target] as Target;
  const describe = (name: string, description: string) => {
    if (inForgeOnly.includes(name)) return `${description} Not handed over; the get tool returns a Forge link for it.`;
    if (onRequest.includes(name)) return `${description} Only by name on include.`;
    return description;
  };

  return {
    target,
    fields: Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, describe(name, text)])),
    note: `${ASKS[target]} Spelling of the name does not matter. These are names, not values.`,
  };
}
