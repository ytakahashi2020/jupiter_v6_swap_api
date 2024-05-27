import {
  Connection,
  Keypair,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import fetch from "cross-fetch";
import { Wallet } from "@coral-xyz/anchor";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

let connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

const wallet = new Wallet(
  Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || ""))
);

// Swapping SOL to USDC with input 0.001 SOL and 0.5% slippage
const quoteResponse = await (
  await fetch(
    "https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50"
  )
).json();

// console.log({ quoteResponse });

// get serialized transactions for the swap
const { swapTransaction } = await (
  await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // quoteResponse from /quote api
      quoteResponse,
      // user public key to be used for the swap
      userPublicKey: wallet.publicKey.toString(),
      // auto wrap and unwrap SOL. default is true
      wrapAndUnwrapSol: true,
      // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
      // feeAccount: "fee_account_public_key"
    }),
  })
).json();

console.log({ swapTransaction });

// deserialize the transaction
const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
console.log(transaction);

// sign the transaction
transaction.sign([wallet.payer]);

const latestBlockHash = await connection.getLatestBlockhash();
// // Execute the transaction
const rawTransaction = transaction.serialize();
const txid = await connection.sendRawTransaction(rawTransaction, {});

await connection.confirmTransaction({
  blockhash: latestBlockHash.blockhash,
  lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  signature: txid,
});
console.log(`https://solscan.io/tx/${txid}`);
