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

// =====================================================
// STELLAR TESTNET CONNECTION
// =====================================================

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

// =====================================================
// FREIGHTER CONNECTION
// =====================================================

const checkConnection = async () => {
  return await setAllowed();
};

// =====================================================
// GET PUBLIC KEY
// =====================================================

const retrievePublicKey = async () => {
  const addressData = await getPublicKey();

  // Freighter version compatibility:
  // Some versions return string, some return object.
  return typeof addressData === "object" ? addressData.address : addressData;
};

// =====================================================
// GET REAL XLM BALANCE
// =====================================================

const getBalance = async () => {
  await setAllowed();

  const addressData = await getPublicKey();

  const address =
    typeof addressData === "object" ? addressData.address : addressData;

  if (!address) {
    throw new Error("Wallet address could not be retrieved!");
  }

  const account = await server.loadAccount(address);

  const xlm = account.balances.find(
    (balance) => balance.asset_type === "native",
  );

  return xlm ? xlm.balance : "0";
};

// =====================================================
// SIGN TRANSACTION WITH FREIGHTER
// =====================================================

const userSignTransaction = async (xdr, signWith) => {
  try {
    const signed = await signTransaction(xdr, {
      network: "TESTNET",
      accountToSign: signWith,
    });

    // Some Freighter versions return:
    // { signedTxXdr: "..." }
    //
    // Older versions may return the XDR directly.
    return typeof signed === "object" && signed?.signedTxXdr
      ? signed.signedTxXdr
      : signed;
  } catch (error) {
    console.error("Freighter signing error:", error);
    throw error;
  }
};

// =====================================================
// SEND REAL XLM TRANSACTION
// =====================================================

const sendXlmTransaction = async (destination, amount) => {
  try {
    // -------------------------------------------------
    // GET ACTIVE FREIGHTER WALLET
    // -------------------------------------------------

    const addressData = await getPublicKey();

    const address =
      typeof addressData === "object" ? addressData.address : addressData;

    if (!address) {
      throw new Error("Wallet address could not be retrieved!");
    }

    // -------------------------------------------------
    // LOAD ACCOUNT FROM STELLAR TESTNET
    // -------------------------------------------------

    const account = await server.loadAccount(address);

    // -------------------------------------------------
    // BUILD TRANSACTION
    // -------------------------------------------------

    const transaction = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: Asset.native(),
          amount: String(amount),
        }),
      )
      .setTimeout(180)
      .build();

    const xdr = transaction.toXDR();

    // -------------------------------------------------
    // REQUEST FREIGHTER SIGNATURE
    // -------------------------------------------------

    const signedResult = await signTransaction(xdr, {
      network: "TESTNET",
      accountToSign: address,
    });

    const finalXdr =
      typeof signedResult === "object"
        ? signedResult?.signedTxXdr
        : signedResult;

    if (!finalXdr) {
      throw new Error("Freighter did not return a signed transaction.");
    }

    // -------------------------------------------------
    // SUBMIT TO STELLAR TESTNET
    // -------------------------------------------------

    const signedTransaction = TransactionBuilder.fromXDR(
      finalXdr,
      Networks.TESTNET,
    );

    const result = await server.submitTransaction(signedTransaction);

    console.log("✅ Stellar transaction successful:", result.hash);

    return {
      success: true,
      hash: result.hash,
    };
  } catch (error) {
    console.error(
      "🚫 Wallet signature was cancelled by the user or transaction failed.",
      error,
    );

    // -------------------------------------------------
    // HORIZON ERROR CODES
    // -------------------------------------------------

    const resultCodes = error?.response?.data?.extras?.result_codes;

    let errorMessage =
      error?.message || "The operation was cancelled or failed.";

    if (resultCodes?.operations?.includes("op_no_destination")) {
      errorMessage =
        "The recipient address is inactive/unfunded on Testnet. Please fund the account first!";
    } else if (resultCodes?.transaction === "tx_bad_auth") {
      errorMessage =
        "Transaction authorization failed. Please check your wallet settings.";
    } else if (resultCodes?.transaction === "tx_insufficient_balance") {
      errorMessage = "Insufficient balance to perform this transfer.";
    } else if (resultCodes?.transaction === "tx_bad_seq") {
      errorMessage =
        "Wallet sequence is temporarily out of sync. Please try again.";
    } else if (resultCodes?.operations?.includes("op_underfunded")) {
      errorMessage = "Insufficient XLM balance for this payment.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

// =====================================================
// FETCH STELLAR NETWORK FEE
// =====================================================

const fetchNetworkFee = async () => {
  try {
    const feeStats = await server.feeStats();

    const feeMode = Number(feeStats?.fee_charged?.mode) || 100;

    const baseFeeInXlm = (feeMode / 10_000_000).toFixed(7);

    const ledgerCapacity = parseFloat(feeStats?.ledger_capacity_usage) || 0;

    let congestion = "Low (⚡ Normal)";

    if (ledgerCapacity > 0.7) {
      congestion = "High (🔥 Intense)";
    } else if (ledgerCapacity > 0.4) {
      congestion = "Medium (⏳ Moderate)";
    }

    return {
      success: true,
      baseFee: baseFeeInXlm,
      status: congestion,
    };
  } catch (error) {
    console.error("Fee fetching error:", error);

    return {
      success: false,
      baseFee: "0.0000100",
      status: "Unknown",
    };
  }
};

// =====================================================
// EXPORTS
// =====================================================

export {
  checkConnection,
  retrievePublicKey,
  getBalance,
  userSignTransaction,
  sendXlmTransaction,
  fetchNetworkFee,
};
