import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { pk } from "./pda";
import { normalizeIdlTypes } from "../utils/idl-normalize";
import idlData from '../idl/simple_staking.json';

// Program ID as a PublicKey
export const PROGRAM_ID: PublicKey = pk(
  process.env.NEXT_PUBLIC_PROGRAM_ID || ""
);

export async function loadProgram(provider: AnchorProvider) {
  console.log("Loading local IDL…");
  const idl = idlData as Idl;
  console.log("✅ Local IDL loaded");

  // Debug IDL structure
  console.log("IDL structure:", {
    version: idl?.version,
    name: idl?.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    address: (idl as any)?.address,
    hasInstructions: !!idl?.instructions,
    hasAccounts: !!idl?.accounts,
    hasTypes: !!idl?.types
  });

  // Optional check: does the IDL have a declared address?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idlAddr = (idl as any)?.address;
  if (idlAddr && idlAddr !== PROGRAM_ID.toBase58()) {
    console.warn(`IDL.address (${idlAddr}) !== PROGRAM_ID (${PROGRAM_ID.toBase58()})`);
    // Don't throw, just warn - the program might still work
  }

  try {
    console.log("Creating Program instance with Anchor 0.29.0 constructor...");
    // Use the older constructor signature: new Program(idl, programId, provider)
    const program = new Program(idl as Idl, PROGRAM_ID, provider);
    console.log("✅ Program created successfully");
    return program;
  } catch (error) {
    console.error("❌ Failed to create Program:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    
    // Try with normalized IDL as fallback
    console.log("Trying with normalized IDL...");
    try {
      const normalizedIdl = normalizeIdlTypes(idl);
      const program = new Program(normalizedIdl as Idl, PROGRAM_ID, provider);
      console.log("✅ Program created with normalized IDL");
      return program;
    } catch (normalizedError) {
      console.error("❌ Normalized IDL also failed:", normalizedError);  
      throw new Error(`Failed to create Program: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
