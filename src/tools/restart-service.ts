import { Tool } from "@raycast/api";
import { Server, ServiceAction } from "../api/Server";
import { nameList, resolveForConfirmation, sitesOnServer, targetServer } from "./helpers";

type Input = {
  /**
   * The server's id as a string, or its exact name. Leave empty if you only know a site on it.
   */
  server?: string;
  /**
   * The site's id as a string, for example "2882133", or its exact name.
   */
  site?: string;
  /**
   * Which service to act on.
   */
  service: "php" | "nginx" | "mysql" | "redis";
  /**
   * What to do with the service. Defaults to a restart.
   */
  action?: ServiceAction;
};

export const confirmation: Tool.Confirmation<Input> = async ({ server, site, service, action = "reboot" }) => {
  const resolved = await resolveForConfirmation(() => targetServer({ server, site }));
  if (!resolved) return { message: `Restart "${server ?? site}"?` };
  const { server: found } = resolved;
  const sites = await sitesOnServer(found);
  return {
    message: `${action === "reboot" ? "Restart" : action} ${service} on ${found.name}?`,
    info: [
      { name: `Sites affected (${sites.length})`, value: nameList(sites) },
      { name: "Server", value: found.name ?? String(found.id) },
      ...(service === "php" ? [{ name: "PHP version", value: found.php_version ?? "unknown" }] : []),
    ],
  };
};

export default async function tool({ server, site, service, action = "reboot" }: Input) {
  const { server: found, token } = await targetServer({ server, site });
  await Server.runAction({ server: found, token, action, service });
  return { server: found.name, service, action, started: true };
}
