import React from "react";
import { WagmiConfig } from "wagmi";
import { goerli } from "wagmi/chains";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { client } from "../lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles.css";
import { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig client={client}>
      <RainbowKitProvider chains={[goerli]}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default MyApp;
