import {
  isConnected,
  setAllowed,
  getPublicKey,
  signTransaction,
} from "@stellar/freighter-api";
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Asset,
  Operation,
} from "@stellar/stellar-sdk";

// Testnet server connection
const server = new Horizon.Server("https://horizon-testnet.stellar.org");

const checkConnection = async () => {
  return await setAllowed();
};

const retrievePublicKey = async () => {
  const address = await getPublicKey();
  return address;
};

const getBalance = async () => {
  await setAllowed();
  const address = await getPublicKey();
  const account = await server.loadAccount(address);
  const xlm = account.balances.find((b) => b.asset_type === "native");
  return xlm ? xlm.balance : "0";
};

// ================= BURASI DÜZELTİLDİ =================
// Soroban.js ile tam uyumlu hale getirildi. Parametre karmaşası ve network ismi çözüldü!
const userSignTransaction = async (xdr, signWith) => {
  try {
    const signed = await signTransaction(xdr, {
      network: "TESTNET",
      accountToSign: signWith,
    });
    // Eğer Freighter obje döndürürse signedTxXdr'ı al, string döndürürse direkt kendisini al
    return typeof signed === "object" && signed.signedTxXdr
      ? signed.signedTxXdr
      : signed;
  } catch (error) {
    console.error("Freighter signing error:", error);
    throw error;
  }
};
// =====================================================

const sendXlmTransaction = async (destination, amount) => {
  try {
    const addressData = await getPublicKey();
    const address =
      typeof addressData === "object" ? addressData.address : addressData;

    if (!address) throw new Error("Wallet address could not be retrieved!");

    const account = await server.loadAccount(address);

    const transaction = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: destination,
          asset: Asset.native(),
          amount: amount,
        }),
      )
      .setTimeout(180)
      .build();

    const xdr = transaction.toXDR();
    const signedXdr = await signTransaction(xdr, {
      network: "TESTNET",
      accountToSign: address,
    });

    const finalXdr =
      typeof signedXdr === "object" ? signedXdr.signedTxXdr : signedXdr;

    const result = await server.submitTransaction(
      TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET),
    );

    return { success: true, hash: result.hash };
  } catch (error) {
    console.error("Transfer error:", error);
    return {
      success: false,
      error: error.message || "The operation was cancelled or failed.",
    };
  }
};

const fetchNetworkFee = async () => {
  try {
    const feeStats = await server.feeStats();
    const baseFeeInXlm = (
      parseInt(feeStats.fee_charged.mode) / 10000000
    ).toFixed(5);

    const ledgerCapacity = parseFloat(feeStats.ledger_capacity_usage) || 0;
    let congestion = "Low (⚡ Normal)";
    if (ledgerCapacity > 0.7) congestion = "High (🔥 Intense)";
    else if (ledgerCapacity > 0.4) congestion = "Medium (⏳ Moderate)";

    return { success: true, baseFee: baseFeeInXlm, status: congestion };
  } catch (error) {
    console.error("Fee fetching error:", error);
    return { success: false, baseFee: "0.00010", status: "Unknown" };
  }
};

export {
  checkConnection,
  retrievePublicKey,
  getBalance,
  userSignTransaction,
  sendXlmTransaction,
  fetchNetworkFee,
};
