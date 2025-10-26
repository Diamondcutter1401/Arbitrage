import { WalletClient, Hex } from "viem";
import fetch from "node-fetch";

export async function sendPrivateOrPublicTx(
  signedRaw: Hex,
  privateRpcUrl?: string,
  walletClient?: WalletClient
): Promise<string> {
  if (privateRpcUrl) {
    try {
      const response = await fetch(privateRpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_sendPrivateTransaction",
          params: [{ tx: signedRaw }]
        })
      });

      const json = await response.json() as any;
      if (json.result) {
        return json.result as string;
      }
    } catch (error) {
      console.warn("Private transaction failed, falling back to public:", error);
    }
  }

  // Fallback to public transaction
  if (!walletClient) {
    throw new Error("No wallet client available for public transaction");
  }

  return await walletClient.sendRawTransaction({ 
    serializedTransaction: signedRaw 
  });
}
