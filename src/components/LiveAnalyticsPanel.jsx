import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  Users,
  Zap,
  ShieldCheck,
  Radio,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

import {
  TransactionBuilder,
  Networks,
  xdr,
  scValToNative,
} from "@stellar/stellar-sdk";

// ============================================================
// STELLAR SHIELD
// LEVEL 4 - REAL ON-CHAIN USER ANALYTICS
// ============================================================

// Public Stellar Testnet RPC
const RPC_URL = "https://soroban-testnet.stellar.org";

// Stellar Shield Soroban Contract
const CONTRACT_ID =
  "CDQUFGNQGT3CYQYNM4DUNZRLBARAXWNGJQW466OYZOODPHLXT2Z3AXMI";

// Panel auto refresh
const REFRESH_INTERVAL = 10000;

// How far back we scan from latest ledger.
// Enough for current Level 4 user-testing sessions.
const EVENT_LOOKBACK_LEDGERS = 5000;

// RPC pagination
const EVENT_PAGE_LIMIT = 200;
const MAX_EVENT_PAGES = 10;

// UI maximum
const MAX_VISIBLE_LOGS = 50;

// ============================================================
// JSON-RPC REQUEST
// ============================================================

async function rpcRequest(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}-${Math.random()}`,
      method,
      ...(params ? { params } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Stellar RPC HTTP Error: ${response.status}`,
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.error.message ||
        "Unknown Stellar RPC error",
    );
  }

  return data.result;
}

// ============================================================
// SOROBAN SCVAL DECODER
// ============================================================

function decodeScVal(value) {
  if (!value) {
    return null;
  }

  try {
    const scVal = xdr.ScVal.fromXDR(
      value,
      "base64",
    );

    return scValToNative(scVal);
  } catch (error) {
    console.warn(
      "⚠️ Soroban ScVal could not be decoded:",
      error,
    );

    return null;
  }
}

// ============================================================
// WALLET FORMATTER
// ============================================================

function shortenWallet(wallet) {
  if (!wallet || wallet === "UNKNOWN") {
    return "UNKNOWN";
  }

  if (wallet.length < 12) {
    return wallet;
  }

  return `${wallet.slice(0, 5)}...${wallet.slice(-4)}`;
}

// ============================================================
// RELATIVE TIME
// ============================================================

