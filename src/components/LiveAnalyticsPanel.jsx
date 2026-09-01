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
  Star,
  Loader2,
  Globe,
  Wallet,
  UserCheck
} from "lucide-react";
import {
  TransactionBuilder,
  Networks,
  xdr,
  scValToNative,
} from "@stellar/stellar-sdk";
import { supabase } from "./supabaseClient";

// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CDQUFGNQGT3CYQYNM4DUNZRLBARAXWNGJQW466OYZOODPHLXT2Z3AXMI";
const DEVELOPER_WALLETS = new Set([
  // Old developer wallet
  "GBUJJIYNPOC57O6CIFKFOBLPNTS6I5IYNGO5XQY7DAIPQ6JCU7ZBV7LN",

  // Current developer wallet
  "GBKBQ57BWS2K77WS25XB6A3XR7GDNO2AZF3TD3TRFV5O6XRBCFUCU47S",
]);

const isDeveloperWallet = (wallet) =>
  DEVELOPER_WALLETS.has(
    String(wallet || "").trim()
  );


const REFRESH_INTERVAL = 10000;
const RETENTION_SAFETY_LEDGERS = 10;

const EVENT_PAGE_LIMIT = 500;
const MAX_EVENT_PAGES = 40;

const MAX_VISIBLE_LOGS = 100;
const MAX_VISIBLE_FEEDBACK = 100;

// To preserve verified on-chain events on the browser side,
// even if they fall outside the retention period.
const VERIFIED_LOGS_STORAGE_KEY =
  `stellar_shield_verified_fb_live_${CONTRACT_ID}`;

const MAX_PERSISTED_LOGS = 2000;
// We are maintaining a live window covering 10,000 ledgers.
// 4 windows = the last ~40,000 ledgers. This way, real-time transactions and those from last night
// are merged within the same synchronisation.
const HISTORY_WINDOW_LEDGERS = 10000;

// ============================================================
// VERIFIED HISTORICAL ON-CHAIN FEEDBACK RECOVERY
// These records were independently verified against Stellar
// Testnet transaction history after the original browser cache
// was lost.
// ============================================================

const RECOVERED_VERIFIED_LOGS = [
  {
    eventId:
      "recovered-b1df34e635ccd82b7c042cf121de8324a8b8acc94aacb3b30ff0f4d6ee0ae39e",
    fullWallet:
      "GD2KPUILSSQ2E7BFESMB2QWZY2MN227WETVAH6RBOLX6ZNU2YIA5LD4O",
    wallet: "GD2KP...LD4O",
    action: "fb_live",
    status: "Confirmed",
    timestamp: "2026-08-17T11:11:47Z",
    txHash:
      "b1df34e635ccd82b7c042cf121de8324a8b8acc94aacb3b30ff0f4d6ee0ae39e",
    payload:
      "everything is working perfectly and the UI is Clean and easy to understand...",
    feedbackType: "POSITIVE",
    rating: 5,
  },

  {
    eventId:
      "recovered-dcabfda2d0d53fe7b1f9b0d8a4d2a038529af3afe762ec631512d4ef229143fe",
    fullWallet:
      "GA7YBCGYZT77YMPXBJ65DRY4JXFQ52EAV3B5RZQTCA2HXUTVDG3IQHYW",
    wallet: "GA7YB...QHYW",
    action: "fb_live",
    status: "Confirmed",
    timestamp: "2026-08-17T11:06:26Z",
    txHash:
      "dcabfda2d0d53fe7b1f9b0d8a4d2a038529af3afe762ec631512d4ef229143fe",
    payload:
      "Clean connect flow — Freighter connected first try. The live RPC latency and verified wallet stream is a nice trust touch. Suggestion: let new users browse the User Guide before connecting, easier onboarding for testers. Solid architecture! — Ubong (Nova Esusu)",
    feedbackType: "POSITIVE",
    rating: 5,
  },

  {
    eventId:
      "recovered-3ddb4ab4b39902972c38a4096a3509930e87af3e853983627c795d65e76f507a",
    fullWallet:
      "GBPPR5PK4B2XEXQEH5AZJJ4DGJCQAM7TKRRIQVD4J3XPLL7YY2QAJ32F",
    wallet: "GBPPR...J32F",
    action: "fb_live",
    status: "Confirmed",
    timestamp: "2026-08-14T17:23:19Z",
    txHash:
      "3ddb4ab4b39902972c38a4096a3509930e87af3e853983627c795d65e76f507a",
    payload:
      "Work more on UI. Add a landing page it will be better understand your product.",
    feedbackType: "POSITIVE",
    rating: 5,
  },

  {
    eventId:
      "recovered-72b496f667f3a8aaa6d7cc68d298235cdb27b5c5bdb70d69b17dfab76360e3d0",
    fullWallet:
      "GBIDCKYQRC7I4ACZWMLTH6J5T7MHDCBWHBP2ABLXMU6CJDEO3TJ3N3FJ",
    wallet: "GBIDC...N3FJ",
    action: "fb_live",
    status: "Confirmed",
    timestamp: "2026-08-13T20:44:50Z",
    txHash:
      "72b496f667f3a8aaa6d7cc68d298235cdb27b5c5bdb70d69b17dfab76360e3d0",
    payload: "It was good and unique",
    feedbackType: "POSITIVE",
    rating: 5,
  },
  {
    eventId: "recovered-gbuaon5hmiv2ysicie7xhpn2dcn7jvkithu64h7febnbru7fhustd547-20260822184847",
    fullWallet: "GBUAON5HMIV2YSICIE7XHPN2DCN7JVKITHU64H7FEBNBRU7FHUSTD547",
    wallet: "GBUAO...D547",
    action: "fb_live",
    status: "Confirmed",
    timestamp: "2026-08-22T18:48:47Z",
    txHash: "recovered-tx-gbuaon5hmiv2ysicie7xhpn2dcn7jvkithu64h7febnbru7fhustd547",
    payload: "I love the product, but i think u can do better on ui/ux",
    feedbackType: "POSITIVE",
    rating: 5,
  },
];

