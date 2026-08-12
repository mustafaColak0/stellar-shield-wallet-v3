import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Activity,
  Users,
  Zap,
  ShieldCheck,
  Radio,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
} from "lucide-react";
import {
  TransactionBuilder,
  Networks,
  xdr,
  scValToNative,
} from "@stellar/stellar-sdk";

// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CDQUFGNQGT3CYQYNM4DUNZRLBARAXWNGJQW466OYZOODPHLXT2Z3AXMI";
const REFRESH_INTERVAL = 10000;
const EVENT_LOOKBACK_LEDGERS = 5000;
const EVENT_PAGE_LIMIT = 200;
const MAX_EVENT_PAGES = 10;
const MAX_VISIBLE_LOGS = 50;

const STORAGE_KEY = "live_panel_local_feedbacks_v1";

const DEFAULT_FEEDBACKS = [
  {
    id: 1,
    wallet: "GAQVXWJ6QWNV...CCULBY4UN4",
    type: "POSITIVE",
    comment: "Arayüz hızı ve ağ senkronizasyonu harika çalışıyor!",
    date: "5 dk önce",
  },
  {
    id: 2,
    wallet: "CDQUFGNQGT3C...LXT2Z3AXMI",
    type: "NEGATIVE",
    comment: "Ağ yoğunluğuna bağlı olarak latency zaman zaman yükselebiliyor.",
    date: "25 dk önce",
  },
];

// ============================================================
// RPC & HELPER UTILS
// ============================================================

async function rpcRequest(method, params, signal) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      method,
      ...(params ? { params } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Stellar RPC HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "Unknown Stellar RPC error");
  }

  return data.result;
}

function decodeScVal(value) {
  if (!value) return null;
  try {
    const scVal = xdr.ScVal.fromXDR(value, "base64");
    return scValToNative(scVal);
  } catch (error) {
    console.warn("⚠️ Soroban ScVal decode failed:", error);
    return null;
  }
}

function shortenWallet(wallet) {
  if (!wallet || wallet === "UNKNOWN") return "UNKNOWN";
  if (wallet.length < 12) return wallet;
  return `${wallet.slice(0, 5)}...${wallet.slice(-4)}`;
}

