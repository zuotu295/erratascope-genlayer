import { abi, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { addressOK, sha } from "./protocol.js";
export const reader = createClient({ chain: studionet });
export const explorer = "https://explorer-studio.genlayer.com";
// Bundle the complete contract source for byte-for-byte deployment verification.
import bundledSource from "../contracts/errata_scope.py?raw";
export const source = bundledSource;
export async function verify(address) {
  if (!addressOK(address)) throw Error("Enter a valid contract address");
  const deployed = await reader.getContractCode(address);
  if ((await sha(deployed)) !== (await sha(source)))
    throw Error("Deployed contract source differs from this release");
  const protocol = await reader.readContract({
    address,
    functionName: "get_protocol",
    args: [],
    transactionHashVariant: "latest-final",
  });
  if (protocol !== "erratascope-1") throw Error("Unexpected contract protocol");
  return sha(source);
}
export function walletProvider() {
  const root =
    window.okxwallet?.ethereum || window.okxwallet || window.ethereum;
  return root?.providers?.find((p) => p.isOkxWallet) || root;
}
export async function connect() {
  const provider = walletProvider();
  if (!provider?.request)
    throw Error("Install an EIP-1193 browser wallet to sign on Studionet");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw Error("No wallet account selected");
  const chain = await provider.request({ method: "eth_chainId" });
  if (Number(chain) !== 61999)
    throw Error("Switch your wallet to Stable Studionet, chain ID 61999");
  return {
    owner: accounts[0].toLowerCase(),
    provider,
    client: createClient({ chain: studionet, account: accounts[0], provider }),
  };
}
export async function checkWallet(wallet) {
  if (!wallet) throw Error("Connect a Studionet wallet first");
  const [accounts, chain] = await Promise.all([
    wallet.provider.request({ method: "eth_accounts" }),
    wallet.provider.request({ method: "eth_chainId" }),
  ]);
  if (accounts[0]?.toLowerCase() !== wallet.owner || Number(chain) !== 61999)
    throw Error("Wallet account or network changed. Reconnect.");
}
export async function read(address, owner, id, revision) {
  if (!addressOK(address) || !addressOK(owner) || !id)
    throw Error("Enter a contract, owner and dossier ID");
  const [d, n] = await Promise.all([
    reader.readContract({
      address,
      functionName: "get_dossier",
      args: [owner, id],
      transactionHashVariant: "latest-final",
    }),
    reader.readContract({
      address,
      functionName: "get_revision",
      args: [owner, id],
      transactionHashVariant: "latest-final",
    }),
  ]);
  if (!d) throw Error("Dossier not found for this owner");
  const rev = revision ?? Number(n);
  const raw = rev
    ? await reader.readContract({
        address,
        functionName: "get_review",
        args: [owner, id, rev],
        transactionHashVariant: "latest-final",
      })
    : "";
  if (rev && !raw) throw Error("Review not found");
  return {
    dossier: JSON.parse(d),
    review: raw ? JSON.parse(raw) : null,
    revision: Number(n),
  };
}
export async function transaction(hash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
    throw Error("Invalid transaction hash");
  return reader.request({ method: "eth_getTransactionByHash", params: [hash] });
}

export function receiptCall(tx) {
  const raw = tx.data?.calldata;
  if (typeof raw !== "string")
    throw Error("Receipt calldata missing; inspect the receipt");
  const decoded = abi.calldata.decode(
    Uint8Array.from(atob(raw), (x) => x.charCodeAt(0)),
  );
  if (!(decoded instanceof Map)) throw Error("Unexpected receipt calldata");
  return {
    method: decoded.get("method"),
    args: (decoded.get("args") || []).map((x) =>
      typeof x === "bigint" ? Number(x) : x,
    ),
  };
}