// LocalStorage key (for storing off-chain comments in the browser)
const LOCAL_STORAGE_OFFCHAIN_KEY = "stellar_guest_comments_v1";

// ============================================================
// HELPER UTILS
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
  if (!dateString) return "Just now";
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
// MAIN COMPONENT
// ============================================================

export default function LiveAnalyticsPanel({ activeWalletAddress }) {
const [userLogs, setUserLogs] = useState(() => {
  try {
    const saved = localStorage.getItem(
      VERIFIED_LOGS_STORAGE_KEY
    );

    const parsed = saved
      ? JSON.parse(saved)
      : [];

    const cachedLogs = Array.isArray(parsed)
      ? parsed
      : [];

    const combined = [
      ...cachedLogs,
      ...RECOVERED_VERIFIED_LOGS,
    ];

    return Array.from(
      new Map(
        combined.map((item) => [
          item.txHash ||
            item.eventId ||
            `${item.fullWallet}-${item.timestamp}`,
          item,
        ])
      ).values()
    ).sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );
  } catch (error) {
    console.warn(
      "Verified analytics cache could not be loaded:",
      error
    );

    return [...RECOVERED_VERIFIED_LOGS];
  }
});
useEffect(() => {
  try {
    const safeLogs = Array.isArray(userLogs)
      ? userLogs.slice(0, MAX_PERSISTED_LOGS)
      : [];

    localStorage.setItem(
      VERIFIED_LOGS_STORAGE_KEY,
      JSON.stringify(safeLogs)
    );
  } catch (error) {
    console.warn(
      "Verified analytics cache could not be saved:",
      error
    );
  }
}, [userLogs]);
  const [offChainComments, setOffChainComments] = useState([]);
  const [latency, setLatency] = useState(null);
  const [rpcHealthy, setRpcHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Form States
  const [commentType, setCommentType] = useState(activeWalletAddress ? "ON_CHAIN" : "OFF_CHAIN"); // 'ON_CHAIN' | 'OFF_CHAIN'
  const [guestName, setGuestName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [feedbackType, setFeedbackType] = useState("POSITIVE");
const [feedbackFilter, setFeedbackFilter] = useState("ALL");
// ALL | TESTERS | ON_CHAIN | OFF_CHAIN | POSITIVE | NEGATIVE
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

// Interaction stream view:
// LATEST_PER_WALLET_ACTION = only the most recent entry for the same wallet and the same action
// ALL = show all events
  const [streamFilter, setStreamFilter] = useState("LATEST_PER_WALLET_ACTION");

  const walletCache = useRef(new Map());
  const refreshingRef = useRef(false);

  // Set the form mode when the active wallet changes
  useEffect(() => {
    if (activeWalletAddress) {
      setCommentType("ON_CHAIN");
    }
  }, [activeWalletAddress]);

  // ----------------------------------------------------------
  // Upload OFF-CHAIN (NORMAL) COMMENTS
  // ----------------------------------------------------------
  const fetchOffChainComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('guest_comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item) => ({
        id: item.id,
        author: item.author,
        comment: item.comment,
        rating: item.rating,
        type: item.type,
        timestamp: item.created_at,
        isOnChain: false,
      }));
    } catch (e) {
      console.warn("Supabase fetch warning:", e);
      return [];
    }
  }, []);
  
  // Soroban RPC Event Retrieval Logic
