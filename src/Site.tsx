import { Icon, OpenInBrowserAction, List, ActionPanel, PushAction, CopyToClipboardAction, Color } from "@raycast/api";
import { useState } from "react";
import { Site } from "./api/Site";
import { IServer, ServerCommands } from "./Server";
import { siteStatusState, useIsMounted, usePolling } from "./helpers";

export const SitesList = ({ server }: { server: IServer }) => {
  const [sites, setSites] = useState<ISite[]>([]);
  const isMounted = useIsMounted();
  usePolling(() =>
    Site.getAll(server).then((sites: ISite[] | undefined) => {
      isMounted.current && sites && setSites(sites);
    })
  );

  return (
    <>
      {sites.map((site: ISite) => (
        <SiteListItem key={site.id} site={site} server={server} />
      ))}
    </>
  );
};

const SiteListItem = ({ site, server }: { site: ISite; server: IServer }) => {
  //   console.log(site);
  const { icon: stateIcon, text: stateText } = siteStatusState(site);
  return (
    <List.Item
      id={site.id.toString()}
      key={site.id}
      title={site.name}
      subtitle={site.repository ?? site.app ?? ""}
      icon={stateIcon}
      //   accessoryIcon={siteStatus().icon}
      accessoryTitle={stateText}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction title="Open site info" target={<SitesSingleView site={site} server={server} />} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Site Commands">
            <SiteCommands site={site} server={server} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Server Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export const SitesSingleView = ({ site, server }: { site: ISite; server: IServer }) => {
  const [current, setCurrent] = useState<ISite>(site);
  const isMounted = useIsMounted();
  usePolling(() =>
    Site.get(site, server).then((site: ISite | undefined) => {
      isMounted.current && site && setCurrent(site);
    })
  );
  return (
    <>
      <List searchBarPlaceholder="Search sites...">
        <List.Section title={`Site Commands (${current.name})`}>
          {site.repository && (
            <List.Item
              id="site-deploy"
              key="site-deploy"
              title="Trigger deploy script"
              accessoryIcon={current.deploymentStatus ? { source: Icon.Circle, tintColor: Color.Purple } : undefined}
              accessoryTitle={current.deploymentStatus ?? "press to deploy"}
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    icon={Icon.Hammer}
                    title="Trigger deploy script"
                    onAction={() => Site.deploy(current, server)}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
        <List.Section title="Site Information">
          {Object.entries({
            id: "Forge site ID",
            serverId: "Forge server ID",
            name: "Site name",
            aliases: "Aliases",
            isSecured: "SSL",
            deploymentUrl: "Deployment webhook Url",
            tags: "Tags",
            directory: "Directory",
            repository: "Repository",
            quickDeploy: "Quick deploy enabled",
            deploymentStatus: "Deploy status",
          }).map(([key, label]) => {
            const value = current[key as keyof ISite]?.toString() ?? "";
            return (
              value.length > 0 && (
                <List.Item
                  id={key}
                  key={key}
                  title={label}
                  // subtitle={value}
                  accessoryTitle={value}
                  actions={
                    <ActionPanel>
                      <CopyToClipboardAction content={value ?? ""} />
                    </ActionPanel>
                  }
                />
              )
            );
          })}
        </List.Section>
      </List>
    </>
  );
};

export const SiteCommands = ({ site, server }: { site: ISite; server: IServer }) => {
  let url;
  try {
    // The site may fail here if using Default
    url = new URL("https://" + site.name);
  } catch (error) {
    url = undefined;
  }
  return (
    <>
      {url && <OpenInBrowserAction icon={Icon.Globe} title={`Open site in browser`} url={url.toString()} />}
      {/* As fas as I'm aware only sites with a repo can deploy */}
      {site.repository && (
        <ActionPanel.Item icon={Icon.Hammer} title="Trigger deploy script" onAction={() => Site.deploy(site, server)} />
      )}
    </>
  );
};

export interface ISite {
  id: number;
  serverIid: number;
  name: string;
  aliases: Array<string>;
  directory: string;
  wildcards: boolean;
  status: string;
  repository: string;
  repositoryProvider: string;
  repositoryBranch: string;
  repositoryStatus: string;
  quickDeploy: boolean;
  deploymentStatus: string | null;
  isOnline: boolean;
  projectType: string;
  phpVersion: string;
  app: string | null;
  appStatus: string | null;
  slackChannel: string | null;
  telegramChatId: string | null;
  telegramChatTitle: string | null;
  teamsWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  createdAt: string;
  telegramSecret: string;
  username: string;
  deploymentUrl: string;
  isSecured: boolean;
  tags: Array<string>;
}
