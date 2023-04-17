import { Icon, List, ActionPanel, Color, Action, showToast, Toast } from "@raycast/api";
import { Site } from "../../api/Site";
import { IServer, ISite } from "../../types";
import { EnvFile } from "../configs/EnvFile";
import { NginxFile } from "../configs/NginxFile";
import { useSite } from "../../hooks/useSite";
import { API_RATE_LIMIT } from "../../config";
import { unwrapToken } from "../../lib/auth";
import { EmptyView } from "../EmptyView";
import { useIsSiteOnline } from "../../hooks/useIsSiteOnline";
import { useEffect, useState } from "react";

export const SiteSingle = ({ site, server }: { site: ISite; server: IServer }) => {
  const token = unwrapToken(server.api_token_key);
  const refreshInterval = 60_000 / API_RATE_LIMIT + 100;
  const { site: siteData, loading, error } = useSite(server, site, { refreshInterval });
  const { url } = useIsSiteOnline(site);
  const [reallyLoading, setReallyLoading] = useState(false);

  useEffect(() => {
    if (!loading) return setReallyLoading(false);
    // Essentially a loading debounce to prevent flickering
    const id = setTimeout(() => setReallyLoading(loading), 100);
    return () => clearTimeout(id);
  }, [loading]);

  if (reallyLoading) return <EmptyView title="Loading..." />;
  if (loading) return null;
  if (error) return <EmptyView title={error} />;
  if (!siteData) return <EmptyView title="No site found" />;

  return (
    <List searchBarPlaceholder="Search sites...">
      <List.Section title={`${server.name?.toUpperCase()} -> Sites -> ${siteData.name}`}>
        <List.Item
          id="open-on-forge"
          key="open-on-forge"
          title="Open on Laravel Forge"
          icon={{ source: "forge-icon-64.png" }}
          accessories={[{ text: "forge.laravel.com" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://forge.laravel.com/servers/${server.id}/sites/${site.id}`} />
            </ActionPanel>
          }
        />
        {site.repository && (
          <List.Item
            id="site-deploy"
            key="site-deploy"
            title="Trigger deploy script"
            icon={Icon.ArrowClockwise}
            accessories={[
              { text: siteData.deployment_status ?? "press to deploy" },
              { icon: siteData.deployment_status ? { source: Icon.Circle, tintColor: Color.Purple } : undefined },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Trigger Deploy Script"
                  onAction={() => {
                    showToast(Toast.Style.Success, "Deploying...");
                    Site.deploy({ siteId: siteData.id, serverId: server.id, token }).catch(() =>
                      showToast(Toast.Style.Failure, "Failed to trigger deploy script")
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          id="site-env"
          key="site-env"
          title="View .env file"
          icon={Icon.BlankDocument}
          accessories={[{ text: "press to view" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open .env File"
                icon={Icon.BlankDocument}
                target={<EnvFile site={site} server={server} />}
              />
              <Action.OpenInBrowser
                title="Edit on Forge"
                url={`https://forge.laravel.com/servers/${server.id}/sites/${site.id}/environment`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="site-nginx"
          key="site-nginx"
          title="View nginx config"
          icon={Icon.BlankDocument}
          accessories={[{ text: "press to view" }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Nginx Config"
                icon={Icon.BlankDocument}
                target={<NginxFile site={site} server={server} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="open-in-ssh"
          key="open-in-ssh"
          title={`Open SSH connection (${site.username})`}
          icon={Icon.Terminal}
          accessories={[{ text: `ssh://${site.username}@${server.ip_address}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`Open SSH Connection (${site.username})`}
                url={`ssh://${site.username}@${server.ip_address}`}
              />
            </ActionPanel>
          }
        />
        {url && (
          <List.Item
            id="open-in-browser"
            key="open-in-browser"
            title="Open site in browser"
            icon={Icon.Globe}
            accessories={[{ text: url }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Site Additonal Information">
        {Object.entries({
          id: "Forge site ID",
          server_d: "Forge server ID",
          name: "Site name",
          aliases: "Aliases",
          is_secured: "SSL",
          deployment_url: "Deployment webhook Url",
          tags: "Tags",
          directory: "Directory",
          repository: "Repository",
          quick_deploy: "Quick deploy enabled",
          deployment_status: "Deploy status",
        }).map(([key, label]) => {
          const value = siteData[key as keyof ISite]?.toString() ?? "";
          return (
            value.length > 0 && (
              <List.Item
                id={key}
                key={key}
                title={label}
                accessories={[{ text: value }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={value ?? ""} />
                  </ActionPanel>
                }
              />
            )
          );
        })}
      </List.Section>
    </List>
  );
};
