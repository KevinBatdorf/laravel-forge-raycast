import { Cache, Image, MenuBarExtra, open } from "@raycast/api";
import { useAllSites } from "./hooks/useAllSites";
import { ISite } from "./types";

const cache = new Cache();
if (!cache.get("deploying-ids")) {
  cache.set("deploying-ids", JSON.stringify([]));
}
const recentlyDeployed = () => JSON.parse(cache.get("deploying-ids") ?? "[]");

interface RecentEntry {
  id: number;
  timestamp: number;
}

export default function Command() {
  const { sites: sitesTokenOne, loading: loadingOne } = useAllSites("laravel_forge_api_key");
  const { sites: sitesTokenTwo, loading: loadingTwo } = useAllSites("laravel_forge_api_key_two");
  const allSites = [...(sitesTokenOne ?? []), ...(sitesTokenTwo ?? [])];
  const deploying = allSites.filter((site: ISite) => site.deployment_status === "deploying");

  // Clear out any sites that have been deploying for more than 3 minutes
  const IdsToKeep = recentlyDeployed().filter((entry: { id: number; timestamp: number }) => {
    return new Date().getTime() - entry.timestamp < 1000 * 60 * 3;
  });
  cache.set("deploying-ids", JSON.stringify(IdsToKeep));

  // Add any sites currently deploying to the cache, and update their timestamp
  deploying.forEach((site: ISite) => {
    const deployingIds = recentlyDeployed().filter((entry: { id: number }) => entry.id !== site.id);
    const entry: RecentEntry = {
      id: site.id,
      timestamp: new Date().getTime(),
    };
    cache.set("deploying-ids", JSON.stringify([...deployingIds, entry]));
  });

  const recentlyActive = recentlyDeployed()
    .map((entry: RecentEntry) => allSites?.find((site: ISite) => site.id === entry.id) ?? {})
    .filter((site: ISite) => site.deployment_status !== "deploying");

  return (
    <MenuBarExtra
      isLoading={loadingOne || loadingTwo}
      icon={{
        source: "forge-icon-64.png",
        mask: Image.Mask.Circle,
        tintColor: deploying?.length > 0 ? "#19b69c" : "white",
      }}
      tooltip="Laravel Forge"
    >
      {deploying?.length > 0 && <MenuBarExtra.Item key="currently-deploying" title="Currently Deploying" />}
      {deploying.map((site: ISite) => (
        <MenuBarExtra.Item
          key={site.id}
          title={site?.name ?? site?.aliases?.[0] ?? "Unknown"}
          subtitle={site?.deployment_status ?? "deployed"}
          tooltip="Open in Raycast"
          onAction={() => {
            open(
              `raycast://extensions/KevinBatdorf/laravel-forge/index?arguments=%7B%22server%22%3A%22${site.server_id}%22%7D`
            );
          }}
        />
      ))}
      {recentlyActive?.length > 0 && <MenuBarExtra.Item key="recent-activity" title="Recent Activity" />}
      {recentlyActive.map((site: ISite) => (
        <MenuBarExtra.Item
          key={site.id}
          title={site?.name ?? site?.aliases?.[0] ?? "Unknown"}
          subtitle={site?.deployment_status ?? "deployed"}
          tooltip="Open in Raycast"
          onAction={() => {
            open(
              `raycast://extensions/KevinBatdorf/laravel-forge/index?arguments=%7B%22server%22%3A%22${site.server_id}%22%7D`
            );
          }}
        />
      ))}
    </MenuBarExtra>
  );
}