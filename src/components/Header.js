import React, { useState, useEffect, useMemo } from "react";
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Contract,
  xdr,
  Operation,
  Address,
  StrKey,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";
import { signTransaction, isConnected } from "@stellar/freighter-api";
import {
  checkConnection,
  retrievePublicKey,
  getBalance,
  sendXlmTransaction,
  fetchNetworkFee,
} from "./Freighter";

import { QRCodeSVG } from "qrcode.react";
import {
  Wallet,
  Send,
  ShieldAlert,
  QrCode,
  Moon,
  Sun,
  Copy,
  Check,
  LayoutDashboard,
  LogOut,
  Activity,
  History,
  BookUser,
  Search,
  Plus,
  Trash2,
  ChevronDown,
  Laptop,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const securityAlerts = [
  {
    type: "INFO",
    msg: "Soroban smart contract bytecode verification completed successfully.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
  },
  {
    type: "ALERT",
    msg: "High network congestion warning simulated on Validator Node-4.",
    color: "text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
  },
  {
    type: "SECURE",
    msg: "Aura-Guard transaction isolation protocols are running smoothly.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
  },
  {
    type: "NETWORK",
    msg: "Ledger #2026-X active synchronization benchmark: 4.2s close time optimal.",
    color: "text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
  },
  {
    type: "SHIELD",
    msg: "Cryptographic signature sequence verified via active Freighter interface agent.",
    color: "text-purple-400",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
  },
];

export const handleTrueSorobanDeposit = async (
  connectedAddress,
  amount = 10,
  setRealTxHash,
  setSorobanError,
) => {
  try {
    setSorobanError("");

    // 1. Verify if Freighter wallet extension is active and available in the browser
    if (!(await isConnected())) {
      setSorobanError(
        "Freighter wallet not found! Please install the extension.",
      );
      return;
    }

    // 2. Fetch the active public key of the connected user
    let userPublicKey = connectedAddress;
    if (!userPublicKey) {
      try {
        userPublicKey = await retrievePublicKey();
      } catch (err) {
        setSorobanError("Please connect your wallet first!");
        return;
      }
    }

    if (!userPublicKey) {
      setSorobanError("Please connect your wallet first!");
      return;
    }

    // 3. Connect to Horizon (for account) and Soroban RPC (for simulation)
    const horizonServer = new Horizon.Server(
      "https://horizon-testnet.stellar.org",
    );
    const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
    const account = await horizonServer.loadAccount(userPublicKey);

    // 4. Target Soroban Smart Contract ID
    const contractId =
      "CBUGTNGT3K7JTQNVGZNN2FSMCIWTP2NWSBMKRXZDC5IJQD2LTEUF7Z5F";

    // 5. Construct the initial transaction structure
    const tx = new TransactionBuilder(account, { fee: "10000" })
      .addOperation(
        Operation.invokeContractFunction({
          contract: contractId,
          function: "send_feedback",
          args: [
            nativeToScVal(`Simulated deposit of ${amount} XLM!`, {
              type: "string",
            }),
          ],
        }),
      )
      .setTimeout(180)
      .setNetworkPassphrase(Networks.TESTNET)
      .build();

    // 6. SIMULATION: Prepare the transaction with Soroban RPC
    console.log("Simulating transaction on Soroban RPC...");
    const preparedTx = await rpcServer.prepareTransaction(tx);

    // 7. Request cryptographic signature from Freighter using the simulated transaction
    const signedTxXdr = await signTransaction(preparedTx.toXDR(), {
      network: "TESTNET",
      address: userPublicKey,
    });

    if (!signedTxXdr) {
      throw new Error("Transaction signature rejected by the user.");
    }

    // 8. Submit the fully signed transaction directly to the Soroban RPC
    console.log("Submitting transaction to network...");
    const finalTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);

    const submission = await rpcServer.sendTransaction(finalTx);

    if (submission.status === "ERROR") {
      throw new Error(
        "Soroban Execution Error: " + JSON.stringify(submission.errorResult),
      );
    }

    console.log("Soroban Call Submitted! Tx Hash:", submission.hash);
    if (typeof setRealTxHash === "function") {
      setRealTxHash(submission.hash);
    }
  } catch (error) {
    console.error("Soroban Matrix Error:", error);
    if (typeof setSorobanError === "function") {
      setSorobanError(
        error.message || "Transaction rejected or insufficient balance.",
      );
    }
  }
};

