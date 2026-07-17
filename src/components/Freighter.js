import { isConnected, setAllowed, getPublicKey, signTransaction } from '@stellar/freighter-api';
import { Horizon, TransactionBuilder, Networks, Asset, Operation } from '@stellar/stellar-sdk';

// Testnet server connection
const server = new Horizon.Server('https://horizon-testnet.stellar.org');

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
    const xlm = account.balances.find((b) => b.asset_type === 'native');
    return xlm ? xlm.balance : "0"; 
};

const userSignTransaction = async (xdr, network, signWith) => {
    return await signTransaction(xdr, { 
        network, 
        accountToSign: signWith 
    });
};

const sendXlmTransaction = async (destination, amount) => {
    try {
        // Guaranteed address retrieval method
        const addressData = await getPublicKey();
        const address = typeof addressData === 'object' ? addressData.address : addressData; 
        
        if (!address) throw new Error("Wallet address could not be retrieved!");

        const account = await server.loadAccount(address);
        
        const transaction = new TransactionBuilder(account, {
            fee: '10000', // 0.001 XLM fee
            networkPassphrase: Networks.TESTNET,
        })
        .addOperation(
            Operation.payment({
                destination: destination,
                asset: Asset.native(),
                amount: amount, 
            })
        )
        .setTimeout(180)
        .build();

        const xdr = transaction.toXDR();
        const signedXdr = await signTransaction(xdr, {
            network: 'TESTNET',
            accountToSign: address
        });

        // Extract the xdr field if signedXdr is an object
        const finalXdr = typeof signedXdr === 'object' ? signedXdr.signedTxXdr : signedXdr;

        const result = await server.submitTransaction(
            TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET)
        );
        
        return { success: true, hash: result.hash };
    } catch (error) {
        console.error("Transfer error:", error);
        return { success: false, error: error.message || "The operation was cancelled or failed." };
    }
};

// Function fetching real-time network fee stats
const fetchNetworkFee = async () => {
    try {
        const feeStats = await server.feeStats();
        // feeStats.fee_charged.mode returns the most common current network fee in stroops
        // 1 XLM = 10,000,000 Stroops. Converting to XLM.    
        const baseFeeInXlm = (parseInt(feeStats.fee_charged.mode) / 10000000).toFixed(5);
        
        // Estimate network congestion based on transaction throughput
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
export { checkConnection, retrievePublicKey, getBalance, userSignTransaction, sendXlmTransaction, fetchNetworkFee };