function formatRelativeTime(dateString) {
  if (!dateString) {
    return "Unknown";
  }

  const eventDate = new Date(dateString);
  const now = new Date();

  const diffSeconds = Math.max(
    0,
    Math.floor(
      (now.getTime() - eventDate.getTime()) /
        1000,
    ),
  );

  if (diffSeconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(
    diffSeconds / 60,
  );

  if (minutes < 60) {
    return `${minutes} min${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days = Math.floor(
    hours / 24,
  );

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
}

// ============================================================
// COMPONENT
// ============================================================

export default function LiveAnalyticsPanel() {
  // Real blockchain event records
  const [userLogs, setUserLogs] =
    useState([]);

  // Real browser -> RPC latency
  const [latency, setLatency] =
    useState(null);

  // RPC availability
  const [rpcHealthy, setRpcHealthy] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  // Prevent duplicate getTransaction requests
  const walletCache =
    useRef(new Map());

  // Prevent overlapping refreshes
  const refreshingRef =
    useRef(false);

  // ==========================================================
  // VERIFIED UNIQUE WALLETS
  // ==========================================================

  const verifiedUsersCount =
    useMemo(() => {
      const wallets = new Set(
        userLogs
          .map((log) => log.fullWallet)
          .filter(
            (wallet) =>
              wallet &&
              wallet !== "UNKNOWN",
          ),
      );

      return wallets.size;
    }, [userLogs]);

  // ==========================================================
  // TODAY'S ON-CHAIN INTERACTIONS
  // ==========================================================

  const todayInteractions =
    useMemo(() => {
      const todayStart =
        new Date();

      todayStart.setHours(
        0,
        0,
        0,
        0,
      );

      return userLogs.filter((log) => {
        if (!log.timestamp) {
          return false;
        }

        const eventTime =
          new Date(log.timestamp);

        return eventTime >= todayStart;
      }).length;
    }, [userLogs]);

  // ==========================================================
  // RESOLVE REAL TRANSACTION SOURCE WALLET
  // ==========================================================

  const resolveSourceWallet =
    async (txHash) => {
      if (!txHash) {
        return "UNKNOWN";
      }

      if (
        walletCache.current.has(txHash)
      ) {
        return walletCache.current.get(
          txHash,
        );
      }

      try {
        const transactionResult =
          await rpcRequest(
            "getTransaction",
            {
              hash: txHash,
            },
          );

        if (
          !transactionResult ||
          transactionResult.status !==
            "SUCCESS" ||
          !transactionResult.envelopeXdr
        ) {
          return "UNKNOWN";
        }

        // Decode real transaction envelope
        const parsedTransaction =
          TransactionBuilder.fromXDR(
            transactionResult.envelopeXdr,
            Networks.TESTNET,
          );

        let sourceWallet =
          "UNKNOWN";

        // Normal transaction
        if (
          parsedTransaction.source
        ) {
          sourceWallet =
            parsedTransaction.source;
        }

        // Fee-bump fallback
        if (
          parsedTransaction
            .innerTransaction?.source
        ) {
          sourceWallet =
            parsedTransaction
              .innerTransaction.source;
        }

        walletCache.current.set(
          txHash,
          sourceWallet,
        );

        return sourceWallet;
      } catch (error) {
        console.warn(
          "⚠️ Source wallet could not be resolved:",
          txHash,
          error,
        );

        return "UNKNOWN";
      }
    };

  // ==========================================================
  // GET CONTRACT EVENTS
  // ==========================================================

  const fetchContractEvents =
    async (startLedger) => {
      let collectedEvents = [];
      let cursor = null;

      for (
        let page = 0;
        page < MAX_EVENT_PAGES;
        page++
      ) {
        const params = {
          filters: [
            {
              type: "contract",

              contractIds: [
                CONTRACT_ID,
              ],
            },
          ],

          pagination: {
            limit:
              EVENT_PAGE_LIMIT,
          },
        };

        // IMPORTANT:
        // Stellar RPC does not allow startLedger
        // together with a pagination cursor.
        if (!cursor) {
          params.startLedger =
            startLedger;
        } else {
          params.pagination.cursor =
            cursor;
        }

        const result =
          await rpcRequest(
            "getEvents",
            params,
          );

        const events =
          Array.isArray(
            result?.events,
          )
            ? result.events
            : [];

        collectedEvents = [
          ...collectedEvents,
          ...events,
        ];

        console.log(
          `📦 Analytics event page ${page + 1}:`,
          events.length,
          "events",
        );

        // No additional page required
        if (
          events.length <
          EVENT_PAGE_LIMIT
        ) {
          break;
        }

        // Cursor safety
        if (
          !result?.cursor ||
          result.cursor === cursor
        ) {
          break;
        }

        cursor = result.cursor;
      }

      // Deduplicate using Stellar event ID
      return Array.from(
        new Map(
          collectedEvents.map(
            (event) => [
              event.id,
              event,
            ],
          ),
        ).values(),
      );
    };

  // ==========================================================
  // MAIN ANALYTICS FETCH
  // ==========================================================

  const fetchLiveAnalytics =
    async () => {
      // Avoid two polling jobs running simultaneously
      if (refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;

      try {
        setIsRefreshing(true);
        setErrorMessage("");
// ======================================================
// 1. RPC LATENCY + LATEST LEDGER
// ======================================================

const startTime = performance.now();

const latestLedgerResponse =
  await rpcRequest("getLatestLedger");

const endTime = performance.now();

// Gerçek RPC gecikmesini hesapla
const measuredLatency = Math.max(
  0,
  Math.round(endTime - startTime),
);

setLatency(measuredLatency);

console.log(
  "📡 RPC latency state updated:",
  measuredLatency,
  "ms",
);

// RPC cevabını doğrula
if (
  !latestLedgerResponse ||
  typeof latestLedgerResponse.sequence !== "number"
) {
  throw new Error(
    "Latest Stellar ledger could not be retrieved.",
  );
}

// getLatestLedger başarılıysa RPC kullanılabilir
setRpcHealthy(true);

// En son ledger
const latestLedger =
  latestLedgerResponse.sequence;

// Son 5000 ledger içindeki eventleri tara
const startLedger = Math.max(
  1,
  latestLedger - EVENT_LOOKBACK_LEDGERS,
);

console.log(
  "📡 Stellar Analytics RPC connected",
);

console.log(
  "📡 Analytics ledger window:",
  startLedger,
  "→",
  latestLedger,
);

// ======================================================
// 2. GET REAL CONTRACT EVENTS
// ======================================================

const allEvents =
  await fetchContractEvents(
    startLedger,
  );

        console.log(
          "📡 Contract events detected:",
          allEvents.length,
        );

        // ======================================================
        // 3. ONLY fb_live EVENTS
        // ======================================================

        const feedbackEvents =
          allEvents.filter(
            (event) => {
              if (
                !Array.isArray(
                  event.topic,
                ) ||
                event.topic.length ===
                  0
              ) {
                return false;
              }

              const eventName =
                decodeScVal(
                  event.topic[0],
                );

              return (
                eventName ===
                "fb_live"
              );
            },
          );

        console.log(
          "💬 fb_live events detected:",
          feedbackEvents.length,
        );

        // ======================================================
        // 4. NEWEST FIRST
        // ======================================================

        feedbackEvents.sort(
          (a, b) => {
            const aTime =
              new Date(
                a.ledgerClosedAt,
              ).getTime();

            const bTime =
              new Date(
                b.ledgerClosedAt,
              ).getTime();

            return bTime - aTime;
          },
        );

        const visibleEvents =
          feedbackEvents.slice(
            0,
            MAX_VISIBLE_LOGS,
          );

        // ======================================================
        // 5. BUILD REAL USER LOGS
        // ======================================================

        const logs =
          await Promise.all(
            visibleEvents.map(
              async (event) => {
                const sourceWallet =
                  await resolveSourceWallet(
                    event.txHash,
                  );

                // Decode feedback payload
                const payload =
                  decodeScVal(
                    event.value,
                  );

                // Second topic contains feedback ID
                const feedbackId =
                  event.topic?.[1]
                    ? decodeScVal(
                        event
                          .topic[1],
                      )
                    : null;

                // Security Audit currently calls
                // create_feedback using:
                //
                // "Simulated deposit of X XLM!"
                const isDepositDemo =
                  typeof payload ===
                    "string" &&
                  payload.startsWith(
                    "Simulated deposit of ",
                  );

                return {
                  eventId:
                    event.id,

                  fullWallet:
                    sourceWallet,

                  wallet:
                    shortenWallet(
                      sourceWallet,
                    ),

                  action:
                    isDepositDemo
                      ? "soroban_demo"
                      : "create_feedback",

                  status:
                    "Confirmed",

                  timestamp:
                    event.ledgerClosedAt,

                  time:
                    formatRelativeTime(
                      event.ledgerClosedAt,
                    ),

                  txHash:
                    event.txHash,

                  feedbackId,

                  ledger:
                    event.ledger,

                  payload,

                  contractId:
                    event.contractId,
                };
              },
            ),
          );

        // ======================================================
        // 6. REMOVE DUPLICATES
        // ======================================================

        const uniqueLogs =
          Array.from(
            new Map(
              logs.map(
                (log) => [
                  log.eventId,
                  log,
                ],
              ),
            ).values(),
          );

        setUserLogs(
          uniqueLogs,
        );

        setLastUpdated(
          new Date(),
        );

        console.log(
          "👤 Verified unique wallets:",
          new Set(
            uniqueLogs
              .map(
                (log) =>
                  log.fullWallet,
              )
              .filter(
                (wallet) =>
                  wallet !==
                  "UNKNOWN",
              ),
          ).size,
        );

        console.log(
          "✅ Live analytics synchronization completed.",
        );

        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        );
      } catch (error) {
        console.error(
          "❌ Live Analytics Error:",
          error,
        );

        setErrorMessage(
          error?.message ||
            "Live Stellar analytics could not be loaded.",
        );

        setRpcHealthy(false);
      } finally {
        setLoading(false);
        setIsRefreshing(false);

        refreshingRef.current =
          false;
      }
    };

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    fetchLiveAnalytics();

    const interval =
      setInterval(() => {
        fetchLiveAnalytics();
      }, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
    };

    // One polling lifecycle on mount
  }, []);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="w-full mt-8 p-5 md:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md text-white">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

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
              Real Stellar Testnet contract events,
              verified source wallets and transaction proofs.
            </p>

          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={
              fetchLiveAnalytics
            }
            disabled={
              isRefreshing
            }
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1.5 transition-all"
          >

            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            <span>
              Sync Network
            </span>

          </button>

          {/* RPC Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs font-medium text-slate-300">

            <Radio
              className={`w-4 h-4 ${
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
                {rpcHealthy
                  ? "Available"
                  : "Unavailable"}
              </strong>

            </span>

          </div>

        </div>

      </div>

      {/* ===================================================== */}
      {/* METRIC CARDS */}
      {/* ===================================================== */}

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
                verifiedUsersCount >= 10
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >

              {verifiedUsersCount >= 10
                ? "10+ target reached ✓"
                : `${verifiedUsersCount}/10 target`}

            </span>

          </div>

          <div className="mt-2 text-[11px] text-slate-400">
            Unique wallets verified from real
            Soroban transactions
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

            <span className="text-xs text-blue-400 font-medium">
              Verified
            </span>

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
  <span
    key={`rpc-latency-${latency ?? "waiting"}`}
    className="text-3xl font-extrabold text-white"
  >
    {Number.isFinite(latency) ? latency : "--"}
  </span>

  <span className="text-sm font-normal text-slate-400">
    ms
  </span>
</div>

          <div className="mt-2 text-[11px] text-slate-400">
            Real browser → Stellar Testnet RPC
            round-trip
          </div>

        </div>

      </div>

      {/* ===================================================== */}
      {/* ERROR */}
      {/* ===================================================== */}

      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* ===================================================== */}
      {/* STREAM TABLE */}
      {/* ===================================================== */}

      <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">

        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">

          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Verified User & Contract Interaction Stream
            — Level 4 Proof
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

                <th className="px-4 py-2.5">
                  User Wallet
                </th>

                <th className="px-4 py-2.5">
                  Status
                </th>

                <th className="px-4 py-2.5">
                  Executed Action
                </th>

                <th className="px-4 py-2.5">
                  Time
                </th>

                <th className="px-4 py-2.5 text-right">
                  Proof
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-800/50 font-mono">

              {/* Loading */}
              {loading && (
                <tr>

                  <td
                    colSpan="5"
                    className="px-4 py-10 text-center text-cyan-400 animate-pulse"
                  >
                    Reading verified Soroban events
                    from Stellar Testnet...
                  </td>

                </tr>
              )}

              {/* Empty */}
              {!loading &&
                userLogs.length === 0 && (
                  <tr>

                    <td
                      colSpan="5"
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No verified user interaction
                      has been detected yet.

                      <br />

                      New Soroban interactions will
                      appear here automatically.
                    </td>

                  </tr>
                )}

              {/* Real Blockchain Logs */}
              {!loading &&
                userLogs.map((log) => (
                  <tr
                    key={
                      log.eventId
                    }
                    className="hover:bg-slate-800/30 transition-colors"
                  >

                    {/* Wallet */}
                    <td className="px-4 py-2.5">

                      <div className="flex items-center gap-2">

                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

                        <span
                          className="font-semibold text-slate-200"
                          title={
                            log.fullWallet
                          }
                        >
                          {log.wallet}
                        </span>

                      </div>

                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5">

                      <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">

                        <ShieldCheck className="w-3 h-3" />

                        Confirmed

                      </span>

                    </td>

                    {/* Action */}
                    <td className="px-4 py-2.5 text-slate-300 font-sans">

                      <code className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-blue-400 border border-slate-700/50">

                        {log.action}

                      </code>

                    </td>

                    {/* Time */}
                    <td className="px-4 py-2.5 text-slate-400 font-sans whitespace-nowrap">

                      {log.time}

                    </td>

                    {/* Proof */}
                    <td className="px-4 py-2.5 text-right font-sans">

                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          log.txHash
                        }
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
    </div>
  );
}