import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  Icon,
  preferences,
  PushAction,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Server } from "./api/Server";
import { SitesList } from "./Site";
import { getProviderIcon } from "./helpers";

export const ServersList = () => {
  const [servers, setServers] = useState<IServer[]>([]);
  useEffect(() => {
    // TODO: Maybe cahe these for first load? Wait on user feedback
    Server.getAll().then((servers: Array<IServer> | undefined) => {
      servers && setServers(servers);
    });
  }, []);

  return (
    <List isLoading={servers.length > 0} searchBarPlaceholder="Search servers...">
      {servers.map((server: IServer) => (
        <ServerListItem key={server.id} server={server} />
      ))}
    </List>
  );
};

const ServerListItem = ({ server }: { server: IServer }) => {
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      title={server.name}
      icon={{
        source: getProviderIcon(server.provider),
      }}
      accessoryTitle={server.ipAddress}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction title="Open server info" target={<SingleServerView server={server} />} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const SingleServerView = ({ server }: { server: IServer }) => {
  const sshUser = preferences?.laravel_forge_ssh_user?.value ?? "forge";
  return (
    <List searchBarPlaceholder="Search sites...">
      <List.Section title={`Sites (${server.name})`}>
        <SitesList server={server} />
      </List.Section>
      <List.Section title="Common Commands">
        <List.Item
          id="open-in-ssh"
          key="open-in-ssh"
          title={`Open SSH connection (${sshUser})`}
          icon={Icon.Terminal}
          accessoryTitle={`ssh://${sshUser}@${server.ipAddress}`}
          actions={
            <ActionPanel>
              <OpenInBrowserAction title={`SSH in as user ${sshUser}`} url={`ssh://${sshUser}@${server.ipAddress}`} />
            </ActionPanel>
          }
        />
        <List.Item
          id="open-on-forge"
          key="open-on-forge"
          title="Open on Laravel Forge"
          icon={Icon.Globe}
          accessoryTitle="forge.laravel.com"
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={`https://forge.laravel.com/servers/${server.id}`} />
            </ActionPanel>
          }
        />
        <List.Item
          id="copy-ip"
          key="copy-ip"
          title="Copy IP address"
          icon={Icon.Clipboard}
          accessoryTitle={server.ipAddress}
          actions={
            <ActionPanel>
              <CopyToClipboardAction title="Copy IP address" content={server.ipAddress} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Reboot">
        <List.Item
          id="reboot-server"
          key="reboot-server"
          title="Reboot server"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                icon={Icon.ArrowClockwise}
                title="Reboot Server"
                onAction={async () => await Server.reboot({ serverId: server.id, token: server.apiToken })}
              />
            </ActionPanel>
          }
        />
        {Object.entries({ mysql: "MySQL", nginx: "Nginx", postgres: "Postgres", php: "PHP" }).map(([key, label]) => {
          return (
            <List.Item
              id={key}
              key={key}
              title={`Reboot ${label}`}
              icon={Icon.ArrowClockwise}
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    icon={Icon.ArrowClockwise}
                    title={`Reboot ${label}`}
                    onAction={async () =>
                      await Server.reboot({ serverId: server.id, token: server.apiToken, key, label })
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {/* TODO: maybe a markdown view with server stats? */}
    </List>
  );
};

export const ServerCommands = ({ server }: { server: IServer }) => {
  const sshUser = preferences?.laravel_forge_ssh_user?.value ?? "forge";
  return (
    <>
      <OpenInBrowserAction
        icon={Icon.Terminal}
        title={`SSH in as user ${sshUser}`}
        url={`ssh://${sshUser}@${server.ipAddress}`}
      />
      <ActionPanel.Item
        icon={Icon.ArrowClockwise}
        title="Reboot Server"
        onAction={() => Server.reboot({ serverId: server.id, token: server.apiToken })}
      />
      <CopyToClipboardAction title="Copy IP address" content={server.ipAddress} />
      <OpenInBrowserAction title="Open on Laravel Forge" url={`https://forge.laravel.com/servers/${server.id}`} />
    </>
  );
};

export interface IServer {
  apiToken: string;
  id: number;
  credentialId: string;
  name: string;
  type: string;
  provider: string;
  providerId: string;
  size: string;
  region: string;
  dbStatus: string | null;
  redisStatus: string | null;
  phpVersion: string;
  phpCliVersion: string;
  databaseType: string;
  ipAddress: string;
  sshPort: number;
  privateIpAddress: string;
  blackfireStatus: string | null;
  papertrailStatus: string | null;
  revoked: boolean;
  createdAt: string;
  isReady: boolean;
  tags: Array<string>;
  network: string;
}