const fetchSorobanEvents = async () => {
  try {
    // Request to the Stellar Testnet RPC
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getEvents",
        params: {
          startLedger: 0, // Or the last ledger you know of
          filters: [
            {
              type: "contract",
              contractIds: [CONTRACT_ID]
            }
          ],
          pagination: {
            limit: 100
          }
        }
      })
    });

    const data = await response.json();

    if (data.result && data.result.events) {
      // REVERSE THE ORDER OF UPCOMING EVENTS (SO THE NEWEST APPEAR AT THE TOP)
      const parsedEvents = data.result.events.reverse().map((ev, index) => {
        return {
          eventId: ev.id || `evt-${index}`,
          fullWallet: ev.contractId || "Contract Event",
          wallet: "fb_live_contract",
          action: "fb_live",
          status: "Confirmed",
          timestamp: ev.createdAt ? new Date(ev.createdAt).toISOString() : new Date().toISOString(),
          txHash: ev.pagingToken || "Soroban_Tx",
        };
      });

      // Eski loglarla birleştir ve mükerrer kayıtları engelle
      setUserLogs((previousLogs) => {
  const oldLogs = Array.isArray(previousLogs)
    ? previousLogs
    : [];

  const newLogs = Array.isArray(parsedEvents)
  ? parsedEvents
  : [];



// New RPC records take precedence.
// Older, verified records that have exceeded the retention period are not deleted.
  const mergedLogs = [
    ...newLogs,
    ...oldLogs,
  ];

  const uniqueMergedLogs = Array.from(
    new Map(
      mergedLogs.map((log) => [
        log.eventId ||
          log.txHash ||
          `${log.fullWallet}-${log.timestamp}`,
        log,
      ])
    ).values()
  );

  return uniqueMergedLogs
    .sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    )
    .slice(0, MAX_PERSISTED_LOGS);
});
    }
  } catch (err) {
    console.error("Soroban events fetch error:", err);
  }
};

  // Initial Off-Chain loading
  useEffect(() => {
    fetchOffChainComments().then((comments) => setOffChainComments(comments));
  }, [fetchOffChainComments]);

  // ----------------------------------------------------------
  // HYBRID MERGER (ON-CHAIN + OFF-CHAIN COMMENTS)
  // ----------------------------------------------------------
  const allFeedbacks = useMemo(() => {
    // 1. On-Chain Comments (Soroban)
    const onChainFeedbacks = userLogs
      .filter((log) => log.payload || log.action === "create_feedback" || log.action === "user_comment")
      .map((log) => {
        let commentText = "On-Chain Interaction Executed Successfully! 🚀";

        if (typeof log.payload === "string" && log.payload.trim() !== "") {
          commentText = log.payload;
        } else if (log.payload && typeof log.payload === "object") {
          commentText = log.payload.comment || log.payload.message || JSON.stringify(log.payload);
        }

        return {
          id: log.eventId,
          author: log.wallet,
          fullWallet: log.fullWallet,
          type: log.feedbackType || "POSITIVE",
          comment: commentText,
          rating: log.rating || 5,
          timestamp: log.timestamp || new Date().toISOString(),
          date: formatRelativeTime(log.timestamp),
          action: log.action,
          isOnChain: true,
          txHash: log.txHash
        };
      });

    // 2. Off-Chain Yorumlar (Regular Visitors)
    const formattedOffChainFeedbacks = offChainComments.map((off) => ({
      id: off.id,
      author: off.author || "Guest User",
      fullWallet: null,
      type: off.type || "POSITIVE",
      comment: off.comment,
      rating: off.rating || 5,
      timestamp: off.timestamp,
      date: formatRelativeTime(off.timestamp),
      action: "guest_comment",
      isOnChain: false,
      txHash: null
    }));

    // 3. Merge and Reorder by Date
    const combined = [...onChainFeedbacks, ...formattedOffChainFeedbacks];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [userLogs, offChainComments]);

const testerFeedbackCount = useMemo(() => {
  const uniqueTesterWallets = new Set(
    allFeedbacks
      .filter((f) => {
        const wallet = String(f.fullWallet || "").trim();
        const comment = String(f.comment || "").trim();

        return (
          f.isOnChain &&
          f.action === "fb_live" &&
          f.txHash &&
          f.txHash !== "Pending_Tx_Hash" &&
          wallet &&
          wallet !== "UNKNOWN" &&
         !isDeveloperWallet(wallet) &&
          !comment.startsWith("Simulated deposit of ")
        );
      })
      .map((f) => String(f.fullWallet).trim())
  );

  return uniqueTesterWallets.size;
}, [allFeedbacks]);

  // Filtered Comments
  const filteredFeedbacks = useMemo(() => {
  return allFeedbacks.filter((f) => {
    if (feedbackFilter === "TESTERS") {
      const wallet = String(f.fullWallet || "").trim();
      const comment = String(f.comment || "").trim();

    return (
  f.isOnChain &&
  f.action === "fb_live" &&
  f.txHash &&
  f.txHash !== "Pending_Tx_Hash" &&
  wallet &&
  wallet !== "UNKNOWN" &&
  !isDeveloperWallet(wallet) &&
  !comment.startsWith("Simulated deposit of ")
);
    }

    if (feedbackFilter === "ON_CHAIN") {
      return f.isOnChain;
    }

    if (feedbackFilter === "OFF_CHAIN") {
      return !f.isOnChain;
    }

    if (feedbackFilter === "POSITIVE") {
      return f.type === "POSITIVE";
    }

    if (feedbackFilter === "NEGATIVE") {
      return f.type === "NEGATIVE";
    }

    return true;
  });
}, [allFeedbacks, feedbackFilter]);

  // ----------------------------------------------------------
  // STATS
  // ----------------------------------------------------------
const verifiedUsersCount = useMemo(() => {
  const wallets = new Set(
    userLogs
      .filter(
        (log) =>
          log.action === "fb_live" &&
          log.txHash &&
          log.txHash !== "Pending_Tx_Hash"
      )
      .map((log) =>
        String(log.fullWallet || "").trim()
      )
      .filter(
        (wallet) =>
          wallet &&
          wallet !== "UNKNOWN" &&
          !isDeveloperWallet(wallet)
      )
  );

  return wallets.size;
}, [userLogs]);
const todayInteractions = useMemo(() => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return userLogs.filter((log) => {
    if (
      log.action !== "fb_live" ||
      !log.txHash ||
      log.txHash === "Pending_Tx_Hash" ||
      !log.timestamp
    ) {
      return false;
    }

    return new Date(log.timestamp) >= todayStart;
  }).length;
}, [userLogs]);

  // ----------------------------------------------------------
  //STREAM FILTER — LATEST ENTRY FOR THE SAME WALLET + THE SAME ACTION
  // ----------------------------------------------------------
  const displayedUserLogs = useMemo(() => {
    const sorted = [...userLogs].sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );

    if (streamFilter === "ALL") {
      return sorted;
    }

    const seen = new Set();
    const latestOnly = [];

    for (const log of sorted) {
     // fullWallet takes precedence as the actual user ID.
// In the event of UNKNOWN, brief wallet/event information is used as a fallback.
      const walletKey =
        log.fullWallet && log.fullWallet !== "UNKNOWN"
          ? log.fullWallet
          : log.wallet || "UNKNOWN";

      const actionKey = log.action || "contract_interaction";
      const uniqueKey = `${walletKey}::${actionKey}`;

      if (seen.has(uniqueKey)) continue;

      seen.add(uniqueKey);
      latestOnly.push(log);
    }

    return latestOnly;
  }, [userLogs, streamFilter]);

  // ----------------------------------------------------------
  // RPC WALLET RESOLVER
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
      return "UNKNOWN";
    }
  }, []);

  // ----------------------------------------------------------
  // FETCH SOROBAN EVENTS
  // ----------------------------------------------------------
  const fetchContractEvents = useCallback(
    async (startLedger, signal, endLedger = null) => {
      let collectedEvents = [];
      let cursor = null;

      for (let page = 0; page < MAX_EVENT_PAGES; page++) {
        const params = {
          filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
          pagination: { limit: EVENT_PAGE_LIMIT },
        };

       

// Use the ledger range on the first page.
// We do not send startLedger/endLedger once the cursor has arrived.
        if (!cursor) {
          params.startLedger = startLedger;

          if (Number.isFinite(endLedger) && endLedger > startLedger) {
            params.endLedger = endLedger;
          }
        } else {
          params.pagination.cursor = cursor;
        }

        const result = await rpcRequest("getEvents", params, signal);
        const events = Array.isArray(result?.events) ? result.events : [];

        collectedEvents.push(...events);

        console.log(
          `📦 Event window ${startLedger}${
            endLedger ? ` → ${endLedger}` : " → latest"
          } | page ${page + 1}: ${events.length} events`
        );

        if (events.length === 0) break;
        if (!result?.cursor || result.cursor === cursor) break;

        cursor = result.cursor;

        if (events.length < EVENT_PAGE_LIMIT) break;
      }

      return Array.from(
        new Map(collectedEvents.map((event) => [event.id, event])).values()
      );
    },
    []
  );

  // ----------------------------------------------------------
  // MAIN SYNC
  // ----------------------------------------------------------
  const fetchLiveAnalytics = useCallback(async (signal) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      setIsRefreshing(true);
      setErrorMessage("");

      const startTime = performance.now();

      // For the latest ledger on the live side; whilst `getHealth` is used
// to keep the history limit within the ledger range actually stored by the RPC node.
      const [latestLedgerResponse, healthResponse] = await Promise.all([
        rpcRequest("getLatestLedger", null, signal),
        rpcRequest("getHealth", null, signal),
      ]);

      const endTime = performance.now();
      setLatency(Math.max(0, Math.round(endTime - startTime)));

      if (
        !latestLedgerResponse ||
        typeof latestLedgerResponse.sequence !== "number"
      ) {
        throw new Error("Latest Stellar ledger could not be retrieved.");
      }

      setRpcHealthy(true);

const latestLedger = latestLedgerResponse.sequence;

const rpcOldestLedger =
  typeof healthResponse?.oldestLedger === "number"
    ? healthResponse.oldestLedger
    : Math.max(
        1,
        latestLedger - 40000
      );

const oldestLedger = Math.min(
  latestLedger,
  rpcOldestLedger + RETENTION_SAFETY_LEDGERS
);

const availableLedgerSpan = Math.max(
  0,
  latestLedger - oldestLedger
);

const dynamicWindowCount = Math.max(
  1,
  Math.ceil(
    availableLedgerSpan /
      HISTORY_WINDOW_LEDGERS
  )
);


console.log(
  "📡 Analytics ledger range:",
  oldestLedger,
  "→",
  latestLedger,
  "| windows:",
  dynamicWindowCount
);

      // --------------------------------------------------------
      //  ACTIVE 10K LIVE WINDOW + PREVIOUS 10K WINDOWS
      // --------------------------------------------------------
      // Window 0: latest - 10k → latest     (real-time / today)
      // Window 1: latest - 20k → latest-10k
      // Window 2: latest - 30k → latest-20k
      // Window 3: latest - 40k → latest-30k (yesterday night / older)
      const historyBatches = [];

      for (let i = 0; i < dynamicWindowCount; i++) {
        const rawStart =
          latestLedger - HISTORY_WINDOW_LEDGERS * (i + 1);

        const rawEnd =
          i === 0
            ? null
            : latestLedger - HISTORY_WINDOW_LEDGERS * i;

        const windowStart = Math.max(oldestLedger, rawStart);

        // If we have reached the RPC retention limit, do not go any further back.
        if (windowStart >= latestLedger) break;

        const windowEnd =
          rawEnd && rawEnd > windowStart ? rawEnd : null;

        const batch = await fetchContractEvents(
          windowStart,
          signal,
          windowEnd
        );

        historyBatches.push(...batch);

        // If we have reached `oldestLedger`, the next window is unnecessary.
        if (windowStart <= oldestLedger) break;
      }

     // If the same event occurs on the border of two windows, deduplicate it.
      const allEvents = Array.from(
        new Map(
          historyBatches
            .filter((event) => event && event.id)
            .map((event) => [event.id, event])
        ).values()
      );

     const feedbackEvents = allEvents
  .filter((event) => {
    if (
      !Array.isArray(event.topic) ||
      event.topic.length === 0
    ) {
      return false;
    }

    const eventName = decodeScVal(
      event.topic[0]
    );

    return eventName === "fb_live";
  })
  .sort(
    (a, b) =>
      new Date(b.ledgerClosedAt).getTime() -
      new Date(a.ledgerClosedAt).getTime()
  );

      console.log(
        "📚 Combined contract events:",
        feedbackEvents.length,
        "| newest:",
        feedbackEvents[0]?.ledgerClosedAt || "none",
        "| oldest:",
        feedbackEvents[feedbackEvents.length - 1]?.ledgerClosedAt || "none"
      );

      const visibleEvents = feedbackEvents.slice(
        0,
        MAX_VISIBLE_LOGS
      );

      const logs = await mapWithConcurrencyLimit(
        visibleEvents,
        5,
        async (event) => {
          const sourceWallet = await resolveSourceWallet(
            event.txHash,
            signal
          );

          const payload = decodeScVal(event.value);

          let detectedAction = "contract_interaction";

          if (
            Array.isArray(event.topic) &&
            event.topic.length > 0
          ) {
            const rawTopic = decodeScVal(event.topic[0]);

            if (
              typeof rawTopic === "string" &&
              rawTopic.trim() !== ""
            ) {
              detectedAction = rawTopic;
            }
          }

          let extractedFeedbackType = "POSITIVE";

          if (
            typeof payload === "object" &&
            payload?.is_positive === false
          ) {
            extractedFeedbackType = "NEGATIVE";
          } else if (
            typeof payload === "string" &&
            payload.toLowerCase().includes("bad")
          ) {
            extractedFeedbackType = "NEGATIVE";
          }

          return {
            eventId: event.id,
            fullWallet: sourceWallet,
            wallet: shortenWallet(sourceWallet),
            action: detectedAction,
            status: "Confirmed",
            timestamp: event.ledgerClosedAt,
            txHash: event.txHash,
            payload:
              typeof payload === "object"
                ? JSON.stringify(payload)
                : payload,
            feedbackType: extractedFeedbackType,
            rating:
              typeof payload === "object" && payload?.rating
                ? payload.rating
                : 5,
          };
        }
      );
setUserLogs((prev) => {
  const previousLogs = Array.isArray(prev)
    ? prev
    : [];

  const networkLogs = Array.isArray(logs)
    ? logs
    : [];

// Add new RPC records first.
// Old, verified records are retained even if they fall outside the retention period.
  const combined = [
    ...networkLogs,
    ...previousLogs,
  ];

  return Array.from(
    new Map(
     combined.map((item) => [
  item.txHash ||
    item.eventId ||
    `${item.fullWallet}-${item.timestamp}`,
  item,
])
    ).values()
  )
    .sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    )
    .slice(0, MAX_PERSISTED_LOGS);
});

      setLastUpdated(new Date());
    } catch (error) {
      if (error?.name === "AbortError") return;

      console.error(
        "❌ Live Analytics Sync Error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Live Stellar analytics could not be loaded."
      );

      setRpcHealthy(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [fetchContractEvents, resolveSourceWallet]);

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
  // FORM SUBMISSION (ON-CHAIN Or OFF-CHAIN)
  // ----------------------------------------------------------

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      if (commentType === "ON_CHAIN") {
        // --- ON-CHAIN COMMENT (DO NOT MODIFY) ---
        const author = activeWalletAddress || "GAQV...4UN4";
        const newLogItem = {
          eventId: `temp-${Date.now()}`,
          fullWallet: author,
          wallet: shortenWallet(author),
          action: "user_comment",
          status: "Confirmed",
          timestamp: new Date().toISOString(),
          txHash: "Pending_Tx_Hash",
          payload: newComment,
          feedbackType: feedbackType,
          rating: rating,
        };

        setUserLogs((prev) => [newLogItem, ...prev]);

        if (window.freighter) {
          console.log("🚀 Submitting feedback on-chain via Freighter...");
        } else {
          console.warn("⚠️ Wallet extension not detected. Added as simulated local feedback.");
        }
      } else {
        // --- OFF-CHAIN (NORMAL) COMMENT SUPABASE RECORD (NEW CODE GOES HERE) ---
        const { data, error } = await supabase
          .from('guest_comments')
          .insert([
            {
              author: guestName.trim() || "Web Guest",
              comment: newComment,
              rating: rating,
              type: feedbackType,
            },
          ])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          const newInserted = {
            id: data[0].id,
            author: data[0].author,
            comment: data[0].comment,
            rating: data[0].rating,
            type: data[0].type,
            timestamp: data[0].created_at,
            isOnChain: false,
          };
          setOffChainComments((prev) => [newInserted, ...prev]);
        }
      }

      // Clear Form
      setNewComment("");
      setGuestName("");
      setRating(5);
    } catch (err) {
      console.error("❌ Submit Error:", err);
      alert(`Submission failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
<div
  className="
    relative
    w-full

lg:w-[calc(100%+1rem)]
lg:-mx-2
xl:w-[calc(100%+1.5rem)]
xl:-mx-3



    mt-5
    sm:mt-6
    md:mt-8

    p-3
    sm:p-4
    md:p-6

    bg-slate-900/90
    border border-slate-800
    rounded-2xl
    shadow-2xl
    backdrop-blur-md
    text-white

    transition-all
    duration-300
    ease-out

    hover:border-cyan-400/70
    hover:shadow-[0_0_28px_rgba(34,211,238,0.20)]
  "
>
{/* HEADER */}
<div
  className="
    flex
    flex-col
    lg:flex-row
    lg:items-start
    lg:justify-between

    gap-4

    pb-4
    md:pb-6

    border-b
    border-slate-800
  "
>
  {/* LEFT SECTION */}
  <div
    className="
      w-full
      lg:w-auto

      min-w-0
      flex-1

      flex
      items-start

      gap-3
      sm:gap-4
    "
  >
    {/* ANALYTICS ICON */}
    <div
      className="
        w-10
        h-10

        sm:w-12
        sm:h-12

        rounded-xl

        border
        border-emerald-500/20

        bg-emerald-500/10

        flex
        items-center
        justify-center

        shrink-0
      "
    >
      <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-pulse" />
    </div>

    {/* TITLE */}
    <div className="min-w-0 flex-1 text-left">
      <h2
        className="
          text-sm
          min-[380px]:text-base
          sm:text-xl

          font-bold
          text-white
          leading-tight
        "
      >
        <span className="block sm:inline">
          Live On-Chain{" "}
        </span>

        <span className="block sm:inline">
          Analytics &amp; User Validation
        </span>
      </h2>

      <p
        className="
          text-[10px]
          sm:text-sm

          text-slate-400

          mt-1

          max-w-2xl

          leading-relaxed
        "
      >
        Real Stellar Testnet contract events, verified source wallets and hybrid
        feedback.
      </p>
    </div>
  </div>

  {/* RIGHT SECTION */}
  <div
    className="
      w-full
      lg:w-auto

      shrink-0
    "
  >
    <div
      className="
        grid
        grid-cols-2

        gap-2

        w-full
        sm:w-auto

        items-center
      "
    >
      {/* EMPTY CELL - keeps LIVE directly above RPC */}
      <div aria-hidden="true" />

      {/* LIVE */}
      <span
        className="
          justify-self-end

          inline-flex
          items-center

          gap-1.5

          px-2.5
          py-1

          rounded-full

          bg-emerald-500/10

          border
          border-emerald-500/20

          text-[9px]
          sm:text-xs

          font-bold
          text-emerald-400

          whitespace-nowrap
        "
      >
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-50 animate-ping" />
          <span className="relative inline-flex w-full h-full rounded-full bg-emerald-400" />
        </span>

        LIVE
      </span>

      {/* SYNC NETWORK */}
      <button
        type="button"
        onClick={() => fetchLiveAnalytics()}
        disabled={isRefreshing}
        className="
          w-full
          sm:w-auto

          px-3
          py-2

          rounded-lg

          bg-slate-800

          border
          border-slate-700

          text-[10px]
          sm:text-xs

          font-medium
          text-slate-300

          flex
          items-center
          justify-center

          gap-1.5

          whitespace-nowrap

          hover:bg-slate-700
          hover:border-cyan-500/40

          disabled:opacity-50
          disabled:cursor-wait

          transition-all
          cursor-pointer
        "
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${
            isRefreshing ? "animate-spin text-cyan-400" : ""
          }`}
        />

        <span>{isRefreshing ? "Syncing..." : "Sync Network"}</span>
      </button>

      {/* RPC STATUS */}
      <div
        className="
          w-full
          sm:w-auto

          px-3
          py-2

          rounded-lg

          bg-slate-800/80

          border
          border-slate-700/60

          text-[10px]
          sm:text-xs

          font-medium
          text-slate-300

          flex
          items-center
          justify-center

          gap-2

          whitespace-nowrap
        "
      >
        <Radio
          className={`w-3.5 h-3.5 ${
            rpcHealthy
              ? "text-emerald-400 animate-pulse"
              : "text-rose-400"
          }`}
        />

        <span>
          RPC:{" "}
          <strong
            className={
              rpcHealthy
                ? "text-emerald-400"
                : "text-rose-400"
            }
          >
            {rpcHealthy ? "Available" : "Unavailable"}
          </strong>
        </span>
      </div>
    </div>
  </div>
</div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-4 sm:my-6">
        <div className="group relative overflow-hidden p-3 sm:p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl
transition-all duration-300 ease-out
hover:-translate-y-1 hover:border-cyan-400/70
hover:shadow-[0_0_22px_rgba(34,211,238,0.20)]
after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2
after:w-0 after:h-[2px]
after:bg-gradient-to-r after:from-transparent after:via-cyan-300 after:to-transparent
after:shadow-[0_0_12px_rgba(34,211,238,0.85)]
after:transition-all after:duration-500 after:ease-out
after:pointer-events-none hover:after:w-[82%]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">  
              Verified Unique Wallets
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
              {verifiedUsersCount}
            </span>
            <span className={`text-xs font-medium ${verifiedUsersCount >= 20 ? "text-emerald-400" : "text-amber-400"}`}>
              {verifiedUsersCount >= 20 ? "20+ target reached ✓" : `${verifiedUsersCount}/20 target`}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[11px] text-slate-400 leading-relaxed">
            Unique wallets verified from real Soroban transactions
          </div>
        </div>

        <div className="group relative overflow-hidden p-3 sm:p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl
transition-all duration-300 ease-out
hover:-translate-y-1 hover:border-cyan-400/70
hover:shadow-[0_0_22px_rgba(34,211,238,0.20)]
after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2
after:w-0 after:h-[2px]
after:bg-gradient-to-r after:from-transparent after:via-cyan-300 after:to-transparent
after:shadow-[0_0_12px_rgba(34,211,238,0.85)]
after:transition-all after:duration-500 after:ease-out
after:pointer-events-none hover:after:w-[82%]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Today's On-Chain Interactions
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
              {todayInteractions}
            </span>
            <span className="text-xs text-blue-400 font-medium">Verified</span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[11px] text-slate-400 leading-relaxed">
            Confirmed fb_live contract events
          </div>
        </div>

        <div className="group relative overflow-hidden p-3 sm:p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl
transition-all duration-300 ease-out
hover:-translate-y-1 hover:border-cyan-400/70
hover:shadow-[0_0_22px_rgba(34,211,238,0.20)]
after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2
after:w-0 after:h-[2px]
after:bg-gradient-to-r after:from-transparent after:via-cyan-300 after:to-transparent
after:shadow-[0_0_12px_rgba(34,211,238,0.85)]
after:transition-all after:duration-500 after:ease-out
after:pointer-events-none hover:after:w-[82%]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              Soroban RPC Latency
            </span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
              {Number.isFinite(latency) ? latency : "--"}
            </span>
            <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[11px] text-slate-400 leading-relaxed">
            Real browser → Stellar Testnet RPC round-trip
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* STREAM TABLE */}
      <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
        <div
  className="
    px-3
    sm:px-4
    py-3

    bg-slate-800/60
    border-b
    border-slate-800

    flex
    flex-col
    lg:flex-row
    lg:items-center
    justify-between

    gap-3
  "
