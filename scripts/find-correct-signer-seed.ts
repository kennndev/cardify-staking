import { PublicKey } from "@solana/web3.js";
import { ENV } from "../app/config/env";

/**
 * Find the correct signer PDA seed by testing different possibilities
 */

const PROGRAM_ID = new PublicKey(ENV.PROGRAM_ID);
const POOL_PDA = new PublicKey(ENV.POOL_PDA);

// Expected signer PDA from the error
const EXPECTED_SIGNER = new PublicKey("HN86Jnr8yBrd5ArUV3Rtgb4eXfNhpMGpy7gghgN7wJZa");

console.log("🔍 Testing different signer PDA seeds...");
console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
console.log(`Pool PDA: ${POOL_PDA.toBase58()}`);
console.log(`Expected Signer: ${EXPECTED_SIGNER.toBase58()}`);

// Test different possible seeds
const possibleSeeds = [
  "signer",
  "pool-signer", 
  "pool_signer",
  "signer_pool",
  "authority",
  "pool_authority",
  "admin",
  "pool_admin"
];

console.log("\n--- Testing Different Seeds ---");

for (const seed of possibleSeeds) {
  try {
    const [derivedPDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(seed), POOL_PDA.toBuffer()],
      PROGRAM_ID
    );
    
    const matches = derivedPDA.equals(EXPECTED_SIGNER);
    console.log(`${matches ? "✅" : "❌"} Seed "${seed}": ${derivedPDA.toBase58()} ${matches ? "(MATCH!)" : ""}`);
    
    if (matches) {
      console.log(`🎯 FOUND CORRECT SEED: "${seed}"`);
      console.log(`🔧 Update your pda.ts signerPda function to use: Buffer.from("${seed}")`);
    }
  } catch (error) {
    console.log(`❌ Seed "${seed}": Error - ${error}`);
  }
}

// Also test with different order
console.log("\n--- Testing Different Order ---");
try {
  const [derivedPDA, bump] = PublicKey.findProgramAddressSync(
    [POOL_PDA.toBuffer(), Buffer.from("signer")],
    PROGRAM_ID
  );
  
  const matches = derivedPDA.equals(EXPECTED_SIGNER);
  console.log(`${matches ? "✅" : "❌"} Order [pool, "signer"]: ${derivedPDA.toBase58()} ${matches ? "(MATCH!)" : ""}`);
} catch (error) {
  console.log(`❌ Order [pool, "signer"]: Error - ${error}`);
}
