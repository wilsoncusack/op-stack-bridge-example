import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAccount, useSigner } from "wagmi";
import * as OP from "@eth-optimism/sdk";
import { ethers } from "ethers";

enum TxStatus {
  Pending,
  Confirmed,
}

const L1_EXPLORER_URL = "https://goerli.etherscan.io/";
const L2_EXPLORER_URL = "	https://goerli.basescan.org";

export default function Bridge() {
  const { address, isConnected } = useAccount();
  const [show, setShow] = useState<boolean>(false);

  const { data: signer } = useSigner();
  const [l1TxHash, setL1TxHash] = useState<string>("");
  const [l1TxStatus, setL1TxStatus] = useState<TxStatus | null>(null);
  const [l2TxHash, setL2TxHash] = useState<string>("");
  const [l2TxStatus, setL2TxStatus] = useState<TxStatus | null>(null);
  const [l2StartBlockNumber, setL2StartBlockNumber] = useState<number | null>(
    null,
  );
  const [messageStatus, setMessageStatus] = useState<OP.MessageStatus | null>(
    null,
  );
  const [bridgeInProgress, setBridgeInProgress] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number>(0);

  const messenger = useMemo(() => {
    if (!signer || !address) return;
    const l2Provider = new ethers.providers.JsonRpcProvider(
      "https://goerli.base.org",
    ).getSigner(address);
    return new OP.CrossChainMessenger({
      l1ChainId: OP.L1ChainID.GOERLI,
      l2ChainId: OP.L2ChainID.BASE_GOERLI,
      l1SignerOrProvider: signer,
      l2SignerOrProvider: l2Provider,
    });
  }, [address, signer]);

  // adapted from https://github.com/ethereum-optimism/optimism-tutorial/tree/main/cross-dom-bridge-eth
  const bridge = useCallback(async () => {
    try {
      setBridgeInProgress(true);
      // bridging 1 wei
      const response = await messenger.depositETH(1);
      setL1TxHash(response.hash);
      setL1TxStatus(TxStatus.Pending);
      await response.wait();
      setL1TxStatus(TxStatus.Confirmed);
      const l2Block = await messenger.l2Provider.getBlockNumber();
      const waitTime = await messenger.estimateMessageWaitTimeSeconds(
        response.hash,
        0,
        l2Block,
      );
      setEstimatedWaitTime(waitTime);
      setL2StartBlockNumber(l2Block);
      const l2Receipt = await messenger.waitForMessageReceipt(response.hash, {
        fromBlockOrBlockHash: l2Block,
      });
      setL2TxStatus(TxStatus.Confirmed);
      setL2TxHash(l2Receipt.transactionReceipt.transactionHash);
      setBridgeInProgress(false);
    } catch (e) {
      setBridgeInProgress(false);
      console.error(e);
    }
  }, [messenger]);

  // effect to poll for message status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const getMessageStatusAsync = async () => {
      if (!bridgeInProgress) return;
      try {
        const status = await messenger.getMessageStatus(
          l1TxHash,
          0,
          l2StartBlockNumber,
        );
        setMessageStatus(status);
      } catch (e) {
        console.error(e);
      }
    };

    if (l2StartBlockNumber && bridgeInProgress) {
      // Call immediately.
      getMessageStatusAsync();
      // Then every second.
      intervalId = setInterval(getMessageStatusAsync, 1000);
    } else {
      // Clear interval if bridge operation is not in progress.
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [l2StartBlockNumber, messenger, bridgeInProgress, l1TxHash]);

  // effect for timer
  useEffect(() => {
    let timerIntervalId: NodeJS.Timeout;

    if (
      bridgeInProgress &&
      l1TxStatus === TxStatus.Confirmed &&
      l2TxStatus !== TxStatus.Confirmed
    ) {
      timerIntervalId = setInterval(
        () => setElapsedTime((prev) => prev + 1),
        1000,
      );
    } else {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    }

    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [l1TxStatus, l2TxStatus, bridgeInProgress]);

  // solving an annoying hydration diff issue
  useEffect(() => {
    if (isConnected) {
      setShow(true);
    }
  }, [isConnected]);

  if (!show) {
    return <p className="text-sm">Connect to a wallet to get started</p>;
  }

  return (
    <div>
      <div className="flex flex-col items-center">
        {!l1TxHash && (
          <button
            disabled={bridgeInProgress}
            onClick={bridge}
            className="rounded-lg bg-blue-500 p-2 text-white mt-10"
          >
            bridge
          </button>
        )}
        {l1TxHash && (
          <TxInfo isL1={true} txHash={l1TxHash} txStatus={l1TxStatus} />
        )}
        {estimatedWaitTime > 0 && (
          <p>
            Waiting for L2. Estimated wait time: {estimatedWaitTime} seconds;
            Elapsed time: {elapsedTime} seconds
          </p>
        )}
        {messageStatus != null && (
          <p> L2 message status: {humanMessageStatus(messageStatus)} </p>
        )}
        {l2TxHash && (
          <TxInfo isL1={false} txHash={l2TxHash} txStatus={l2TxStatus} />
        )}
      </div>
    </div>
  );
}

function TxInfo({
  isL1,
  txHash,
  txStatus,
}: {
  isL1: boolean;
  txHash: string;
  txStatus: TxStatus;
}) {
  return (
    <div className="flex">
      <p>
        {" "}
        {isL1 ? "L1" : "L2"} tx{" "}
        {txStatus == TxStatus.Pending ? "pending..." : "confirmed!"}{" "}
      </p>
      <a
        href={`${isL1 ? L1_EXPLORER_URL : L2_EXPLORER_URL}/tx/${txHash}`}
        target="_blank"
        rel="noreferrer"
        className="pl-2 text-decoration:underline"
      >
        {" "}
        view transaction{" "}
      </a>
    </div>
  );
}

function humanMessageStatus(status: OP.MessageStatus) {
  switch (status) {
    case OP.MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE:
      return "UNCONFIRMED_L1_TO_L2_MESSAGE";
    case OP.MessageStatus.FAILED_L1_TO_L2_MESSAGE:
      return "FAILED_L1_TO_L2_MESSAGE";
    case OP.MessageStatus.STATE_ROOT_NOT_PUBLISHED:
      return "STATE_ROOT_NOT_PUBLISHED";
    case OP.MessageStatus.READY_TO_PROVE:
      return "READY_TO_PROVE";
    case OP.MessageStatus.IN_CHALLENGE_PERIOD:
      return "IN_CHALLENGE_PERIOD";
    case OP.MessageStatus.READY_FOR_RELAY:
      return "READY_FOR_RELAY";
    case OP.MessageStatus.RELAYED:
      return "RELAYED";
    default:
      return "UNKNOWN";
  }
}
