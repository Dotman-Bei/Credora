import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { DEPLOYED_ADDRESSES, LENDING_POOL_ABI } from "../../../../contracts/credoraAbis";

export const runtime = "nodejs";

type FulfillDemoLoanPayload = {
  borrower?: string;
  eligible?: boolean;
  rateBps?: number;
};

function getRpcUrl() {
  if (process.env.NEXT_PUBLIC_RPC_URL) {
    return process.env.NEXT_PUBLIC_RPC_URL;
  }

  if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    return `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
  }

  if (process.env.INFURA_API_KEY) {
    return `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;
  }

  return null;
}

function getRelayerAccount() {
  const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (privateKey) {
    const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    return privateKeyToAccount(normalized as `0x${string}`);
  }

  if (process.env.MNEMONIC) {
    return mnemonicToAccount(process.env.MNEMONIC);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as FulfillDemoLoanPayload;
    const borrower = payload.borrower as `0x${string}` | undefined;
    const eligible = payload.eligible;
    const rateBps = payload.rateBps;

    if (!borrower || typeof borrower !== "string") {
      return NextResponse.json({ error: "Missing borrower address." }, { status: 400 });
    }

    if (typeof eligible !== "boolean") {
      return NextResponse.json({ error: "Missing eligibility decision." }, { status: 400 });
    }

    if (typeof rateBps !== "number" || !Number.isFinite(rateBps)) {
      return NextResponse.json({ error: "Missing loan rate." }, { status: 400 });
    }

    if (![0, 500, 1200].includes(rateBps)) {
      return NextResponse.json({ error: "Unsupported demo rate." }, { status: 400 });
    }

    const rpcUrl = getRpcUrl();
    if (!rpcUrl) {
      return NextResponse.json(
        {
          error:
            "Missing RPC configuration. Set NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_ALCHEMY_API_KEY, or INFURA_API_KEY.",
        },
        { status: 500 }
      );
    }

    const account = getRelayerAccount();
    if (!account) {
      return NextResponse.json(
        {
          error:
            "Missing relayer credentials. Set RELAYER_PRIVATE_KEY, PRIVATE_KEY, or MNEMONIC for the demo relayer.",
        },
        { status: 500 }
      );
    }

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });

    const hash = await walletClient.writeContract({
      address: DEPLOYED_ADDRESSES.sepolia.LendingPool,
      abi: LENDING_POOL_ABI,
      functionName: "fulfillLoan",
      args: [borrower, eligible, BigInt(rateBps)],
      account,
      chain: sepolia,
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ hash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fulfill the demo loan request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}