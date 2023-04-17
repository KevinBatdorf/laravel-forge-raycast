import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useServers } from "../../hooks/useServers";
import { IServer } from "../../types";
import { EmptyView } from "../../components/EmptyView";
import { ServerSingle } from "./ServerSingle";
import { ServerCommands } from "../actions/ServerCommands";
import { getServerColor } from "../../lib/color";
import { useSites } from "../../hooks/useSites";
import { useState } from "react";

export const ServersList = () => {
  const [preLoadedServer, setPreLoadedServer] = useState<IServer>();
  const { servers, loading, error } = useServers();
  useSites(preLoadedServer);

  const preFetchSites = (serverId: string | null) => {
    const server = servers?.find((server) => server.id.toString() === serverId);
    setPreLoadedServer(server);
  };

  if (error?.message) {
    return <EmptyView title={`Error: ${error.message}`} />;
  }
  if (loading) {
    return <EmptyView title="Fetching servers..." />;
  }
  if (!servers) {
    return <EmptyView title="No servers found" />;
  }

  return (
    <List
      isLoading={!servers?.length && !loading}
      searchBarPlaceholder="Search servers..."
      onSelectionChange={preFetchSites}
    >
      {servers.map((server: IServer) => {
        return <ServerListItem key={server.id} server={server} />;
      })}
    </List>
  );
};

const ServerListItem = ({ server }: { server: IServer }) => {
  if (!server?.id) return null;
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      keywords={server.keywords}
      accessories={[{ text: server?.keywords?.join(", ") ?? "" }]}
      title={server?.name ?? "Server name undefined"}
      icon={{
        source: "server.png",
        tintColor: getServerColor(server?.provider ?? ""),
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Server Information"
              icon={Icon.Binoculars}
              target={<ServerSingle server={server} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};