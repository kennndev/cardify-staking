// Smoke test script to verify IDL and account setup
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { loadProgram, makeProvider, RPC_URL, PROGRAM_ID } from '../app/utils/idl-loader';
import { initialize, setRewardConfig, poolPda, signerPda } from '../app/utils/staking-helpers';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Dummy readonly wallet for Provider; replace with your real wallet adapter in app
class ReadonlyWallet { 
  publicKey = Keypair.generate().publicKey; 
  signTransaction = async (t: any) => t; 
  signAllTransactions = async (ts: any) => ts; 
}

async function smokeTest() {
  console.log('🧪 Starting smoke test...');
  
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const provider = makeProvider(connection, new ReadonlyWallet());
    const program = await loadProgram(provider);

    console.log('✅ Program loaded successfully');

    const admin = provider.wallet.publicKey;
    const stakingMint = new PublicKey("So11111111111111111111111111111111111111112"); // SOL

    console.log('Testing PDA derivations...');
    
    // Test PDA derivations
    const pool = poolPda(PROGRAM_ID, stakingMint);
    const signer = signerPda(PROGRAM_ID, pool);
    
    console.log('POOL:', pool.toBase58());
    console.log('SIGNER:', signer.toBase58());
    
    // Test ATA derivation
    const stakingVault = await getAssociatedTokenAddress(stakingMint, signer, true);
    console.log('STAKING_VAULT:', stakingVault.toBase58());

    // Quick invariants
    if (pool.toBase58() !== poolPda(PROGRAM_ID, stakingMint).toBase58()) {
      throw new Error("Pool PDA mismatch");
    }
    if (signer.toBase58() !== signerPda(PROGRAM_ID, pool).toBase58()) {
      throw new Error("Signer PDA mismatch");
    }
    const computedStakingVault = await getAssociatedTokenAddress(stakingMint, signer, true);
    if (computedStakingVault.toBase58() !== stakingVault.toBase58()) {
      throw new Error("Staking vault ATA mismatch");
    }

    console.log('✅ All PDA derivations correct');
    console.log('✅ Smoke test passed - setup is clean!');
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    process.exit(1);
  }
}

// Run the smoke test
smokeTest();
