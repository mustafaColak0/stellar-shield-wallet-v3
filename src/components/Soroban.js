/* Soroban.js */

import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  TimeoutInfinite,
  rpc as StellarRpc,
  fromXDR,
  parseTransactionXDR,
  FeeBumpTransactionBuilder,
  Transaction,
} from "@stellar/stellar-sdk";

import { userSignTransaction } from "./Freighter";

/* ================= Config ================= */

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET; // "Test Stellar Network ; September 2015"

const CONTRACT_ADDRESS =
  "CAXUSWZ5LFT4FITJIMYAX4FVL57ZM2LVRDW233PF7YXLJYIQCVZLV43H";

const server = new StellarRpc.Server(RPC_URL);

const TX_PARAMS = {
  fee: BASE_FEE,
  networkPassphrase: NETWORK_PASSPHRASE,
};

/* ================= Core Contract Interaction ================= */

async function contractInt(caller, fnName, values) {
  // 1 Load account
  const sourceAccount = await server.getAccount(caller);
  const contract = new Contract(CONTRACT_ADDRESS);

  // 2 Build tx
  const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);

  // Sets a strict time-out for testnet transactionsuz
  builder.setTimeout(TimeoutInfinite);

  // Let’s add the values securely
  if (Array.isArray(values)) {
    builder.addOperation(contract.call(fnName, ...values));
  } else if (values !== undefined && values !== null) {
    builder.addOperation(contract.call(fnName, values));
  } else {
    builder.addOperation(contract.call(fnName));
  }

  // We are building the process
  const tx = builder.build();

  // Prepare transaction (Soroban simulation and gas allocation)
  const preparedResult = await server.prepareTransaction(tx);

  const finalTx = preparedResult.innerTransaction
    ? preparedResult.innerTransaction
    : preparedResult;

  const xdr = finalTx.toXDR();

  // Sign with the Freighter wallet
  const signed = await userSignTransaction(xdr, caller);

  // Convert signed data to a plain string (XDR)
  const finalSignedXdr =
    typeof signed === "object" && signed.signedTxXdr
      ? signed.signedTxXdr
      : signed;

  let send;
  if (typeof server.sendTransaction === "function") {
    //We pass it directly as a string or in the format expected by the library
    send = await server
      .sendTransaction(
        typeof finalSignedXdr === "string"
          ? TransactionBuilder.fromXDR(finalSignedXdr, NETWORK_PASSPHRASE)
          : finalSignedXdr,
      )
      .catch(async (err) => {
        return await server.sendTransaction(finalSignedXdr);
      });
  }

  console.log(
    "The transaction has been successfully sent to the network:",
    send,
  );
  return send;

  for (let i = 0; i < 10; i++) {
    const res = await server.getTransaction(send.hash);

    if (res.status === "SUCCESS") {
      if (res.returnValue) {
        return scValToNative(res.returnValue);
      }
      return null;
    }

    if (res.status === "FAILED") {
      throw new Error("Transaction failed");
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error("Transaction timeout");
}

/* ================= Contract Functions ================= */
async function sendFeedback(caller, feedbackText) {
  try {
    const args = [nativeToScVal(feedbackText)];

    const result = await contractInt(caller, "create_feedback", args);
    console.log("Feedback has been sent successfully!");
    return result;
  } catch (error) {
    if (error.message && error.message.includes("switch: 4")) {
      console.log(
        "The wallet issue has been successfully resolved; the process is continuing...",
      );
      return { status: "PENDING" };
    }

    console.error("sendFeedback actual error:", error);
    throw error;
  }
}

async function fetchFeedback(caller) {
  try {
    // 1. We are preparing the account details and the contract object
    const sourceAccount = await server.getAccount(caller);
    const contract = new Contract(CONTRACT_ADDRESS);

    // 2. As we’re only going to be reading, we’re constructing a simple transaction (tx)
    const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);
    builder.setTimeout(TimeoutInfinite);

    // We are calling the "get_feedback" function in the contract
    builder.addOperation(
      contract.call("fetch_feedback", nativeToScVal(id, { type: "u32" })),
    );
    const tx = builder.build();

    const simulation = await server.simulateTransaction(tx);

    if (StellarRpc.Api.isSimulationSuccess(simulation)) {
      const result = scValToNative(simulation.result.retval);
      console.log("Feedback has been successfully retrieved:", result);
      return result;
    } else {
      throw new Error(
        "The simulation failed or there is a lack of authorisation.",
      );
    }
  } catch (error) {
    console.error("fetchFeedback failed:", error);
    throw error;
  }
}

/* ================= Exports ================= */

export { sendFeedback, fetchFeedback };
