import { PublicKey } from "@solana/web3.js";

/** Coerce any base58 string or PublicKey into a PublicKey */
export const pk = (x: string | PublicKey): PublicKey =>
  x instanceof PublicKey ? x : new PublicKey(x);

/** pool = PDA("pool", staking_mint) */
export function poolPda(programId: string | PublicKey, stakingMint: string | PublicKey): PublicKey {
  const pid = pk(programId);
  const mint = pk(stakingMint);
  return PublicKey.findProgramAddressSync([Buffer.from("pool"), mint.toBuffer()], pid)[0];
}

/** signer = PDA("signer", pool) */
export function signerPda(programId: string | PublicKey, pool: string | PublicKey): PublicKey {
  const pid = pk(programId);
  const poolPk = pk(pool);
  return PublicKey.findProgramAddressSync([Buffer.from("signer"), poolPk.toBuffer()], pid)[0];
}

/** user = PDA("user", pool, owner) */
export function userPda(
  programId: string | PublicKey,
  pool: string | PublicKey,
  owner: string | PublicKey
): PublicKey {
  const pid = pk(programId);
  const poolPk = pk(pool);
  const ownerPk = pk(owner);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user"), poolPk.toBuffer(), ownerPk.toBuffer()],
    pid
  )[0];
}
