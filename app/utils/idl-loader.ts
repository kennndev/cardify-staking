// IDL loader that prefers on-chain IDL and falls back to local
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

// Provide these from env/config
export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
export const PROGRAM_ID = new PublicKey("8eY8x8TAAHkFsN9w42Z85PqBr5kkJRGTyQKQA1qP2WvJ");

// 1) Try to fetch IDL from chain. 2) else require local file.
export async function loadProgram(provider: AnchorProvider): Promise<Program> {
  let idl: Idl | null = null;
  try {
    console.log('Attempting to fetch IDL from chain...');
    idl = await Program.fetchIdl(PROGRAM_ID, provider);
    console.log('✅ IDL fetched from chain successfully');
  } catch (error) {
    console.log('❌ Failed to fetch IDL from chain:', error);
  }
  
  if (!idl) {
    console.log('Falling back to local IDL...');
    // falls back to local IDL exactly as compiled
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    idl = require("../idl/simple_staking.json");
    console.log('✅ Local IDL loaded successfully');
  }
  
  // Optional: assert the IDL really refers to our program id
  const idlAddr = (idl as any).address;
  if (idlAddr && idlAddr !== PROGRAM_ID.toBase58()) {
    throw new Error(`IDL.address (${idlAddr}) !== PROGRAM_ID (${PROGRAM_ID.toBase58()})`);
  }
  
  console.log('Creating program with IDL:', {
    version: idl.version,
    name: idl.name,
    address: idl.address,
    instructionsCount: idl.instructions?.length || 0,
    accountsCount: idl.accounts?.length || 0,
    typesCount: idl.types?.length || 0
  });
  
  return new Program(idl as Idl, PROGRAM_ID, provider);
}

export function makeProvider(connection: Connection, wallet: any) {
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}
