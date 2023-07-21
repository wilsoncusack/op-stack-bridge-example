import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Bridge from "../components/Bridge";

export default function IndexPage() {
  return (
    <div>
      <div className="flex justify-end p-5">
        <ConnectButton showBalance={false} />
      </div>
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-bold">
          Bridge ETH from Goerli to Base Goerli
        </h1>
        <Bridge />
      </div>
    </div>
  );
}
