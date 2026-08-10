/* Soroban.js */

import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  TimeoutInfinite,
  rpc as StellarRpc,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

import { userSignTransaction } from "./Freighter";

/* ================= Config ================= */

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ADDRESS =
  "CDQUFGNQGT3CYQYNM4DUNZRLBARAXWNGJQW466OYZOODPHLXT2Z3AXMI";

const server = new StellarRpc.Server(RPC_URL);

const TX_PARAMS = {
  fee: BASE_FEE,
  networkPassphrase: NETWORK_PASSPHRASE,
};

/* ================= Contract Functions ================= */

export async function sendFeedback(caller, feedbackText) {
  try {
    const sourceAccount = await server.getAccount(caller);
    const contract = new Contract(CONTRACT_ADDRESS);

    const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);
    builder.setTimeout(TimeoutInfinite);

    const textString = String(feedbackText || "");

    // 💡 KRİTİK NOKTA 1: Native değer dönüştürülüyor
    const textScVal = nativeToScVal(textString);

    // 💡 KRİTİK NOKTA 2: Bad Union Switch hatasını engelleyen DİZİ (Array) kullanımı
    builder.addOperation(contract.call("create_feedback", textScVal));

    const tx = builder.build();
    const preparedTx = await server.prepareTransaction(tx);
    const xdrData = preparedTx.toXDR();

    const signed = await userSignTransaction(xdrData, caller);

    const finalSignedXdr =
      typeof signed === "object" && signed.signedTxXdr
        ? signed.signedTxXdr
        : signed;

    const send = await server.sendTransaction(
      typeof finalSignedXdr === "string"
        ? TransactionBuilder.fromXDR(finalSignedXdr, NETWORK_PASSPHRASE)
        : finalSignedXdr,
    );

    return send;
  } catch (error) {
    console.error("sendFeedback error:", error);
    throw error;
  }
}

export async function fetchFeedback(caller, id = 1) {
  try {
    const sourceAccount = await server.getAccount(caller);
    const contract = new Contract(CONTRACT_ADDRESS);

    const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);
    builder.setTimeout(TimeoutInfinite);

    const parsedId = Number(id) || 1;

    // 💡 KRİTİK NOKTA:
    // Contract tarafındaki feedback ID değeri u32 olarak bekleniyorsa
    // integer tipini açıkça belirtmemiz gerekir.
    const idScVal = nativeToScVal(parsedId, {
      type: "u32",
    });

    // 💡 Parametre dizi olarak gönderiliyor
    builder.addOperation(contract.call("fetch_feedback", idScVal));

    const tx = builder.build();

    console.log("Fetching feedback from Soroban contract. ID:", parsedId);

    const simulation = await server.simulateTransaction(tx);

    if (StellarRpc.Api.isSimulationSuccess(simulation)) {
      if (!simulation.result?.retval) {
        console.warn(
          "Feedback simulation succeeded but no return value was received.",
        );

        return null;
      }

      const result = scValToNative(simulation.result.retval);

      console.log("✅ Feedback simulation successful:", result);

      return result;
    }

    console.error("❌ Soroban fetch_feedback simulation failed:", simulation);

    throw new Error(simulation?.error || "Simulation failed");
  } catch (error) {
    console.error("fetchFeedback error:", error);

    throw error;
  }
}
