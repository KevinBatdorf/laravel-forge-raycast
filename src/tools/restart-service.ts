import { Tool } from "@raycast/api";
import { Server, ServiceAction } from "../api/Server";
import { findServer } from "./helpers";

type Input = {
  /**
   * Name of the server, as shown in Forge.
   */
  server: string;
  /**
   * Which service to act on.
   */
  service: "php" | "nginx" | "mysql" | "redis";
  /**
   * What to do with the service. Defaults to a restart.
   */
  action?: ServiceAction;
};

export const confirmation: Tool.Confirmation<Input> = async ({ server, service, action = "reboot" }) => {
  const { server: found } = await findServer(server);
  return {
    message: `${action === "reboot" ? "Restart" : action} ${service} on ${found.name}?`,
    info: [{ name: "Sites affected", value: "every site on this server" }],
  };
};

export default async function tool({ server, service, action = "reboot" }: Input) {
  const { server: found, token } = await findServer(server);
  await Server.runAction({ server: found, token, action, service });
  return { server: found.name, service, action, started: true };
}
