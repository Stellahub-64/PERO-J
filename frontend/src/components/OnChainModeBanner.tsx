import { useEffect, useState } from "react";
import { getApiMode, subscribeApiMode } from "../lib/api-client";

export default function OnChainModeBanner() {
  const [mode, setMode] = useState(getApiMode());

  useEffect(() => subscribeApiMode(setMode), []);

  if (mode !== "onchain") return null;

  return (
    <div className="onchain-banner" role="status">
      Operating in direct on-chain mode
    </div>
  );
}
