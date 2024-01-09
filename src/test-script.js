require('dotenv').config();

const anchor = require('@coral-xyz/anchor');
const { PublicKey, Connection, Keypair } = require('@solana/web3.js');

async function main() {
  const secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY_ARRAY));
  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(process.env.SOL_DEVNET, 'confirmed');
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const programId = new PublicKey('bidoyoucCtwvPJwmW4W9ysXWeesgvGxEYxkXmoXTaHy');
  const idl = await anchor.Program.fetchIdl(programId, provider);

  if (!idl) {
    console.error('Failed to fetch the IDL for the program:', programId.toString());
    return;
  }

  const program = new anchor.Program(idl, programId, provider);

  // Log the available accounts in the IDL to verify that 'yourAccount' exists
  console.log('Available accounts in IDL:', Object.keys(program.account));

  const accountAddress = new PublicKey('BfWifdR2DqWwvmBtRZubMHcjUHSHPz6kjknBqunWnpGr');
  
  // Replace 'yourAccount' with the actual account name from the IDL
  try {
    //const accountData = await program.account.nftBidding.fetch(accountAddress);
    const accountData = await program.account.nftBidding.all();
    console.log('Data from the account:', accountData);
  } catch (err) {
    console.error('Failed to fetch account data:', err);
  }
}

main().catch(err => {
  console.error('Error:', err);
});
