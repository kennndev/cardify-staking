import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { loadProgram, PROGRAM_ID } from "./idl-loader";
import { pk, poolPda, signerPda } from "./pda";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

/**
 * Initialize only.
 * @param stakingMintStr base58 staking mint address (string)
 * @param wallet object with publicKey, signTransaction, signAllTransactions
 */
export async function initializeOnly(stakingMintStr: string, wallet: any) {
  console.log("initializeOnly called with:", {
    stakingMintStr,
    walletPk: wallet?.publicKey?.toString?.(),
  });

  // Build provider with guaranteed PublicKey
  const connection = new Connection(RPC_URL, "confirmed");
  const anchorWallet = {
    publicKey: pk(wallet.publicKey),
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  } as any;
  const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });

  console.log("Loading program...");
  const program = await loadProgram(provider);
  console.log("✅ Program loaded successfully");

  // Coerce inputs to PublicKey
  const stakingMint = pk(stakingMintStr);

  // Derive PDAs (using PublicKeys, never strings)
  const pool = poolPda(program.programId, stakingMint);
  const signer = signerPda(program.programId, pool);

  // ATA owned by the signer PDA (allowOwnerOffCurve = true)
  const stakingVault = await getAssociatedTokenAddress(stakingMint, signer, true);

  // Sanity guards
  if (pool.equals(stakingMint)) {
    throw new Error("Pool PDA equals staking mint. Check PDA seeds.");
  }

  console.log("Initializing pool with accounts:", {
    admin: provider.wallet.publicKey.toBase58(),
    stakingMint: stakingMint.toBase58(),
    pool: pool.toBase58(),
    signer: signer.toBase58(),
    stakingVault: stakingVault.toBase58(),
  });

  // Debug: Check what 3rZrGaXZ4p3sFsgVkzj4ygk4KVKHppNkqutPuEUo6cad corresponds to
  console.log("Debugging account addresses:");
  console.log("Admin:", provider.wallet.publicKey.toBase58());
  console.log("Pool:", pool.toBase58());
  console.log("Signer:", signer.toBase58());
  console.log("StakingVault:", stakingVault.toBase58());
  console.log("StakingMint:", stakingMint.toBase58());

  // Check if the pool already exists
  try {
    const poolInfo = await connection.getAccountInfo(pool);
    if (poolInfo) {
      console.log("⚠️ Pool already exists! Cannot initialize again.");
      throw new Error("Pool already exists. Cannot initialize again.");
    } else {
      console.log("✅ Pool doesn't exist yet (good for initialization)");
    }
  } catch (err) {
    console.log("✅ Pool doesn't exist yet (good for initialization)");
  }

  // Check if the stakingVault already exists
  try {
    const vaultInfo = await connection.getAccountInfo(stakingVault);
    if (vaultInfo) {
      console.log("⚠️ Staking vault already exists, this might cause issues");
    } else {
      console.log("✅ Staking vault doesn't exist yet (good for initialization)");
    }
  } catch (err) {
    console.log("✅ Staking vault doesn't exist yet (good for initialization)");
  }

  try {
    // Let the program create the ATA itself
    console.log("Calling initialize (program will create ATA)...");
    await program.methods
      .initialize()
      .accounts({
        admin: provider.wallet.publicKey,
        stakingMint,
        pool,            // PDA (will be created by program)
        signer,          // PDA (no creation; just used as authority)
        stakingVault,    // ATA (will be created by program)
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  } catch (txError) {
    console.error("❌ Transaction failed:", txError);
    console.error("Error message:", txError.message);
    if (txError.logs) {
      console.error("Transaction logs:", txError.logs);
    }
    if (txError.simulationResponse) {
      console.error("Simulation response:", txError.simulationResponse);
    }
    throw txError;
  }

  console.log("✅ Pool initialized");

  const acc: any = await (program.account as any).pool.fetch(pool);
  const out = {
    pool: pool.toBase58(),
    signer: signer.toBase58(),
    stakingVault: stakingVault.toBase58(),
    admin: acc.admin.toBase58(),
    stakingMint: acc.stakingMint.toBase58(),
    totalStaked: acc.totalStaked.toString?.() ?? String(acc.totalStaked),
    ratePerSec: acc.ratePerSec.toString?.() ?? String(acc.ratePerSec),
  };
  console.log("Initialized Pool state:", out);
  return out;
}
