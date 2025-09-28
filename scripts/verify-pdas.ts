#!/usr/bin/env ts-node

import { PublicKey } from "@solana/web3.js";

/**
 * Verify PDA derivations match the deployed program
 * Run this before initializing to ensure compatibility
 */

const PROGRAM_ID = new PublicKey("64vdAWZhKCV3fbmWGrZ6QtJG8c3wGEaQThqxV5xxNmCo");

// Test with your staking mint
const STAKING_MINT = new PublicKey("2VkcySsgoVMitU7wo81qqGD1QBPX1Bi3ziPVvQXwyMGY");

console.log("🔍 Verifying PDA derivations...");
console.log("Program ID:", PROGRAM_ID.toBase58());
console.log("Staking Mint:", STAKING_MINT.toBase58());
console.log("");

// Derive pool PDA
const [poolPDA, poolBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool"), STAKING_MINT.toBuffer()],
  PROGRAM_ID
);

console.log("📦 Pool PDA:", poolPDA.toBase58());
console.log("📦 Pool Bump:", poolBump);

// Derive signer PDA (using the OLD seed that matches deployed program)
const [signerPDA, signerBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("signer"), poolPDA.toBuffer()],
  PROGRAM_ID
);

console.log("🔑 Signer PDA (old seed 'signer'):", signerPDA.toBase58());
console.log("🔑 Signer Bump:", signerBump);

// Also show what the NEW seed would produce (for comparison)
const [newSignerPDA, newSignerBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool-signer"), poolPDA.toBuffer()],
  PROGRAM_ID
);

console.log("🔑 Signer PDA (new seed 'pool-signer'):", newSignerPDA.toBase58());
console.log("🔑 New Signer Bump:", newSignerBump);

console.log("");
console.log("✅ Use the OLD seed ('signer') to match the deployed program");
console.log("⚠️  The deployed program expects:", signerPDA.toBase58());
console.log("❌  The new seed would produce:", newSignerPDA.toBase58());

// Verify they're different
if (signerPDA.equals(newSignerPDA)) {
  console.log("🤔 Both seeds produce the same PDA - this shouldn't happen");
} else {
  console.log("✅ Confirmed: Old and new seeds produce different PDAs");
  console.log("💡 This explains the ConstraintSeeds error - client and program use different seeds");
}