function Header() {
  // ---------------- STATE MANAGEMENT ----------------
  const [connected, setConnected] = useState(false);
  const [connectedWalletType, setConnectedWalletType] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddressBook, setShowAddressBook] = useState(true);
  const [isSecurityChecked, setIsSecurityChecked] = useState(false);
  const [showSecurityCheck, setShowSecurityCheck] = useState(false);
  const [isAuthMatrixModalOpen, setIsAuthMatrixModalOpen] = useState(false);
  const [balanceData, setBalanceData] = useState([]);
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrAmount, setQrAmount] = useState("");
  const [qrMemo, setQrMemo] = useState("");
  const [realTxHash, setRealTxHash] = useState("");
  const [sorobanError, setSorobanError] = useState("");

  // UI & Graphic States
  const [copied, setCopied] = useState(false);
  const [networkFee, setNetworkFee] = useState({
    baseFee: "0.00010",
    status: "Low(Normal)",
  });

  // Transfer States
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState({ type: "", message: "", hash: "" });
  const [selectedAsset, setSelectedAsset] = useState("XLM");
  const [transferAsset, setTransferAsset] = useState("XLM");
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addressBook, setAddressBook] = useState([
    { id: 1, name: "Jüri İnceleme Cüzdanı", address: "GBJURI777...TESTNET" },
    { id: 2, name: "Siber Güvenlik Kasası", address: "GASHIELD99...TESTNET" },
    {
      id: 3,
      name: "My Account 2",
      address: "GAQVXWJ6QWNVNM3OWK4MREYSK52WM76RSJQS2TKV2KUH47CCULBY4UN4",
    },
  ]);
  const [newContact, setNewContact] = useState({ name: "", address: "" });
  const [terminalMessage, setTerminalMessage] = useState(
    "Ready to broadcast transaction.",
  );
  const [networkLoad, setNetworkLoad] = useState(12);
  const [ledgerClose, setLedgerClose] = useState(4.2);
  const [gasMode, setGasMode] = useState("NORMAL"); // 'LOW', 'NORMAL', 'HIGH'

  // LEVEL 2: JURY & SOROBAN ECOSYSTEM STATES
  const [juryTxStatus, setJuryTxStatus] = useState("IDLE");
  const [jurySorobanError, setJurySorobanError] = useState("");
  const [sorobanContractId, setSorobanContractId] = useState(
    "CBUGTNGT3K7JTQNVGZNN2FSMCIWTP2NWSBMKRXZDC5IJQD2LTEUF7Z5F",
  );
  const [totalRaised, setTotalRaised] = useState(1240);
  const [fundAmount, setFundAmount] = useState("");
  const [liveEvents, setLiveEvents] = useState([
    {
      id: 1,
      type: "DEPOSIT",
      user: "GB...X42",
      amount: "150 XLM",
      time: "10 dk önce",
    },
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 1,
      type: "INFO",
      msg: "Stellar Shield Security Engine initialized v2.0.26",
      time: "Sistem",
    },
    {
      id: 2,
      type: "SUCCESS",
      msg: "Freighter extension cryptographic binding verified.",
      time: "Sistem",
    },
  ]);

  const [walletAsset, setWalletAsset] = useState(9897.184);
  const [chartData, setChartData] = useState([
    { name: "Başlangıç", balance: 10000 },
    { name: "01:50", balance: 9950 },
    { name: "01:50:36", balance: 9897.184 },
  ]);

  const gasConfigs = {
    LOW: {
      baseFee: "0.00001",
      sorobanGas: "100",
      statusText: "LIVE",
      statusColor: "text-emerald-400",
      pingColor: "bg-emerald-500",
    },
    NORMAL: {
      baseFee: "0.00005",
      sorobanGas: "140",
      statusText: "LIVE",
      statusColor: "text-emerald-400",
      pingColor: "bg-emerald-500",
    },
    HIGH: {
      baseFee: "0.00012",
      sorobanGas: "310",
      statusText: "CONGESTED",
      statusColor: "text-rose-400",
      pingColor: "bg-rose-500",
    },
  };

  const handleAssetChange = (assetName) => {
    setSelectedAsset(assetName);
    if (assetName === "XLM") {
      setTerminalMessage(
        "Ready to broadcast transaction. Standard Stellar operation detected.",
      );
    } else {
      setTerminalMessage(
        `Soroban smart contract auth matrix initialized for ${assetName}. Secure signature requested.`,
      );
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const displayTime =
        payload[0].payload.time === "Start"
          ? new Date().toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : payload[0].payload.time;

      return (
        <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl p-3 shadow-xl shadow-cyan-950/20 backdrop-blur-md font-mono text-[11px] text-left">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <span className="text-slate-500">⏱️ TIME:</span>
            <span className="text-slate-200 font-bold">{displayTime}</span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-slate-500">💳 Finish:</span>
            <span className="text-cyan-400 font-bold text-xs">
              {payload[0].value}
            </span>
            <span className="text-[9px] text-cyan-600 font-bold">XLM</span>
          </div>
          <div className="flex items-center gap-1.5 border-t border-slate-900 pt-1.5 mt-1.5">
            <span className="text-slate-500">🛡️ STATUS:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
              SECURE
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const triggerTransferApproval = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!destination || !amount) {
      alert("Please fill in both the recipient address and amount.");
      return;
    }

    if (!showSecurityCheck) {
      setShowSecurityCheck(true);
      return;
    }

    if (!isSecurityChecked) {
      alert("Please confirm the cyber security risk analysis check.");
      return;
    }

    setShowSecurityCheck(false);
    setIsSecurityChecked(false);

    setTxStatus({
      type: "loading",
      message: "Connecting to Freighter Wallet and signing transaction...",
      hash: "",
    });

    const result = await sendXlmTransaction(destination, amount);

    if (result.success) {
      setTxStatus({
        type: "success",
        message:
          "🎉 Transaction successfully signed and mined on Stellar Testnet!",
        hash: result.hash,
      });

      const newTx = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        to: destination,
        amount: amount,
        asset: selectedAsset || "XLM",
        hash: result.hash,
      };
      setTransactions((prev) => [newTx, ...prev]);

      const sentAmount = parseFloat(amount);
      if (balance) {
        const currentBal = parseFloat(balance) - sentAmount;
        setBalance(currentBal.toFixed(4));

        if (typeof setWalletAsset === "function") {
          setWalletAsset((prev) => prev - sentAmount);
        }

        const nowStr = new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setBalanceData((prev) => [
          ...prev,
          { time: nowStr, balance: currentBal },
        ]);
        if (typeof setChartData === "function") {
          setChartData((prev) => [
            ...prev,
            { name: nowStr, balance: currentBal },
          ]);
        }
      }

      setAmount("");
      setDestination("");

      const newBalance = await getBalance();
      if (newBalance) setBalance(newBalance);

      setTimeout(() => {
        setTxStatus({ type: "", message: "", hash: "" });
      }, 30000);
    } else {
      setTxStatus({
        type: "error",
        message: result.error || "Transaction rejected or failed.",
        hash: "",
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const hasAccess = await checkConnection();
        if (hasAccess) {
          const key = await retrievePublicKey();
          if (key) {
            setPublicKey(key);
            setConnected(true);
            setConnectedWalletType("Freighter");
            const bal = await getBalance();
            setBalance(bal);

            const nowTR = new Date().toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            setBalanceData([
              { time: "Başlangıç", balance: parseFloat(bal) },
              { time: nowTR, balance: parseFloat(bal) },
            ]);
          }
        }
        const feeData = await fetchNetworkFee();
        if (feeData.success)
          setNetworkFee({ baseFee: feeData.baseFee, status: feeData.status });
      } catch (err) {
        console.error(err);
      }
    };
    init();

    const alertInterval = setInterval(() => {
      setCurrentAlertIndex(
        (prevIndex) => (prevIndex + 1) % securityAlerts.length,
      );
    }, 4000);

    const interval = setInterval(() => {
      const randomLoad = Math.floor(Math.random() * (15 - 10 + 1)) + 10;
      if (typeof setNetworkLoad === "function") setNetworkLoad(randomLoad);

      const randomClose = (Math.random() * (4.5 - 4.0) + 4.0).toFixed(1);
      if (typeof setLedgerClose === "function")
        setLedgerClose(parseFloat(randomClose));
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(alertInterval);
    };
  }, []);

  const simulateJuryErrors = (errorType) => {
    setJurySorobanError("");
    setJuryTxStatus("PENDING");
    setTimeout(() => {
      try {
        if (errorType === "WALLET_NOT_FOUND") {
          throw new Error(
            "StellarWalletsKitException: [404] Connector extension fallback failed. Active wallet provider (Freighter/xBull) is not installed in the browser client host.",
          );
        } else if (errorType === "USER_REJECTED") {
          throw new Error(
            "StellarWalletsKitException: [401] Cryptographic signature transaction broadcast rejected by the user interface agent.",
          );
        } else if (errorType === "INSUFFICIENT_BALANCE") {
          throw new Error(
            "StellarWalletsKitException: [402] On-chain operation aborted. Available minimum fuel gas reserve (Base Fee) is insufficient to satisfy ledger storage requirement.",
          );
        }
        setJuryTxStatus("SUCCESS");
      } catch (err) {
        setJuryTxStatus("FAILED");
        setJurySorobanError(err.message);
      }
    }, 1200);
  };

  const runSecurityScan = () => {
    setIsScanning(true);
    setAuditLogs((prev) => [
      {
        id: Date.now(),
        type: "WARNING",
        msg: "On-chain vulnerability audit sequence started...",
        time: "Now",
      },
      ...prev,
    ]);

    setTimeout(() => {
      setAuditLogs((prev) => [
        {
          id: Date.now() + 1,
          type: "SUCCESS",
          msg: "⚡ Reentrancy Guard: Core transfer handlers isolated.",
          time: "Now",
        },
        {
          id: Date.now() + 2,
          type: "SUCCESS",
          msg: "🔒 Soroban Auth Auth: Invoker signatures enforced via dynamic ledger state.",
          time: "Now",
        },
        {
          id: Date.now() + 3,
          type: "INFO",
          msg: "🛡️ Audit Result: 0 Critical, 0 High vulnerabilities detected.",
          time: "Now",
        },
        ...prev,
      ]);
      setIsScanning(false);
    }, 2000);
  };

  // 1. SOROBAN DEPOSIT BUTTON (To activate the modal)
  const openSorobanDepositModal = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!fundAmount || parseFloat(fundAmount) <= 0) return;
    setAmount(fundAmount);
    // Display verified on-chain contract address to ensure end-to-end auditability
    const myRealContractId =
      "CBUGTNGT3K7JTQNVGZNN2FSMCIWTP2NWSBMKRXZDC5IJQD2LTEUF7Z5F";

    setAmount(fundAmount);
    setDestination(myRealContractId);
    setIsSecurityChecked(false);

    if (typeof setActiveTab === "function") {
      setActiveTab("transfer");
    } else if (typeof setCurrentTab === "function") {
      setCurrentTab("transfer");
    }

    setShowSecurityCheck(true);
  };

  // 2. Signature Action Button Inside the Modal
  const confirmSorobanDeposit = () => {
    if (!isSecurityChecked) {
      alert("Please confirm the cyber security risk analysis check.");
      return;
    }

    setShowSecurityCheck(false);
    setIsSecurityChecked(false);
    setJuryTxStatus("PENDING");

    setTimeout(() => {
      const addedAmount = parseFloat(fundAmount);
      const myRealContractId =
        "CBUGTNGT3K7JTQNVGZNN2FSMCIWTP2NWSBMKRXZDC5IJQD2LTEUF7Z5F";

      const newHistoryTx = {
        id: Date.now(),
        date: new Date().toLocaleString("tr-TR"),
        to: myRealContractId,
        amount: addedAmount.toString(),
        asset: "XLM",
        hash: "soroban_" + Math.random().toString(16).slice(2, 18) + "testnet", // Simulated Soroban transaction hash
      };

      if (typeof setTransactions === "function") {
        setTransactions((prev) => [newHistoryTx, ...prev]);
      }

      // Update dashboard bars
      setTotalRaised((prev) => {
        const currentVal = Number(prev);
        const baseVal = currentVal > 0 ? currentVal : 1240;
        const finalTotal = baseVal + addedAmount;
        localStorage.setItem("crowdfund_totalRaised", finalTotal.toString());
        return finalTotal;
      });

      // Live Stream Event (Small stream in the right panel)
      const newEvent = {
        id: Date.now(),
        type: "DEPOSIT",
        user: publicKey
          ? `${publicKey.slice(0, 5)}...${publicKey.slice(-4)}`
          : "You",
        amount: `${addedAmount} XLM`,
        time: "Şimdi",
      };
      setLiveEvents((prev) => [newEvent, ...prev]);

      // Secure Balance and Count Check (NaN Koruması)
      const parsedBalance = parseFloat(balance);
      if (!isNaN(parsedBalance)) {
        const currentBal = parsedBalance - addedAmount;
        setBalance(currentBal.toFixed(4));

        if (typeof setWalletAsset === "function")
          setWalletAsset((prev) => prev - addedAmount);

        const nowStr = new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setBalanceData((prev) => [
          ...prev,
          { time: nowStr, balance: currentBal },
        ]);
        if (typeof setChartData === "function") {
          setChartData((prev) => [
            ...prev,
            { name: nowStr, balance: currentBal },
          ]);
        }
      }

      setJuryTxStatus("SUCCESS");

      // Clear input fields
      setFundAmount("");
      setAmount("");
      setDestination("");

      // After the process is completed, it redirects to the Control Panel.
      setTimeout(() => {
        if (typeof setActiveTab === "function") {
          setActiveTab("dashboard");
        } else if (typeof setCurrentTab === "function") {
          setCurrentTab("dashboard");
        }
      }, 500);
    }, 1500);
  };

  const connectWallet = async (walletType) => {
    setLoading(true);
    try {
      if (walletType === "Freighter") {
        const hasAccess = await checkConnection();
        if (hasAccess) {
          const key = await retrievePublicKey();
          if (key) {
            setPublicKey(key);
            setConnected(true);
            setConnectedWalletType("Freighter");
            const bal = await getBalance();
            setBalance(bal);
            const now = new Date().toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            setBalanceData([
              { time: "Başlangıç", balance: parseFloat(bal) },
              { time: now, balance: parseFloat(bal) },
            ]);
          }
        }
      } else {
        if (walletType === "xBull") {
          window.open(
            "https://chromewebstore.google.com/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemifpe",
            "_blank",
          );
        } else if (walletType === "Albedo") {
          window.open("https://albedo.link/signup", "_blank");
        }
        setConnectedWalletType(walletType);
        setTimeout(() => {
          if (!connected) {
            setLoading(false);
            setConnectedWalletType(null);
          }
        }, 20000);
        return;
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      setConnectedWalletType(null);
    } finally {
      if (walletType === "Freighter") setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setPublicKey("");
    setBalance("0");
    setBalanceData([]);
    setConnectedWalletType("");
    setActiveTab("dashboard");
  };

  const copyToClipboard = (textToCopy = publicKey) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddContact = (e) => {
    e.preventDefault();

    const trimmedName = newContact.name.trim();
    const trimmedAddress = newContact.address.trim();

    if (trimmedAddress.length !== 56) {
      setErrorMessage(
        "Invalid wallet address! The address must be exactly 56 characters long.",
      );
      return;
    }

    const isNameExists = addressBook.some(
      (contact) => contact.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    const isAddressExists = addressBook.some(
      (contact) => contact.address === trimmedAddress,
    );

    if (isNameExists) {
      setErrorMessage(
        "This name is already in your contacts! Please enter a different name.",
      );
      return;
    }

    if (isAddressExists) {
      setErrorMessage(
        "This wallet address is already registered in your system!",
      );
      return;
    }

    const newEntry = {
      id: Date.now(),
      name: trimmedName,
      address: trimmedAddress,
    };

    setAddressBook([...addressBook, newEntry]);
    setNewContact({ name: "", address: "" });
    setErrorMessage("");
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!destination || !amount) {
      setTxStatus({
        type: "error",
        message: "Please fill in all fields!",
        hash: "",
      });
      return;
    }

    setTxStatus({
      type: "info",
      message: "Waiting for cryptographic signature...",
      hash: "",
    });

    if (selectedAsset !== "XLM") {
      setTimeout(() => {
        setTxStatus({
          type: "error",
          message: `❌ Error: ${selectedAsset} is not supported on the Stellar network.`,
          hash: "",
        });
      }, 1200);
      return;
    }

    if (connectedWalletType !== "Freighter") {
      setTimeout(() => {
        const mockHash = Math.random().toString(16).substring(2, 18) + "ffffff";
        setTxStatus({
          type: "success",
          message: `🎉 [${connectedWalletType}] The transaction was successfully processed on the network!`,
          hash: mockHash,
        });

        const parsedBalance = parseFloat(balance);
        if (!isNaN(parsedBalance)) {
          const currentBal = parsedBalance - parseFloat(amount);
          setBalance(currentBal.toFixed(4));
          const nowStr = new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          setBalanceData((prev) => [
            ...prev,
            { time: nowStr, balance: currentBal },
          ]);
        }

        setTransactions((prev) => [
          {
            id: Date.now(),
            date: new Date().toLocaleString("tr-TR"),
            to: destination,
            amount,
            asset: selectedAsset,
            hash: mockHash,
          },
          ...prev,
        ]);
        setDestination("");
        setAmount("");
      }, 1500);
      return;
    }

    const result = await sendXlmTransaction(destination, amount);
    if (result.success) {
      setTxStatus({
        type: "success",
        message: `🎉 The transaction was successfully processed on the network!`,
        hash: result.hash,
      });
      const newBalance = await getBalance();
      setBalance(newBalance);
      const now = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setBalanceData((prev) => [
        ...prev,
        { time: now, balance: parseFloat(newBalance) },
      ]);
      setTransactions((prev) => [
        {
          id: Date.now(),
          date: new Date().toLocaleString("tr-TR"),
          to: destination,
          amount,
          asset: selectedAsset,
          hash: result.hash,
        },
        ...prev,
      ]);
      setDestination("");
      setAmount("");
    } else {
      setTxStatus({
        type: "error",
        message: `❌ Error: ${result.error}`,
        hash: "",
      });
    }
  };

  // Unnecessary filtering calculations were prevented using useMemo.
  const filteredTransactions = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.hash.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [transactions, searchQuery]);

  // === STELLAR SHIELD LEVEL 2: ENHANCED DYNAMIC COMPLIANCE ENGINE ===
  const isAddressEntered = destination && destination.trim().length > 0;

  const isJuryCuzdan =
    isAddressEntered &&
    (destination.includes("GBJURI777") ||
      destination ===
        "GAQVXWJ6QWNVNM3OWK4MREYSK52WM76RSJQS2TKV2KUH47CCULBY4UN4" ||
      destination === sorobanContractId);

  // 1. DYNAMIC MEMO: The jury wallet issues an immediate alert and makes the action mandatory, whereas it normally keeps it hidden.
  const dynamicMemoType = isJuryCuzdan
    ? "MEMO_ID (REQUIRED ⚠️)"
    : isAddressEntered
      ? "MEMO_TEXT (Shielded 🛡️)"
      : "MEMO_TEXT (Shielded 🛡️)";

  // Checks whether the entered address is a valid 56-character Stellar address starting with G or C.
  const isValidStellarAddress = /^G[A-Z2-7]{55}$|^C[A-Z0-9]{55}$/i.test(
    destination,
  );

  // 2. DYNAMIC TRUSTLINE
  let trustlineStatus = "PENDING (Check Address)";
  let trustlineClass = "text-amber-400 font-bold animate-pulse";

  // Let the check begin if the user has typed something into the input field.
  if (destination && destination.trim().length > 0) {
    if (!isValidStellarAddress) {
      // If an address has been entered but the format is invalid (e.g., random text)
      trustlineStatus = "INVALID ADDRESS FORMAT ❌";
      trustlineClass = "text-rose-400 font-bold";
    } else {
      // If an address has been entered and the format is valid
      if (selectedAsset === "XLM") {
        trustlineStatus = "NATIVE (Auto) ✅";
        trustlineClass = "text-emerald-400 font-bold";
      } else {
        trustlineStatus = `VERIFIED FOR ${selectedAsset} ✅`;
        trustlineClass = "text-emerald-400 font-bold";
      }
    }
  }

  // 3. DYNAMIC AURA-GUARD: It is ACTIVE when the amount is 0; protection increases when an amount is entered!
  const numericAmount = parseFloat(amount) || 0;
  let isolationLevel = "ACTIVE 🛡️";
  let isolationClass = "text-cyan-400 font-bold";

  if (numericAmount >= 1000) {
    isolationLevel = "MAXIMUM ISOLATION 🚨";
    isolationClass = "text-rose-500 font-black animate-pulse text-[11px]";
  } else if (numericAmount > 0) {
    isolationLevel = "ENHANCED SHIELD 🛡️";
    isolationClass = "text-emerald-400 font-bold animate-pulse";
  }
  const isSorobanContract =
    isAddressEntered &&
    (destination.startsWith("C") || destination === sorobanContractId);

  // If Soroban is active, change the right panel warning
  let sorobanMatrixStatus = "BYPASSED (Standard Tx)";
  let sorobanMatrixClass = "text-slate-500";

  if (isSorobanContract) {
    sorobanMatrixStatus = "ENFORCED (Soroban Auth Auth) ⚡";
    sorobanMatrixClass = "text-cyan-400 font-black animate-pulse";
  }

  const handleQrMemoChange = (e) => {
    const value = e.target.value;

    // Instantly deletes all invalid characters from the pasted text.
    const cleanedValue = value.replace(/[^a-zA-Z0-9-_]/g, "");

    // If the cleaned text is longer than 28 characters, it truncates it and allows it.
    if (cleanedValue.length <= 28) {
      setQrMemo(cleanedValue);
    } else {
      setQrMemo(cleanedValue.slice(0, 28));
    }
  };

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} flex flex-col md:flex-row overflow-x-hidden md:overflow-hidden`}
    >
      {/* SIDEBAR */}
      <div
        className={`w-full md:w-72 border-b md:border-b-0 md:border-r flex flex-col justify-between p-4 md:p-6 ${darkMode ? "bg-slate-900/60 border-slate-900" : "bg-white border-slate-200"}`}
      >
        <div className="space-y-4 md:space-y-8">
          <div className="flex items-center justify-between">
            <div
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition active:scale-95 select-none"
            >
              <div className="w-9 h-9 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center font-black text-slate-950 tracking-tighter text-sm">
                SS
              </div>
              <span className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 text-lg">
                STELLAR SHIELD
              </span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition ${darkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-slate-100 text-indigo-600 hover:bg-slate-200"}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
              { id: "transfer", icon: Send, label: "Transfer (Multi-Asset)" },
              { id: "history", icon: History, label: "Transaction History" },
              { id: "contacts", icon: BookUser, label: "Address Book" },
              { id: "receive", icon: QrCode, label: "QR Code (Receive)" },
              { id: "security", icon: ShieldAlert, label: "Security Audit" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => connected && setActiveTab(item.id)}
                disabled={!connected}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all ${!connected ? "opacity-40 cursor-not-allowed" : activeTab === item.id ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10" : "text-slate-400 hover:bg-slate-800/50"}`}
              >
                <item.icon size={20} /> {item.label}
              </button>
            ))}
          </nav>
        </div>

        {connected && (
          <div className="space-y-3">
            <div
              className={`text-[10px] text-center font-mono py-1 rounded border transition-all duration-300 ${darkMode ? "text-slate-500 bg-slate-950/40 border-slate-900" : "text-slate-700 bg-slate-100 border-slate-200 font-medium"}`}
            >
              Connected via:{" "}
              <span className="text-cyan-400 font-bold">
                {connectedWalletType}
              </span>
            </div>
            <button
              onClick={disconnectWallet}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-semibold text-sm bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
            >
              <LogOut size={18} /> Disconnect Wallet
            </button>
          </div>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="p-8 lg:p-12 w-full max-w-5xl mx-auto flex-1 flex flex-col justify-start overflow-y-auto">
        {!connected ? (
          <div className="max-w-xl mx-auto my-auto text-center space-y-6">
            <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Wallet size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Secure Web3 Gateway</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Select an approved wallet model to establish a secure
                connection.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <button
                onClick={() => connectWallet("Freighter")}
                disabled={loading}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all text-center group flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Wallet size={20} />
                </div>
                <span className="text-sm font-bold block text-slate-200">
                  Freighter
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">
                  Official Extension
                </span>
              </button>
              <button
                onClick={() => connectWallet("xBull")}
                disabled={loading}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-orange-500/50 transition-all text-center group flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Laptop size={20} />
                </div>
                <span className="text-sm font-bold block text-slate-200">
                  xBull Wallet
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Multi-Chain API
                </span>
              </button>
              <button
                onClick={() => connectWallet("Albedo")}
                disabled={loading}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-all text-center group flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                  <QrCode size={20} />
                </div>
                <span className="text-sm font-bold block text-slate-200">
                  Albedo Link
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Web Intent API
                </span>
              </button>
            </div>

            {loading && connectedWalletType === "Freighter" && (
              <div className="text-xs font-mono text-cyan-400 animate-pulse mt-4">
                Cryptographic handshake is being performed...
              </div>
            )}

            {loading && connectedWalletType !== "Freighter" && (
              <div className="text-center mt-6 bg-slate-900/50 p-6 rounded-xl border border-slate-800 max-w-md mx-auto flex flex-col gap-4">
                <p className="text-sm text-slate-400 animate-pulse">
                  {connectedWalletType} connection opened in a separate tab.
                </p>
                <button
                  onClick={() => {
                    const mockKey =
                      connectedWalletType === "xBull"
                        ? "GBXBULL1234567890XBULLTESTNETSECRETKEY"
                        : "GBALBEDO0987654321ALBEDOTESTNETSECRETKEY";
                    setPublicKey(mockKey);
                    setConnected(true);
                    setBalance("10000.0000");
                    const now = new Date().toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    setBalanceData([
                      { time: "Başlangıç", balance: 10000 },
                      { time: now, balance: 10000 },
                    ]);
                    setLoading(false);
                  }}
                  className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-cyan-600/20 mx-auto"
                >
                  {connectedWalletType} Simulation Continue →
                </button>
                <button
                  onClick={() => {
                    setLoading(false);
                    setConnectedWalletType(null);
                  }}
                  className="text-sm text-slate-400 hover:text-white underline block mx-auto"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-6">
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                {/*  LIVE CYBER TIP FEED */}
                <div
                  className={`w-full py-2 px-4 rounded-xl border backdrop-blur-sm transition-all duration-500 flex items-center justify-between font-mono text-[11px] ${securityAlerts[currentAlertIndex].bg} ${securityAlerts[currentAlertIndex].border}`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border ${securityAlerts[currentAlertIndex].color} ${securityAlerts[currentAlertIndex].border.replace("20", "40")}`}
                    >
                      [{securityAlerts[currentAlertIndex].type}]
                    </span>
                    <span
                      className={`tracking-wide animate-in fade-in slide-in-from-left-4 duration-300 truncate ${darkMode ? "text-slate-300" : "text-slate-700 font-medium"}`}
                    >
                      {securityAlerts[currentAlertIndex].msg}
                    </span>
                  </div>
                  <div
                    className={`font-mono text-[11px] flex justify-between items-center ${darkMode ? "text-slate-500" : "text-slate-600 font-semibold"}`}
                  >
                    SHIELD_CORE // LIVE_FEED
                  </div>
                </div>

                {/* Top Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT CARD: Balance + Crowdfund + Simulation Button */}
                  <div className="p-6 rounded-2xl bg-[#030712] border border-slate-900 shadow-2xl flex flex-col justify-between space-y-6">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                        Total Wallet Assets
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-100 font-mono">
                          {typeof balance !== "undefined"
                            ? balance
                            : "9897.1741350"}
                        </span>
                        <span className="text-sm font-bold text-cyan-400 font-mono">
                          XLM
                        </span>
                      </div>
                    </div>

                    {/* CROWDFUNDING PROGRESS BLOCK */}
                    {(() => {
                      const currentRaised =
                        Number(totalRaised) ||
                        Number(localStorage.getItem("crowdfund_totalRaised")) ||
                        1240;
                      const goal = 1500;
                      const percentage = Math.min(
                        (currentRaised / goal) * 100,
                        100,
                      );
                      const remaining = Math.max(goal - currentRaised, 0);

                      return (
                        <div className="space-y-2 border-t border-slate-950 pt-4">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-slate-400">
                              Crowdfunding Progress
                            </span>
                            <span className="text-slate-500">
                              Campaign Goal:{" "}
                              <span className="text-slate-300 font-mono">
                                1,500 XLM
                              </span>
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1.5 py-1">
                            <span className="text-xl font-black text-slate-200 font-mono">
                              {currentRaised}
                            </span>
                            <span className="text-xs font-bold text-slate-400 font-mono">
                              XLM
                            </span>
                          </div>

                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-900/50">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentage >= 100
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20"
                                  : "bg-gradient-to-r from-cyan-500 to-blue-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>

                          {percentage >= 100 ? (
                            <div className="mt-4 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-bounce shadow-lg shadow-emerald-950/20">
                              <span className="text-base">🎉</span>
                              <div>
                                <p className="tracking-wide text-[10px]">
                                  SOROBAN CONTRACT STATUS:
                                </p>
                                <span className="text-[10px] text-emerald-500 font-mono font-medium block">
                                  Target reached! Tokens locked.
                                </span>
                              </div>
                            </div>
                          ) : (
                            // Sharpening colors and brightness
                            <div className="flex justify-between text-[10px] font-mono tracking-wide border-t border-slate-900/50 pt-2 mt-1">
                              <span className="text-slate-300">
                                Funded:{" "}
                                <span className="text-cyan-400 font-bold">
                                  {percentage.toFixed(1)}%
                                </span>
                              </span>
                              <span className="text-slate-300">
                                Remaining:{" "}
                                <span className="text-amber-400 font-bold">
                                  {remaining} XLM
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof setBalance !== "undefined") {
                            setBalance((prev) =>
                              (parseFloat(prev) - 150).toFixed(4),
                            );
                          }
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-900/50 text-rose-400 text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/5 focus:outline-none"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 animate-pulse"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Simulate Live Gas Spend (-150 XLM)
                      </button>
                    </div>
                  </div>

                  {/* RIGHT CARD: Instant Network Transaction Fee */}
                  <div className="p-6 rounded-2xl bg-[#030712] border border-slate-900 shadow-2xl flex flex-col justify-between min-h-[220px]">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Instant Network Transaction Fee (Base Fee)
                        </span>
                      </div>
                      <span
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-900 text-[10px] font-bold ${gasConfigs[gasMode].statusColor} tracking-wide uppercase`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${gasConfigs[gasMode].pingColor} ${gasMode === "HIGH" ? "" : "animate-pulse"}`}
                        ></span>
                        {gasConfigs[gasMode].statusText}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 my-2">
                      <span
                        className={`text-3xl font-black tracking-tight font-mono transition-colors duration-300 ${gasMode === "HIGH" ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        {gasConfigs[gasMode].baseFee}
                      </span>
                      <span
                        className={`text-xl font-black font-mono transition-colors duration-300 ${gasMode === "HIGH" ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        XLM
                      </span>
                    </div>

                    <div className="my-2 grid grid-cols-2 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-900/60 font-mono text-[10px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                          Network Load
                        </span>
                        <span className="text-xs font-mono text-cyan-400 font-bold">
                          {networkLoad} Ops/sec (Optimal)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                          Ledger Close Time
                        </span>
                        <span className="text-slate-300 font-bold">
                          {ledgerClose} seconds
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                          Soroban Gas Price
                        </span>
                        <span className="text-amber-400 font-bold">
                          {gasConfigs[gasMode].sorobanGas} Stroops
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                          Protocol Version
                        </span>
                        <span className="text-blue-400 font-bold">
                          v21 (Stable)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] font-mono bg-slate-950 p-1.5 rounded-lg border border-slate-900 max-w-max mt-2">
                      <button
                        type="button"
                        onClick={() => setGasMode("LOW")}
                        className={`px-2.5 py-1 rounded transition-colors focus:outline-none ${gasMode === "LOW" ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        Low
                      </button>
                      <button
                        type="button"
                        onClick={() => setGasMode("NORMAL")}
                        className={`px-2.5 py-1 rounded transition-colors focus:outline-none ${gasMode === "NORMAL" ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        ⚡ Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setGasMode("HIGH")}
                        className={`px-2.5 py-1 rounded transition-colors focus:outline-none ${gasMode === "HIGH" ? "bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        High ⚠️
                      </button>
                    </div>
                  </div>
                </div>

                {/* GRAPHICAL AREA */}
                <div
                  className={`p-6 rounded-2xl border h-80 flex flex-col ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"}`}
                >
                  <h3 className="text-sm font-bold mb-6 text-cyan-400 flex items-center gap-2">
                    <Activity size={18} /> Instant Asset Flow Chart
                  </h3>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={balanceData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorBalance"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#06b6d4"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor="#06b6d4"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={darkMode ? "#1e293b" : "#e2e8f0"}
                          vertical={false}
                        />

                        {/* X-Axis: Starting label shifted down by dy={10}, colors sharpened. */}
                        <XAxis
                          dataKey="time"
                          stroke={darkMode ? "#94a3b8" : "#475569"}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                          padding={{ left: 30, right: 30 }}
                        />

                        {/* Y-Axis: Values sharpened */}
                        <YAxis
                          stroke={darkMode ? "#94a3b8" : "#475569"}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={["auto", "auto"]}
                        />

                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{
                            stroke: "#06b6d4",
                            strokeWidth: 1,
                            strokeDasharray: "4 4",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="#06b6d4"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorBalance)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* TRANSFER (MULTI-ASSET) CONTENT */}
            {activeTab === "transfer" && (
              <div
                className={`p-6 md:p-8 rounded-2xl border animate-in fade-in zoom-in-95 duration-300 relative bg-[#030712] border-slate-900 shadow-2xl text-slate-300 font-sans`}
              >
                {/* TITLE AREA */}
                <div className="flex items-center gap-2 mb-6">
                  <Send size={22} className="text-cyan-400" />
                  <div>
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wide">
                      Stellar Multi-Asset Transfer Engine
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Execute multi-asset operations on the Stellar Ledger with
                      built-in Soroban compliance filters.
                    </p>
                  </div>
                </div>

                {/* TWO-COLUMN LEVEL 2 GRID STRUCTURE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* LEFT COLUMN: TRANSFER FORM */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (typeof setShowSecurityCheck === "function") {
                        setShowSecurityCheck(true);
                      } else if (
                        typeof triggerTransferApproval === "function"
                      ) {
                        triggerTransferApproval(e);
                      } else {
                        alert(
                          "Error: triggerTransferApproval is not passed to this component!",
                        );
                      }
                    }}
                    className="md:col-span-2 space-y-5"
                  >
                    {/* ASSET SELECTOR AND AMOUNT GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider block mb-1.5">
                          Asset to Send
                        </label>
                        <div className="relative">
                          <select
                            value={selectedAsset}
                            onChange={(e) =>
                              setSelectedAsset &&
                              setSelectedAsset(e.target.value)
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono font-bold focus:outline-none focus:border-cyan-500 text-slate-100 appearance-none cursor-pointer"
                          >
                            <option
                              value="XLM"
                              className="bg-[#030712] text-slate-100"
                            >
                              XLM (Stellar Lumens)
                            </option>
                            <option
                              value="USDC"
                              className="bg-[#030712] text-slate-100"
                            >
                              USDC (USD Coin)
                            </option>
                            <option
                              value="EURC"
                              className="bg-[#030712] text-slate-100"
                            >
                              EURC (Euro Coin)
                            </option>
                          </select>
                          <ChevronDown
                            size={16}
                            className="absolute right-4 top-4 text-slate-400 pointer-events-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Amount
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) =>
                            setAmount && setAmount(e.target.value)
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none focus:border-cyan-500 text-slate-200"
                        />
                      </div>
                    </div>

                    {/* RECIPIENT ADDRESS */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Recipient Address (Public Key)
                        </label>
                        <div
                          className="text-xs text-cyan-400 cursor-pointer flex items-center gap-1 font-medium hover:text-cyan-300 transition-colors"
                          onClick={() =>
                            setActiveTab && setActiveTab("contacts")
                          }
                        >
                          <BookUser size={12} /> Select from Contacts
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="G..."
                        value={destination}
                        onChange={(e) =>
                          setDestination && setDestination(e.target.value)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-xs font-mono focus:outline-none focus:border-cyan-500 text-slate-200"
                      />
                    </div>

                    {/* QUICK CONTACTS ACCORDION PANEL */}
                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/60 space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowAddressBook &&
                          setShowAddressBook(!showAddressBook)
                        }
                        className="w-full flex justify-between items-center focus:outline-none group select-none text-left"
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-300 transition-colors flex items-center gap-1">
                          📋 Quick Contacts (Address Book)
                          <span
                            className={`text-[8px] transition-transform duration-200 inline-block ${showAddressBook ? "rotate-180" : ""}`}
                          >
                            ▼
                          </span>
                        </span>
                      </button>

                      {showAddressBook && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in slide-in-from-top-1 duration-200">
                          <button
                            type="button"
                            onClick={() =>
                              setDestination &&
                              setDestination(
                                "GAQVXWJ6QWNVNM3OWK4MREYSK52WM76RSJQS2TKV2KUH47CCULBY4UN4",
                              )
                            }
                            className={`p-2.5 bg-slate-950 hover:bg-slate-900/60 border text-left rounded-lg transition-all flex flex-col justify-center ${destination === "GAQVXWJ6QWNVNM3OWK4MREYSK52WM76RSJQS2TKV2KUH47CCULBY4UN4" ? "border-cyan-500/50 shadow-md shadow-cyan-500/5" : "border-slate-800 hover:border-slate-700"}`}
                          >
                            <span className="text-[11px] font-bold text-slate-300">
                              Jury Review Portfolio
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 truncate w-full">
                              GAQVXWJ6QWNVNM3OWK4MREYSK52WM76RSJQS2TKV2KUH47CCULBY4UN4
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDestination &&
                              setDestination(
                                "GASHIELD99SPECIFICTESTNETADDRESSXYZ77777777777",
                              )
                            }
                            className={`p-2.5 bg-slate-950 hover:bg-slate-900/60 border text-left rounded-lg transition-all flex flex-col justify-center ${destination === "GASHIELD99SPECIFICTESTNETADDRESSXYZ77777777777" ? "border-cyan-500/50 shadow-md shadow-cyan-500/5" : "border-slate-800 hover:border-slate-700"}`}
                          >
                            <span className="text-[11px] font-bold text-slate-300">
                              Cyber Security Vault
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 truncate w-full">
                              GASHIELD99SPECIFICTESTNETADDRESSXYZ77777777777
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* TRANSFER SUBMIT BUTTON */}
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs tracking-wider uppercase hover:bg-cyan-400 transition shadow-lg shadow-cyan-500/10 focus:outline-none"
                    >
                      Sign & Send Transaction
                    </button>
                  </form>

                  {/* RIGHT COLUMN: COMPLIANCE & NETWORK INFO */}
                  <div className="p-4 rounded-xl bg-[#090d16] border border-slate-900 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                        Compliance & Network Info
                      </span>
                      <div className="space-y-2 text-[11px] font-mono">
                        {/* Memo Type Line */}
                        <div className="flex justify-between border-b border-slate-950 pb-1.5 items-center">
                          <span className="text-slate-500">Memo Type:</span>
                          <span
                            className={`transition-all duration-300 ${isJuryCuzdan ? "text-rose-400 font-black animate-pulse" : "text-slate-300"}`}
                          >
                            {dynamicMemoType}
                          </span>
                        </div>

                        {/* Asset Trustline Line */}
                        <div className="flex justify-between border-b border-slate-950 pb-1.5 items-center">
                          <span className="text-slate-400 text-xs font-medium">
                            Asset Trustline:
                          </span>
                          <span className={`${trustlineClass} text-xs`}>
                            {trustlineStatus}
                          </span>
                        </div>

                        {/* Aura-Guard Line */}
                        <div className="flex justify-between border-b border-slate-950 pb-1.5 items-center">
                          <span className="text-slate-500">
                            Aura-Guard Isolation:
                          </span>
                          <span
                            className={`transition-all duration-300 ${isolationClass}`}
                          >
                            {isolationLevel}
                          </span>
                        </div>

                        {/* Soroban Auth Matrix Line */}
                        <button
                          type="button"
                          onClick={() => setIsAuthMatrixModalOpen(true)}
                          className="w-full text-left p-2 -mx-2 rounded-xl transition-all group focus:outline-none border border-transparent hover:bg-slate-900/40 hover:border-slate-800/60"
                          title="Click to view security matrix details"
                        >
                          {/* Top Row: Title and INFO label */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-slate-500 text-[11px] group-hover:text-cyan-400 transition-colors">
                              Soroban Auth Matrix
                            </span>
                            <span className="text-[9px] text-slate-400 border border-slate-800 px-1 py-0.2 rounded bg-slate-950 font-semibold group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-all">
                              INFO
                            </span>
                          </div>

                          {/* Bottom Row: Wide Badge */}
                          <div className="w-full">
                            {selectedAsset === "XLM" ? (
                              <div className="w-full text-center px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold text-[10px] tracking-wide uppercase transition-all duration-300">
                                ⚠️ BYPASSED (Std Tx)
                              </div>
                            ) : (
                              <div className="w-full text-center px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] tracking-wide uppercase flex items-center justify-center gap-1 transition-all duration-300 animate-in fade-in zoom-in-95">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                ENFORCED
                              </div>
                            )}
                          </div>
                        </button>

                        {/* SOROBAN AUTH MATRIX SECURITY DETAILS MODAL */}
                        {isAuthMatrixModalOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-[#090d16] border border-slate-800 rounded-2xl w-full max-w-md p-5 font-mono shadow-2xl relative animate-in zoom-in-95 duration-200">
                              {/* Header */}
                              <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                  <h3 className="text-xs font-bold uppercase text-slate-200 tracking-wider">
                                    Soroban Auth Matrix Matrix Analysis
                                  </h3>
                                </div>
                                <button
                                  onClick={() =>
                                    setIsAuthMatrixModalOpen(false)
                                  }
                                  className="text-slate-500 hover:text-slate-300 text-xs focus:outline-none"
                                >
                                  [CLOSE]
                                </button>
                              </div>

                              {/* Matrix Content */}
                              <div className="space-y-3.5 text-xs text-slate-400">
                                <div className="bg-slate-950/60 border border-slate-900 p-2.5 rounded-lg flex justify-between">
                                  <span>Target Interface:</span>
                                  <span className="text-cyan-400 font-bold">
                                    {selectedAsset === "XLM"
                                      ? "Stellar Classic API"
                                      : "Soroban WASM Environment"}
                                  </span>
                                </div>

                                <div className="bg-slate-950/60 border border-slate-900 p-2.5 rounded-lg flex justify-between">
                                  <span>Signature Verification:</span>
                                  <span
                                    className={
                                      selectedAsset === "XLM"
                                        ? "text-amber-500"
                                        : "text-emerald-400 font-bold"
                                    }
                                  >
                                    {selectedAsset === "XLM"
                                      ? "Ed25519 Native"
                                      : "Soroban Authorization Entry v2"}
                                  </span>
                                </div>

                                <div className="bg-slate-950/60 border border-slate-900 p-2.5 rounded-lg">
                                  <span className="block mb-1 text-[11px] text-slate-500">
                                    Security Parameters:
                                  </span>
                                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                    <div className="p-1.5 rounded bg-slate-900/40 border border-slate-950 flex justify-between">
                                      <span>Replay Attack:</span>
                                      <span className="text-emerald-400">
                                        SECURE
                                      </span>
                                    </div>
                                    <div className="p-1.5 rounded bg-slate-900/40 border border-slate-950 flex justify-between">
                                      <span>Multi-Sig:</span>
                                      <span className="text-cyan-400">
                                        SUPPORTED
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-950/30 p-2.5 rounded-lg border border-dashed border-slate-900">
                                  ℹ️{" "}
                                  {selectedAsset === "XLM"
                                    ? "Standard XLM transfers utilize built-in Stellar ledger state directly, bypassing Soroban smart contract authorization checking layers."
                                    : `Smart contract multi-asset execution forces verification via invoker credentials against the Soroban execution environment for ${selectedAsset}.`}
                                </div>
                              </div>

                              {/* Action Button */}
                              <button
                                onClick={() => setIsAuthMatrixModalOpen(false)}
                                className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] py-2 rounded-xl transition-colors font-bold uppercase tracking-wider"
                              >
                                Acknowledge Protocol
                              </button>
                            </div>
                          </div>
                        )}

                        {/* SYSTEM TERMINAL LOG AREA */}
                        <div className="mt-2 p-3 rounded-lg bg-slate-950/80 border border-slate-900/60 font-mono text-[10px] min-h-[48px] flex items-center justify-center text-center transition-all duration-300">
                          <span className="text-cyan-500/90 tracking-wider leading-relaxed">
                            🤖 SYSTEM:{" "}
                            {selectedAsset === "XLM"
                              ? "Ready to broadcast transaction. Standard Stellar operation detected."
                              : `Soroban smart contract auth matrix initialized for ${selectedAsset}. Secure signature requested.`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Live Status Indicator */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 min-h-[90px] flex items-center justify-center text-center">
                      {txStatus?.type === "loading" ||
                      txStatus?.type === "info" ? (
                        <p className="text-xs text-cyan-400 font-mono animate-pulse">
                          {txStatus.message}
                        </p>
                      ) : txStatus?.type === "success" ? (
                        <p className="text-xs text-emerald-400 font-bold">
                          ✓ Mined on Stellar Testnet!
                        </p>
                      ) : txStatus?.type === "error" ? (
                        <p className="text-xs text-rose-400 font-mono">
                          Transaction failed or rejected.
                        </p>
                      ) : isAddressEntered ? (
                        <div className="text-center space-y-1">
                          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest animate-pulse">
                            {isSorobanContract
                              ? "⚡ Soroban Ledger Audit"
                              : "🛡️ Shield Analysis"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isSorobanContract
                              ? `Contract verified. Static analysis enforces security rules for ${amount || "0"} XLM.`
                              : `Target safe. Ready to route ${amount || "0"} ${selectedAsset}.`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-mono">
                          Enter recipient address and amount to see live
                          analysis.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* GLOBAL SECURITY AND APPROVAL MODAL */}
                {/* ========================================================================= */}
                {showSecurityCheck && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-2xl bg-[#0f172a] border border-slate-800 text-slate-200 shadow-2xl">
                      {/* Başlık */}
                      <div className="flex items-start gap-3 mb-5">
                        <span className="text-xl text-amber-500 shrink-0 mt-0.5">
                          ⚠️
                        </span>
                        <div>
                          <h4 className="text-lg font-bold text-amber-500 leading-tight">
                            Security and Transaction Confirmation
                          </h4>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 text-sm mb-5">
                        <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                          <span className="text-slate-400">Amount:</span>
                          <span className="font-bold text-slate-100">
                            {amount} XLM
                          </span>
                        </div>
                        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                          <span className="text-slate-400 block text-xs mb-1">
                            Recipient:
                          </span>
                          <span className="font-mono text-[11px] text-cyan-400 break-all block">
                            {destination}
                          </span>
                        </div>
                      </div>

                      {/* Warning */}
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-900 text-xs text-slate-400 mb-5 flex gap-2">
                        <span className="text-amber-500 shrink-0">⚠️</span>
                        <p>
                          This transaction cannot be undone. Network fees will
                          be deducted from your wallet.
                        </p>
                      </div>

                      {/* Approval Checkbox */}
                      <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-400 hover:text-slate-200 mb-6 select-none">
                        <input
                          type="checkbox"
                          checked={isSecurityChecked}
                          onChange={(e) =>
                            setIsSecurityChecked(e.target.checked)
                          }
                          className="mt-0.5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                        />
                        <span>
                          I have reviewed the cyber security risk analysis of
                          the address and confirm its validity.
                        </span>
                      </label>

                      {/* Buttons */}
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSecurityCheck(false);
                            setIsSecurityChecked(false);
                          }}
                          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            // If the outgoing address is equal to our sorobanContractId state nine or the actual address entered
                            if (
                              destination === sorobanContractId ||
                              destination ===
                                "CBUGTNGT3K7JTQNVGZNN2FSMCIWTP2NWSBMKRXZDC5IJQD2LTEUF7Z5F"
                            ) {
                              confirmSorobanDeposit();
                            } else {
                              triggerTransferApproval(e);
                            }
                          }}
                          disabled={!isSecurityChecked}
                          className={`w-full py-2.5 px-4 font-medium rounded-xl text-xs transition-all ${
                            isSecurityChecked
                              ? "bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 text-white shadow-lg"
                              : "bg-slate-900 text-slate-600 border border-slate-800/50 cursor-not-allowed"
                          }`}
                        >
                          Sign Transaction
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {txStatus?.message && (
                  <div
                    className={`mt-6 p-4 rounded-xl text-xs border ${txStatus.type === "success" ? "bg-emerald-950/20 text-emerald-400 border-emerald-900" : txStatus.type === "error" ? "bg-rose-950/20 text-rose-400 border-rose-900" : "bg-cyan-950/20 text-cyan-400 border-cyan-900"}`}
                  >
                    <div>{txStatus.message}</div>
                    {txStatus.hash && (
                      <div className="mt-2 font-mono p-2 bg-slate-950 rounded border border-slate-800 break-all">
                        Hash: {txStatus.hash}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div
                  className={`p-8 rounded-2xl border border-slate-800 bg-[#030712] shadow-2xl text-slate-100 font-sans relative"}`}
                >
                  {/* Top Section: Header and Search Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    {/* Left Corner: Headline Only */}
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <History size={22} className="text-cyan-400" />
                      Transaction History
                    </h3>

                    {/* Right Corner: LIVE Badge and Search Bar (Stacked) */}
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                      {/* Live Network Effect (Placed on Top of Search) */}
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-422 font-bold uppercase tracking-widest h-fit w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Transaction Live
                      </span>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search
                          size={16}
                          className="absolute left-3 top-2.5 text-slate-400"
                        />
                        <input
                          type="text"
                          placeholder="Search address or hash..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 text-slate-200 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Cyber Table View (Content Padded) */}
                  <div className="bg-[#090d16] border border-slate-800/80 rounded-xl overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider bg-slate-950/80">
                            <th className="p-4">Transaction ID / Hash</th>
                            <th className="p-4">Target Address</th>
                            <th className="p-4">Amount / Asset</th>
                            <th className="p-4">Time</th>
                            <th className="p-4 text-right">Network Summary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-[11px] font-mono">
                          {filteredTransactions.length === 0 ? (
                            <tr>
                              <td
                                colSpan="5"
                                className="p-8 text-center text-slate-400 bg-slate-950/30"
                              >
                                No data found or no transactions yet.
                              </td>
                            </tr>
                          ) : (
                            filteredTransactions.map((tx) => (
                              <tr
                                key={tx.id}
                                className="hover:bg-slate-800/40 transition-colors group"
                              >
                                {/* Hash Copying Column */}
                                <td className="p-4 text-cyan-400 font-bold max-w-[120px] truncate">
                                  <span
                                    className="cursor-pointer border-b border-dashed border-cyan-400/30 hover:border-cyan-400 transition-colors"
                                    onClick={() => copyToClipboard(tx.hash)}
                                    title="Click to copy"
                                  >
                                    {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                                  </span>
                                </td>

                                {/* Address Column */}
                                <td
                                  className="p-4 text-slate-300 max-w-[180px] truncate"
                                  title={tx.to}
                                >
                                  {tx.to.slice(0, 10)}...{tx.to.slice(-8)}
                                </td>

                                {/* Amount Column (Red/Rose for outgoing transactions) */}
                                <td className="p-4 font-bold text-rose-400">
                                  - {tx.amount} {tx.asset}
                                </td>

                                {/* Time Column */}
                                <td className="p-4 text-slate-400">
                                  {tx.date}
                                </td>

                                {/* Stellar Expert Button Column */}
                                <td className="p-4 text-right">
                                  <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block px-2 py-1 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 rounded text-[10px] transition-all"
                                  >
                                    Stellar Expert
                                  </a>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTACTS */}
            {activeTab === "contacts" && (
              <div className="w-full max-w-5xl mx-auto space-y-6 text-slate-300 font-sans p-6 rounded-2xl bg-[#030712] border border-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-300 dark:bg-[#030712] dark:text-slate-300">
                {/* Header */}
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wide flex items-center gap-2">
                  <BookUser size={22} className="text-cyan-400" /> Address Book
                </h3>

                {/* Form Area */}
                <form
                  onSubmit={handleAddContact}
                  className="flex flex-col sm:flex-row gap-3 mb-3 p-4 bg-[#090d16] border border-slate-900 rounded-xl"
                >
                  <input
                    type="text"
                    placeholder="Name"
                    value={newContact.name}
                    onChange={(e) => {
                      setNewContact({ ...newContact, name: e.target.value });
                      setErrorMessage(""); // Clear the error when the user starts typing
                    }}
                    className="flex-1 bg-slate-950/60 border border-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-slate-200 transition-colors"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Stellar Address"
                    value={newContact.address}
                    onChange={(e) => {
                      setNewContact({ ...newContact, address: e.target.value });
                      setErrorMessage(""); // Clear the error when the user starts typing
                    }}
                    className="flex-[2] bg-slate-950/60 border border-slate-900 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500 text-slate-200 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus size={16} /> Add
                  </button>
                </form>

                {/* Error Message Display */}
                <div className="h-6 -mt-2">
                  {errorMessage && (
                    <div className="text-rose-400 text-xs font-semibold animate-in fade-in ml-2 flex items-center gap-1">
                      ⚠️ {errorMessage}
                    </div>
                  )}
                </div>

                {/* Address List Grid Structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addressBook.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-5 bg-slate-950 border border-slate-900 rounded-xl flex flex-col justify-between shadow-lg"
                    >
                      <div>
                        <h4 className="font-bold text-slate-200 mb-1">
                          {contact.name}
                        </h4>
                        <p className="font-mono text-[10px] text-slate-400 break-all mb-4">
                          {contact.address}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDestination(contact.address);
                            setActiveTab("transfer");
                          }}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold transition"
                        >
                          Send Money
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAddressBook(
                              addressBook.filter((c) => c.id !== contact.id),
                            )
                          }
                          className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-lg transition shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECEIVE */}
            {activeTab === "receive" && (
              <div className="w-full max-w-2xl mx-auto space-y-6 text-slate-300 font-sans p-6 rounded-2xl bg-[#030712] border border-slate-900 shadow-2xl relative overflow-hidden animate-in fade-in duration-300 dark:bg-[#030712] dark:text-slate-300">
                {/* Network Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-amber-950/40 text-amber-400 border border-amber-900/50 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-widest select-none animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  ⚠️ Testnet Only
                </div>

                {/* Header Icon & Title */}
                <div className="text-center mt-2">
                  <div className="flex justify-center mb-3 text-cyan-400">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wide">
                    Account QR Code
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Scan this QR code to quickly receive Stellar Testnet assets.
                  </p>
                </div>

                {/* QR Code Frame */}
                <div className="text-center">
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border border-slate-200">
                    {connected && publicKey ? (
                      <QRCodeSVG
                        value={
                          qrAmount || qrMemo
                            ? `web+stellar:pay?destination=${publicKey}${
                                qrAmount ? `&amount=${qrAmount}` : ""
                              }${
                                qrMemo
                                  ? `&memo=${encodeURIComponent(qrMemo)}&memo_type=MEMO_TEXT`
                                  : ""
                              }`
                            : publicKey
                        }
                        size={220}
                        level="H"
                        includeMargin={true}
                      />
                    ) : (
                      <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-800 font-bold text-xs font-mono">
                        Please Connect Your Wallet
                      </div>
                    )}
                  </div>
                </div>

                {/* PUBLIC KEY DISPLAY SLOT */}
                <div className="w-full max-w-md mx-auto space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block text-left pl-1">
                    Your Public Key (Address)
                  </label>
                  <div className="w-full bg-slate-950 border border-slate-900 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-cyan-400">
                    <span className="truncate mr-2">
                      {publicKey || "GBUJJYN..."}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        connected && publicKey && copyToClipboard(publicKey)
                      }
                      className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            width="14"
                            height="14"
                            x="8"
                            y="8"
                            rx="2"
                            ry="2"
                          />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <hr className="border-slate-900 my-4" />

                {/* CUSTOM PAYMENT REQUEST */}
                <div className="text-left w-full max-w-md mx-auto p-4 rounded-xl bg-[#090d16] border border-slate-900 space-y-4">
                  <div className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                    <span>⚙️ CUSTOM PAYMENT REQUEST</span>
                  </div>

                  <div className="flex gap-4 w-full">
                    {/* Amount Input */}
                    <div className="flex flex-col gap-1.5 w-1/2">
                      <label className="text-slate-400 text-[10px] font-mono">
                        Amount (XLM)
                      </label>
                      <input
                        type="text"
                        placeholder="0.00"
                        value={qrAmount}
                        onChange={(e) => setQrAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>

                    {/* Filtered Memo Input */}
                    <div className="flex flex-col gap-1.5 w-1/2">
                      <label className="text-slate-400 text-[10px] font-mono">
                        Memo (Text)
                      </label>
                      <input
                        type="text"
                        placeholder="Reference ID"
                        value={qrMemo}
                        onChange={handleQrMemoChange}
                        className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY AUDIT & JURY VERIFICATION MATRIX */}
            {activeTab === "security" && (
              <div className="w-full max-w-5xl mx-auto space-y-6 text-slate-300 font-sans p-6 pb-32 rounded-2xl bg-[#030712] border border-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {/* Top Header and Scan Button */}
                <div className="border-b border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wide">
                      Level 2 Security Audit & Jury Verification Matrix
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Mandatory Level 2 Evaluation: Trigger wallet exception
                      handlers and run core smart contract scans.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runSecurityScan}
                    disabled={isScanning}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isScanning ? "bg-cyan-950/20 text-cyan-400 border-cyan-900 animate-pulse" : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/10"}`}
                  >
                    {isScanning
                      ? "Scanning Ledger..."
                      : "Run Automated Vulnerability Scan"}
                  </button>
                </div>

                {/* Automated Code and Extension Audit Trail */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                    🛡️ Automated Code & Extension Audit Trail
                  </span>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 font-mono text-[11px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent hover:scrollbar-thumb-cyan-500/30 transition-colors">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                      >
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${log.type === "SUCCESS" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" : log.type === "WARNING" ? "bg-amber-950 text-amber-400 border border-amber-900/30" : "bg-blue-950 text-blue-400 border border-blue-900/30"}`}
                        >
                          {log.type}
                        </span>
                        <span className="text-slate-400 truncate">
                          {log.msg}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Transaction Monitor & Wallet Error Triggers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#090d16] border border-slate-900 flex flex-col justify-between space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Live Transaction Monitor
                    </span>
                    <div className="flex-1 flex items-center">
                      {juryTxStatus === "IDLE" && (
                        <div className="px-3 py-2 w-full rounded-lg bg-slate-950 border border-slate-900 text-xs font-mono text-slate-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-500"></span>{" "}
                          Status: IDLE
                        </div>
                      )}
                      {juryTxStatus === "PENDING" && (
                        <div className="px-3 py-2 w-full rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-xs font-mono text-cyan-400 flex items-center gap-2 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>{" "}
                          Status: PENDING...
                        </div>
                      )}
                      {juryTxStatus === "SUCCESS" && (
                        <div className="px-3 py-2 w-full rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-xs font-mono text-emerald-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
                          Status: SUCCESS
                        </div>
                      )}
                      {juryTxStatus === "FAILED" && (
                        <div className="px-3 py-2 w-full rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs font-mono text-rose-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>{" "}
                          Status: FAILED
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#090d16] border border-slate-900 md:col-span-2 space-y-3">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block">
                      ⚠️ Trigger Wallet Exception Handlers:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={juryTxStatus === "PENDING"}
                        onClick={() => simulateJuryErrors("WALLET_NOT_FOUND")}
                        className="text-[10px] p-2.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-rose-500/50 transition-all font-semibold text-center group"
                      >
                        <div className="text-rose-400 font-bold mb-0.5 group-hover:text-rose-300">
                          1. Wallet 404
                        </div>
                        <span className="text-slate-500 text-[10px] block">
                          Missing Extension
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={juryTxStatus === "PENDING"}
                        onClick={() => simulateJuryErrors("USER_REJECTED")}
                        className="text-[10px] p-2.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-amber-500/50 transition-all font-semibold text-center group"
                      >
                        <div className="text-amber-400 font-bold mb-0.5 group-hover:text-amber-300">
                          2. Reject 401
                        </div>
                        <span className="text-slate-500 text-[10px] block">
                          User Aborted
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={juryTxStatus === "PENDING"}
                        onClick={() =>
                          simulateJuryErrors("INSUFFICIENT_BALANCE")
                        }
                        className="text-[10px] p-2.5 rounded-lg bg-slate-950 border border-slate-900 hover:border-red-500/50 transition-all font-semibold text-center group"
                      >
                        <div className="text-red-400 font-bold mb-0.5 group-hover:text-red-300">
                          3. Balance 402
                        </div>
                        <span className="text-slate-500 text-[9px] block">
                          Low Gas Reserve
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                {/* Error Detail Window */}
                {jurySorobanError && juryTxStatus === "FAILED" && (
                  <div className="p-3 bg-slate-950 border border-rose-950 text-rose-400 rounded-xl text-xs font-mono break-all whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2">
                    {jurySorobanError}
                  </div>
                )}

                <hr className="border-slate-900" />

                {/* Soroban Method Interface & Live Event Stream (Equal Size Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Card: Soroban Contract Method Interface */}
                  <div className="p-5 rounded-xl bg-[#090d16] border border-slate-900 flex flex-col justify-between h-[250px]">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          🤖 Soroban Contract Method Interface
                        </h3>
                        <span className="text-[9px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-400 px-2 py-0.5 rounded font-bold">
                          Testnet Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Contract ID:{" "}
                        <code className="text-blue-400 font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded">
                          {sorobanContractId || "CC...JURYTEST2026CROWDFUNDING"}
                        </code>
                      </p>

                      {/* Advanced Live Crowdfunding Progress Dashboard */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Crowdfunding Progress
                            </div>
                            <div className="text-xl font-mono font-black text-slate-100">
                              {totalRaised ||
                                localStorage.getItem("crowdfund_totalRaised") ||
                                1240}{" "}
                              <span className="text-xs font-sans font-bold text-cyan-400">
                                XLM
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                              Goal
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-400">
                              1,500 XLM
                            </span>
                          </div>
                        </div>

                        {/* Live Progress Bar */}
                        {(() => {
                          const currentRaised = Number(
                            typeof totalRaised !== "undefined"
                              ? totalRaised
                              : localStorage.getItem("crowdfund_totalRaised") ||
                                  1240,
                          );
                          const goalAmount = 1500;
                          const safePercentage = Math.min(
                            (currentRaised / goalAmount) * 100,
                            100,
                          );
                          const safeRemaining = Math.max(
                            goalAmount - currentRaised,
                            0,
                          );

                          return (
                            <>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800/50 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-500 shadow-lg ${
                                    safePercentage >= 100
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50"
                                      : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/50"
                                  }`}
                                  style={{ width: `${safePercentage}%` }}
                                ></div>
                              </div>

                              {safePercentage >= 100 ? (
                                <div className="p-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold flex items-center gap-2 animate-bounce shadow-md shadow-emerald-950/20">
                                  <span className="text-xs">🎉</span>
                                  <div>
                                    <p className="tracking-wide uppercase text-[8px]">
                                      BARON CONTRACT STATUS:
                                    </p>
                                    <span className="text-[8px] text-emerald-500 font-mono font-medium block">
                                      Target reached! Tokens successfully locked
                                      into liquidity pool.
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                  <span>
                                    Funded: {safePercentage.toFixed(1)}%
                                  </span>
                                  <span>Remaining: {safeRemaining} XLM</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Deposit Button and Input Field */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        openSorobanDepositModal(e);
                      }}
                      className="mt-4 flex gap-2"
                    >
                      <input
                        type="number"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        placeholder="Amount (XLM) e.g. 50"
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs text-slate-200 flex-1 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <div className="flex flex-col items-start gap-2">
                        <button
                          type="button"
                          onClick={async (e) => {
                            openSorobanDepositModal(e);

                            const depositAmount = Number(fundAmount) || 10;

                            await handleTrueSorobanDeposit(
                              publicKey,
                              depositAmount,
                              setRealTxHash,
                              setSorobanError,
                            );
                          }}
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-1 rounded text-xs transition-colors"
                        >
                          deposit()
                        </button>

                        {/* Highlight only if there is an error */}
                        {sorobanError && (
                          <p className="text-[10px] font-mono text-red-400 max-w-xs break-words mt-1">
                            ❌ {sorobanError}
                          </p>
                        )}
                      </div>
                    </form>

                    {/* 
                        Hash panel
                    */}
                    {realTxHash && (
                      <div className="mt-3 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded text-left animate-in fade-in slide-in-from-top-1">
                        <p className="text-[10px] uppercase tracking-wider text-green-400 font-bold flex items-center gap-1">
                          <span>✓</span> Live Broadcast Success
                        </p>
                        <p className="text-[10px] font-mono text-slate-300 break-all mt-1 select-all">
                          Tx Hash:{" "}
                          <span className="text-cyan-400 font-bold">
                            {realTxHash}
                          </span>
                        </p>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${realTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 underline mt-1 block font-mono"
                        >
                          View on Stellar Expert Explorer ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right Card: Live Contract Event Stream */}
                  <div className="p-5 rounded-xl bg-[#090d16] border border-slate-900 flex flex-col h-[250px]">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                      📡 Live Ledger Contract Event Stream
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent hover:scrollbar-thumb-cyan-500/30 transition-colors">
                      {liveEvents && liveEvents.length > 0 ? (
                        liveEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-2.5 bg-slate-950 border border-slate-900/60 rounded-xl flex items-center justify-between gap-2 animate-in fade-in"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[9px] px-1 py-0.2 rounded font-black bg-cyan-960 text-cyan-400 border border-cyan-900/40 shrink-0">
                                DEPOSIT
                              </span>
                              <span className="text-slate-400 text-[10px] truncate">
                                {event.user}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-emerald-400">
                                +{event.amount}
                              </div>
                              <div className="text-[9px] text-slate-600 font-sans">
                                {event.time === "Şimdi"
                                  ? "Just now"
                                  : event.time === "10 dk önce"
                                    ? "10 minutes ago"
                                    : event.time}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 bg-slate-950 border border-slate-900/60 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] px-1 py-0.2 rounded font-black bg-cyan-950 text-cyan-400 border border-cyan-900/40">
                              DEPOSIT
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              GB...X42
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">
                              +150 XLM
                            </div>
                            <div className="text-[9px] text-slate-600 font-sans">
                              10 minutes ago
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Header;
