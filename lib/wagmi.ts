import { createClient, configureChains, goerli } from "wagmi";
import { jsonRpcProvider } from "@wagmi/core/providers/jsonRpc";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";

const RPC_URL = "https://rpc.eth.gateway.fm";

const { provider, chains, webSocketProvider } = configureChains(
  [goerli],
  [
    jsonRpcProvider({
      rpc: (_) => ({
        http: RPC_URL,
      }),
    }),
  ],
);

const { connectors } = getDefaultWallets({
  appName: "bridge",
  projectId: "350569e85a7ff1842b079dc92cf87b48",
  chains,
});

export const client = createClient({
  autoConnect: true,
  connectors,
  provider,
  webSocketProvider,
});
