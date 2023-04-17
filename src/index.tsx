import { SWRConfig } from "swr";
import { cacheProvider as provider } from "./lib/cache";
import { ServersList } from "./components/servers/ServersList";

const LaravelForge = () => (
  // This cache provider only seems to work on the intiial render and for servers only.
  // Elsewhere uses Localstorage (which requires mannual caching outside swr)
  <SWRConfig value={{ provider }}>
    <ServersList />
  </SWRConfig>
);

export default LaravelForge;