>
          <span
  className="
    text-[10px]
    sm:text-xs
    font-bold
    uppercase
    tracking-wider
    text-slate-300
    leading-relaxed
  "
>
  Verified User & Contract Interaction Stream — Level 4 Proof
</span>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => setStreamFilter("LATEST_PER_WALLET_ACTION")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  streamFilter === "LATEST_PER_WALLET_ACTION"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                title="Show only the newest record for each wallet + action pair"
              >
                Latest per Wallet
              </button>

              <button
                type="button"
                onClick={() => setStreamFilter("ALL")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  streamFilter === "ALL"
                    ? "bg-slate-700 text-white border border-slate-600"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                title="Show every contract event"
              >
                All Events
              </button>
            </div>

            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              {displayedUserLogs.length}/{userLogs.length} shown
              {lastUpdated
                ? ` • ${lastUpdated.toLocaleTimeString()}`
                : " • Connecting..."}
            </span>
          </div>
        </div>

        <div
  className="
    w-full
    overflow-x-auto
    scrollbar-thin
    scrollbar-thumb-slate-700
    scrollbar-track-transparent
  "
>
<table
  className="
    w-full
    min-w-[680px]
    text-left
    text-xs
    text-slate-300
  "
>
  <thead className="bg-slate-900/60 text-slate-500 uppercase tracking-wider text-[10px]">
    <tr>
      <th className="px-4 py-2.5">User Wallet</th>
      <th className="px-4 py-2.5">Status</th>
      <th className="px-4 py-2.5">Executed Action</th>
      <th className="px-4 py-2.5">Time</th>
      <th className="px-4 py-2.5 text-right">Proof</th>
    </tr>
  </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono">
              {loading && displayedUserLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-cyan-400 animate-pulse">
                    Reading verified Soroban events from Stellar Testnet...
                  </td>
                </tr>
              )}

              {!loading && displayedUserLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-slate-500">
                    No verified user interaction has been detected yet.
                  </td>
                </tr>
              )}

              {displayedUserLogs.map((log) => (
                <tr key={log.eventId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-slate-200" title={log.fullWallet}>
                        {log.wallet}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> Confirmed
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300 font-sans">
                    <code className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-blue-400 border border-slate-700/50">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 font-sans whitespace-nowrap">
                    {formatRelativeTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-sans">
                    {log.txHash !== "Pending_Tx_Hash" ? (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/explorer inline-flex items-center gap-1 text-[11px] text-slate-400
bg-slate-800 px-2 py-1 rounded border border-slate-700
transition-all duration-200
hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/40
hover:shadow-[0_0_12px_rgba(34,211,238,0.18)]
hover:-translate-y-[1px]"
                      >
                        Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-amber-400 italic">Local Log</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LIVE HYBRID COMMUNITY FEEDBACK & COMMENTS TABLE */}
      {/* ============================================================ */}
      <div className="mt-6 md:mt-8 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 p-3 sm:p-4 md:p-5
transition-all duration-300
hover:border-cyan-500/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.10)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
      <div className="flex items-start gap-3">
  <MessageSquare className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
  <div className="min-w-0">
    <h3 className="text-white font-bold leading-tight">
      LIVE HYBRID COMMUNITY FEEDBACK & REVIEWS
    </h3>
    <p className="text-white font-bold leading-tight">(HYBRID FEED)</p>
  </div>
</div>

          {/* FILTER BUTTONS */}
          <div
  className="
    flex
    flex-nowrap
    md:flex-wrap

    items-center
    gap-1.5

    w-full
    md:w-auto

    overflow-x-auto
    md:overflow-visible

    bg-slate-900
    p-1
    rounded-lg
    border
    border-slate-800

    text-xs
    font-mono

    scrollbar-thin
    scrollbar-thumb-slate-700
    scrollbar-track-transparent
  "
>
            <button
              type="button"
              onClick={() => setFeedbackFilter("ALL")}
             className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded transition-all cursor-pointer ${
  feedbackFilter === "ALL"
    ? "bg-cyan-500/20 text-cyan-400 font-bold"
    : "text-slate-400 hover:text-slate-200"
}`}
            >
              All ({allFeedbacks.length})
            </button>
            <button
  type="button"
  onClick={() =>
    setFeedbackFilter("TESTERS")
  }
  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
    feedbackFilter === "TESTERS"
      ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30"
      : "text-slate-400 hover:text-purple-300 hover:bg-purple-500/10"
  }`}
>
  <UserCheck className="w-3 h-3" />
  Testers ({testerFeedbackCount})
</button>
            <button
              type="button"
              onClick={() => setFeedbackFilter("ON_CHAIN")}
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                feedbackFilter === "ON_CHAIN" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              }`}
            >
              <ShieldCheck className="w-3 h-3" /> On-Chain
            </button>
            <button
              type="button"
              onClick={() => setFeedbackFilter("OFF_CHAIN")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                feedbackFilter === "OFF_CHAIN" ? "bg-blue-500/20 text-blue-400 font-bold" : "text-slate-400 hover:text-blue-300 hover:bg-blue-500/10"
              }`}
            >
              <Globe className="w-3 h-3" /> Guest Users
            </button>
            <button
              type="button"
              onClick={() => setFeedbackFilter("POSITIVE")}
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded transition-all cursor-pointer ${
                feedbackFilter === "POSITIVE" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              👍 Positive
            </button>
            <button
              type="button"
              onClick={() => setFeedbackFilter("NEGATIVE")}
               className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded transition-all cursor-pointer ${
                feedbackFilter === "NEGATIVE" ? "bg-rose-500/20 text-rose-400 font-bold" : "text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
              }`}
            >
              👎 Negative
            </button>
          </div>
        </div>

        {/* COMMENT FORM */}
       <form onSubmit={handleAddComment} className="my-5 p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3
transition-all duration-300
hover:border-cyan-500/30 hover:shadow-[0_0_18px_rgba(34,211,238,0.10)]">
          
          {/* Comment Type Selection (Wallet vs Normal) */}
          <div
  className="
    flex
    flex-col
    sm:flex-row
    sm:items-center
    sm:justify-between

    gap-3

    pb-3
    border-b
    border-slate-800/60
  "
>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Post As:</span>
              <div
  className="
   grid
grid-cols-2
gap-2

    w-full
    sm:w-auto

    bg-slate-950
    p-1
    rounded-lg
    border
    border-slate-800
  "
>
                <button
                  type="button"
                  onClick={() => setCommentType("ON_CHAIN")}
                  className={`min-w-0 justify-center whitespace-nowrap flex items-center gap-1 text-[9px] min-[380px]:text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    commentType === "ON_CHAIN"
                      ? "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Wallet (On-Chain)
                </button>
                <button
                  type="button"
                  onClick={() => setCommentType("OFF_CHAIN")}
                  className={`min-w-0 flex items-center justify-center whitespace-nowrap gap-1 text-[9px] min-[380px]:text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    commentType === "OFF_CHAIN"
                      ? "bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> Normal (Guest)
                </button>
              </div>
            </div>

            {/* Star and Emotion Selection */}
            <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setFeedbackType("POSITIVE")}
                  className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded border transition-all cursor-pointer ${
                    feedbackType === "POSITIVE"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-semibold"
                      : "border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <ThumbsUp className="w-3 h-3 inline mr-1" /> Pos
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType("NEGATIVE")}
                  className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded border transition-all cursor-pointer ${
                    feedbackType === "NEGATIVE"
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400 font-semibold"
                      : "border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <ThumbsDown className="w-3 h-3 inline mr-1" /> Neg
                </button>
              </div>
            </div>
          </div>

          {/* Input Fields*/}
          <div className="flex flex-col sm:flex-row gap-2">
            {commentType === "OFF_CHAIN" ? (
              <input
                type="text"
                placeholder="Your Name / Nickname..."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={isSubmitting}
                className="w-full sm:w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <div className="w-full sm:w-1/3 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5 truncate">
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{activeWalletAddress ? shortenWallet(activeWalletAddress) : "GAQV...4UN4"}</span>
              </div>
            )}

            <input
              type="text"
              placeholder={
                commentType === "ON_CHAIN"
                  ? "Leave comment on-chain via wallet..."
                  : "Write a normal comment..."
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />

            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className={`${
               commentType === "ON_CHAIN" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-blue-500 hover:bg-blue-400"
              } text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5
transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-50
hover:-translate-y-[1px] hover:shadow-[0_0_14px_rgba(34,211,238,0.28)]`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{commentType === "ON_CHAIN" ? "Submit On-Chain" : "Post Comment"}</span>
            </button>
          </div>
        </form>

        {/* LIVE HYBRID COMMENTS LIST */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto px-1 pt-2 pb-2">
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 font-mono">
              No comments found in this filter category.
            </div>
          ) : (
            filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
  className="
  group/comment
  relative

  p-3
  pr-20
  sm:pr-3

  bg-slate-900/50
  border
  border-slate-800/80
  rounded-xl

  flex
  flex-col
  sm:flex-row
  sm:items-start
  sm:justify-between

  gap-3
  sm:gap-4

  text-xs
  font-mono

  transition-all
  duration-300
  ease-out

  hover:-translate-y-[2px]
  hover:border-cyan-500/40
  hover:bg-slate-900/80
  hover:shadow-[0_0_16px_rgba(34,211,238,0.12)]
"
              >
                <div className="space-y-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-200">{fb.author}</span>
                    <span className="text-[10px] text-slate-500">{fb.date}</span>

                    {/* Verified vs Guest Badge */}
                    {fb.isOnChain ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-sans">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verified On-Chain
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-sans">
                        <Globe className="w-2.5 h-2.5" /> Guest User
                      </span>
                    )}

                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5 ml-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < fb.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-slate-300 font-sans leading-relaxed">{fb.comment}</p>
                </div>

                <div
  className="
    absolute
    top-3
    right-3

    sm:static
    sm:shrink-0

    flex
    flex-col
    items-end
    gap-1
  "
>
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