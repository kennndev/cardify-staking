import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { loadProgram, PROGRAM_ID } from "../app/lib/idl-loader";
import { poolPda, signerPda } from "../app/lib/pda";

const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET = process.env.WALLET || ""; // base58 pubkey
const MINT = process.env.MINT || "";     // staking mint

class ReadonlyWallet {
  publicKey: PublicKey;
  constructor(pk: string) { this.publicKey = new PublicKey(pk); }
  async signTransaction(tx: any) { return tx; }
  async signAllTransactions(txs: any[]) { return txs; }
}

(async () => {
  console.log('🧪 Starting smoke test...');
  
  if (!WALLET || !MINT) {
    console.error('❌ Set WALLET and MINT envs');
    console.log('Usage: WALLET=<your_pubkey> MINT=<staking_mint> npm run smoke');
    process.exit(1);
  }
  
  try {
    const connection = new Connection(RPC, "confirmed");
    const provider = new AnchorProvider(connection, new ReadonlyWallet(WALLET) as any, { commitment: "confirmed" });
    const program = await loadProgram(provider);

    console.log('✅ Program loaded successfully');

    if (!program.idl.accounts?.some(a => a.name === "Pool")) {
      throw new Error("IDL missing 'Pool' account layout.");
    }

    console.log('✅ IDL has Pool account layout');

    const mint = new PublicKey(MINT);
    const pool = poolPda(PROGRAM_ID, mint);
    const signer = signerPda(PROGRAM_ID, pool);
    const stakingVault = await getAssociatedTokenAddress(mint, signer, true);

    console.log("Program:", program.programId.toBase58());
    console.log("Pool PDA:", pool.toBase58());
    console.log("Signer PDA:", signer.toBase58());
    console.log("Staking Vault:", stakingVault.toBase58());

    const info = await connection.getAccountInfo(pool);
    if (info) {
      const decoded = program.coder.accounts.decode("Pool", info.data);
      console.log("✅ Pool already exists -> decoded OK:", {
        admin: decoded.admin.toBase58(),
        stakingMint: decoded.stakingMint.toBase58(),
      });
    } else {
      console.log("ℹ️  Pool not found yet (this script is read-only). Your app's initialize will create it.");
    }

    console.log('✅ Smoke test passed - setup is clean!');
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    process.exit(1);
  }
})();