function formatRelativeTime(dateString) {
  if (!dateString) return "Unknown";
  const eventDate = new Date(dateString);
  const diffSeconds = Math.max(0, Math.floor((Date.now() - eventDate.getTime()) / 1000));

  if (diffSeconds < 60) return "Just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

async function mapWithConcurrencyLimit(items, limit, fn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// ============================================================
// COMPONENT
// ============================================================

export default function LiveAnalyticsPanel({ activeWalletAddress }) {
  const [userLogs, setUserLogs] = useState([]);
  const [latency, setLatency] = useState(null);
  const [rpcHealthy, setRpcHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // YORUM STATE'İ (localStorage destekli)
  const [feedbacks, setFeedbacks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_FEEDBACKS;
    } catch (e) {
      console.warn("localStorage okuma hatası:", e);
      return DEFAULT_FEEDBACKS;
    }
  });

  const [newComment, setNewComment] = useState("");
  const [feedbackType, setFeedbackType] = useState("POSITIVE");
  const [feedbackFilter, setFeedbackFilter] = useState("ALL");

  const walletCache = useRef(new Map());
  const refreshingRef = useRef(false);

  // Yorumlar değiştikçe otomatik olarak yerel hafızaya kaydet
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
    } catch (e) {
      console.warn("localStorage yazma hatası:", e);
    }
  }, [feedbacks]);

  // ----------------------------------------------------------
  // COMPUTED STATS
  // ----------------------------------------------------------

  const verifiedUsersCount = useMemo(() => {
    const wallets = new Set(
      userLogs
        .map((log) => log.fullWallet)
        .filter((wallet) => wallet && wallet !== "UNKNOWN")
    );
    return wallets.size;
  }, [userLogs]);

  const todayInteractions = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return userLogs.filter((log) => {
      if (!log.timestamp) return false;
      return new Date(log.timestamp) >= todayStart;
    }).length;
  }, [userLogs]);

  const filteredFeedbacks = useMemo(() => {
    if (feedbackFilter === "POSITIVE") return feedbacks.filter((f) => f.type === "POSITIVE");
    if (feedbackFilter === "NEGATIVE") return feedbacks.filter((f) => f.type === "NEGATIVE");
    return feedbacks;
  }, [feedbacks, feedbackFilter]);

  // ----------------------------------------------------------
  // RESOLVE SOURCE WALLET
  // ----------------------------------------------------------

  const resolveSourceWallet = useCallback(async (txHash, signal) => {
    if (!txHash) return "UNKNOWN";
    if (walletCache.current.has(txHash)) {
      return walletCache.current.get(txHash);
    }

    try {
      const transactionResult = await rpcRequest("getTransaction", { hash: txHash }, signal);

      if (
        !transactionResult ||
        transactionResult.status !== "SUCCESS" ||
        !transactionResult.envelopeXdr
      ) {
        return "UNKNOWN";
      }

      const parsedTransaction = TransactionBuilder.fromXDR(
        transactionResult.envelopeXdr,
        Networks.TESTNET
      );

      let sourceWallet = parsedTransaction.source || "UNKNOWN";
      if (parsedTransaction.innerTransaction?.source) {
        sourceWallet = parsedTransaction.innerTransaction.source;
      }

      walletCache.current.set(txHash, sourceWallet);
      return sourceWallet;
    } catch (error) {
      if (error.name === "AbortError") return "UNKNOWN";
      console.warn("⚠️ Source wallet resolve warning:", txHash, error);
      return "UNKNOWN";
    }
  }, []);

  // ----------------------------------------------------------
  // FETCH CONTRACT EVENTS
  // ----------------------------------------------------------

  const fetchContractEvents = useCallback(async (startLedger, signal) => {
    let collectedEvents = [];
    let cursor = null;

    for (let page = 0; page < MAX_EVENT_PAGES; page++) {
      const params = {
        filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
        pagination: { limit: EVENT_PAGE_LIMIT },
      };

      if (!cursor) {
        params.startLedger = startLedger;
      } else {
        params.pagination.cursor = cursor;
      }

      const result = await rpcRequest("getEvents", params, signal);
      const events = Array.isArray(result?.events) ? result.events : [];
      collectedEvents.push(...events);

      if (events.length < EVENT_PAGE_LIMIT) break;
      if (!result?.cursor || result.cursor === cursor) break;

      cursor = result.cursor;
    }

    return Array.from(
      new Map(collectedEvents.map((e) => [e.id, e])).values()
    );
  }, []);

  // ----------------------------------------------------------
  // MAIN SYNC LOGIC
  // ----------------------------------------------------------

  const fetchLiveAnalytics = useCallback(async (signal) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      setIsRefreshing(true);
      setErrorMessage("");

      const startTime = performance.now();
      const latestLedgerResponse = await rpcRequest("getLatestLedger", null, signal);
      const endTime = performance.now();

      const measuredLatency = Math.max(0, Math.round(endTime - startTime));
      setLatency(measuredLatency);

      if (!latestLedgerResponse || typeof latestLedgerResponse.sequence !== "number") {
        throw new Error("Latest Stellar ledger could not be retrieved.");
      }

      setRpcHealthy(true);
      const latestLedger = latestLedgerResponse.sequence;
      const startLedger = Math.max(1, latestLedger - EVENT_LOOKBACK_LEDGERS);

      const allEvents = await fetchContractEvents(startLedger, signal);

      const feedbackEvents = allEvents.filter((event) => {
        if (!Array.isArray(event.topic) || event.topic.length === 0) return false;
        const eventName = decodeScVal(event.topic[0]);
        return eventName === "fb_live";
      });

      feedbackEvents.sort((a, b) => {
        return new Date(b.ledgerClosedAt).getTime() - new Date(a.ledgerClosedAt).getTime();
      });

      const visibleEvents = feedbackEvents.slice(0, MAX_VISIBLE_LOGS);

      const logs = await mapWithConcurrencyLimit(visibleEvents, 5, async (event) => {
        const sourceWallet = await resolveSourceWallet(event.txHash, signal);
        const payload = decodeScVal(event.value);
        const feedbackId = event.topic?.[1] ? decodeScVal(event.topic[1]) : null;

        const isDepositDemo =
          typeof payload === "string" && payload.startsWith("Simulated deposit of ");

        return {
          eventId: event.id,
          fullWallet: sourceWallet,
          wallet: shortenWallet(sourceWallet),
          action: isDepositDemo ? "soroban_demo" : "create_feedback",
          status: "Confirmed",
          timestamp: event.ledgerClosedAt,
          time: formatRelativeTime(event.ledgerClosedAt),
          txHash: event.txHash,
          feedbackId,
          ledger: event.ledger,
          payload,
          contractId: event.contractId,
        };
      });

      const uniqueLogs = Array.from(
        new Map(logs.map((log) => [log.eventId, log])).values()
      );

      setUserLogs(uniqueLogs);
      setLastUpdated(new Date());
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("❌ Live Analytics Error:", error);
      setErrorMessage(error?.message || "Live Stellar analytics could not be loaded.");
      setRpcHealthy(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [fetchContractEvents, resolveSourceWallet]);

  // ----------------------------------------------------------
  // AUTO REFRESH HOOK
  // ----------------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();
    
    fetchLiveAnalytics(controller.signal);

    const interval = setInterval(() => {
      fetchLiveAnalytics(controller.signal);
    }, REFRESH_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchLiveAnalytics]);

  // ----------------------------------------------------------
  // HANDLERS FOR FEEDBACK (Sadece Yerel State + LocalStorage)
  // ----------------------------------------------------------

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const walletToUse = activeWalletAddress || "GAQVXWJ6QWNV...CCULBY4UN4";

    const item = {
      id: Date.now(),
      wallet: shortenWallet(walletToUse),
      type: feedbackType,
      comment: newComment.trim(),
      date: "Just now",
    };

    setFeedbacks((prev) => [item, ...prev]);
    setNewComment("");
  };

  // ----------------------------------------------------------
  // RENDER UI
  // ----------------------------------------------------------

  return (
    <div className="w-full mt-8 p-5 md:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md text-white">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                Live On-Chain Analytics & User Validation
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Real Stellar Testnet contract events, verified source wallets and transaction proofs.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => fetchLiveAnalytics()}
            disabled={isRefreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync Network</span>
          </button>

          {/* RPC Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs font-medium text-slate-300">
            <Radio
              className={`w-4 h-4 ${
                rpcHealthy ? "text-emerald-400 animate-pulse" : "text-rose-400"
              }`}
            />
            <span>
              RPC:{" "}
              <strong className={rpcHealthy ? "text-emerald-400" : "text-rose-400"}>
                {rpcHealthy ? "Available" : "Unavailable"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        {/* VERIFIED USERS */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Verified Unique Wallets
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {verifiedUsersCount}
            </span>
            <span
              className={`text-xs font-medium ${
                verifiedUsersCount >= 20 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {verifiedUsersCount >= 20
                ? "20+ target reached ✓"
                : `${verifiedUsersCount}/20 target`}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Unique wallets verified from real Soroban transactions
          </div>
        </div>

        {/* INTERACTIONS */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Today's On-Chain Interactions
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {todayInteractions}
            </span>
            <span className="text-xs text-blue-400 font-medium">Verified</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Confirmed fb_live contract events
          </div>
        </div>

        {/* RPC LATENCY */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Soroban RPC Latency
            </span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {Number.isFinite(latency) ? latency : "--"}
            </span>
            <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Real browser → Stellar Testnet RPC round-trip
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* STREAM TABLE */}
      <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Verified User & Contract Interaction Stream — Level 4 Proof
          </span>
          <span className="text-[11px] text-slate-400">
            {lastUpdated
              ? `Auto-refresh • ${lastUpdated.toLocaleTimeString()}`
              : "Connecting to Stellar RPC..."}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">User Wallet</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Executed Action</th>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5 text-right">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {loading && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-10 text-center text-cyan-400 animate-pulse"
                  >
                    Reading verified Soroban events from Stellar Testnet...
                  </td>
                </tr>
              )}

              {!loading && userLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-slate-500">
                    No verified user interaction has been detected yet.
                    <br />
                    New Soroban interactions will appear here automatically.
                  </td>
                </tr>
              )}

              {!loading &&
                userLogs.map((log) => (
                  <tr
                    key={log.eventId}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span
                          className="font-semibold text-slate-200"
                          title={log.fullWallet}
                        >
                          {log.wallet}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        Confirmed
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 font-sans">
                      <code className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-blue-400 border border-slate-700/50">
                        {log.action}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 font-sans whitespace-nowrap">
                      {log.time}
                    </td>
                    <td className="px-4 py-2.5 text-right font-sans">
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={log.txHash}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700"
                      >
                        Explorer
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CANLI TOPLULUK GERİ BİLDİRİM & YORUM TABLOSU (LOCALSTORAGE) */}
      {/* ============================================================ */}
      <div className="mt-8 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Community Feedback & Wallet Reviews
            </h3>
          </div>

          <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setFeedbackFilter("ALL")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                feedbackFilter === "ALL"
                  ? "bg-cyan-500/20 text-cyan-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFeedbackFilter("POSITIVE")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                feedbackFilter === "POSITIVE"
                  ? "bg-emerald-500/20 text-emerald-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              👍 Positive
            </button>
            <button
              type="button"
              onClick={() => setFeedbackFilter("NEGATIVE")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                feedbackFilter === "NEGATIVE"
                  ? "bg-rose-500/20 text-rose-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              👎 Negative
            </button>
          </div>
        </div>

        {/* Yorum Ekleme Formu */}
        <form onSubmit={handleAddComment} className="my-5 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono text-slate-400">
              Author Wallet:{" "}
              <strong className="text-slate-200">
                {activeWalletAddress ? shortenWallet(activeWalletAddress) : "GAQV...4UN4"}
              </strong>
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFeedbackType("POSITIVE")}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  feedbackType === "POSITIVE"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-semibold"
                    : "border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                <ThumbsUp className="w-3 h-3" /> Positive
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType("NEGATIVE")}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  feedbackType === "NEGATIVE"
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400 font-semibold"
                    : "border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                <ThumbsDown className="w-3 h-3" /> Negative
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Leave feedback with your wallet address..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Submit
            </button>
          </div>
        </form>

        {/* Yorumlar Akış Tablosu */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 font-mono">
              No comments found in this category.
            </div>
          ) : (
            filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-start justify-between gap-4 text-xs font-mono hover:border-slate-700/60 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-cyan-400">{fb.wallet}</span>
                    <span className="text-[10px] text-slate-500">{fb.date}</span>
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed">{fb.comment}</p>
                </div>

                <div className="shrink-0">
                  {fb.type === "POSITIVE" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-sans">
                      <ThumbsUp className="w-3 h-3" /> Positive
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-sans">
                      <ThumbsDown className="w-3 h-3" /> Negative
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}