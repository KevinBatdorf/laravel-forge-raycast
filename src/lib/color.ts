import { Color, Icon } from "@raycast/api";
import { ISite } from "../types";

export const getServerColor = (provider: string): string => {
  // Colors pulled from their respective sites
  switch (provider) {
    case "ocean2":
      return "rgb(0, 105, 255)";
    case "linode":
      return "#02b159";
    case "vultr":
      return "#007bfc";
    case "aws":
      return "#ec7211";
    case "hetzner":
      return "#d50c2d";
    case "custom":
      return "rgb(24, 182, 155)"; // Forge color
  }
  return "rgb(24, 182, 155)";
};

export const siteStatusState = (site: ISite, online: boolean) => {
  const details = {
    icon: { source: Icon.Circle, tintColor: Color.Green },
    text: "connected",
  };
  if (site.deployment_status === "failed") {
    details.icon.tintColor = Color.Red;
    details.text = "deployment failed";
  }
  if (!online) {
    details.icon.tintColor = Color.Red;
    details.text = "offline";
  }
  if (site.deployment_status === "deploying") {
    details.icon.tintColor = Color.Purple;
    details.text = "deploying...";
  }

  return details;
};
