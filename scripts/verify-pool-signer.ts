// Quick verification script for pool-signer PDA
import { PublicKey } from "@solana/web3.js";
import { ENV } from "../app/config/env";

const PROGRAM_ID = new PublicKey(ENV.PROGRAM_ID);
const POOL_PDA = new PublicKey(ENV.POOL_PDA);

console.log("🔍 Verifying pool-signer PDA derivation...");
console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
console.log(`Pool PDA: ${POOL_PDA.toBase58()}`);

// Test the correct seed (with hyphen)
const [correctSigner, correctBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool-signer"), POOL_PDA.toBuffer()],
  PROGRAM_ID
);

console.log(`\n✅ Correct seed "pool-signer": ${correctSigner.toBase58()}`);
console.log(`Expected from error log: AbT6UH1bk6yjti5HhECyS8N9RQ2z5UFDoVtyNpSCdzdM`);
console.log(`Match: ${correctSigner.toBase58() === "AbT6UH1bk6yjti5HhECyS8N9RQ2z5UFDoVtyNpSCdzdM"}`);

// Test other seeds for comparison
const [wrongSigner1] = PublicKey.findProgramAddressSync(
  [Buffer.from("signer"), POOL_PDA.toBuffer()],
  PROGRAM_ID
);

const [wrongSigner2] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool_signer"), POOL_PDA.toBuffer()],
  PROGRAM_ID
);

console.log(`\n❌ Wrong seed "signer": ${wrongSigner1.toBase58()}`);
console.log(`❌ Wrong seed "pool_signer": ${wrongSigner2.toBase58()}`);

console.log(`\n🎯 The correct seed is "pool-signer" (with hyphen)!`);
