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
// STELLAR SHIELD - LEVEL 4 REAL ON-CHAIN ANALYTICS
// ============================================================

// Public Stellar Testnet RPC
const RPC_URL = "https://soroban-testnet.stellar.org";

// Stellar Shield Soroban Contract
const CONTRACT_ID =
  "CDQUFGNQGT3CYQYNM4DUNZRLBARAXWNGJQW466OYZOODPHLXT2Z3AXMI";

// Automatically refresh the panel every 10 seconds.
const REFRESH_INTERVAL = 10000;

// Maximum visible records in the UI.
const MAX_VISIBLE_LOGS = 50;

// Number of events requested per RPC page.
const EVENT_PAGE_LIMIT = 200;

// Safety limit for pagination.
const MAX_EVENT_PAGES = 10;

// ============================================================
// STELLAR JSON-RPC REQUEST
// ============================================================

async function rpcRequest(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
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
    const decodedXdr =
      xdr.ScVal.fromXDR(
        value,
        "base64",
      );

    return scValToNative(decodedXdr);
  } catch (error) {
    console.warn(
      "Soroban ScVal could not be decoded:",
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
// TX HASH FORMATTER
// ============================================================

function shortenHash(hash) {
  if (!hash) {
    return "Unknown";
  }

  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
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
      (now.getTime() -
        eventDate.getTime()) /
        1000,
    ),
  );

  if (diffSeconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(diffSeconds / 60);

  if (minutes < 60) {
    return `${minutes} min${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days =
    Math.floor(hours / 24);

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function LiveAnalyticsPanel() {
  // REAL event records only.
  const [userLogs, setUserLogs] =
    useState([]);

  // REAL RPC latency measurement.
  const [latency, setLatency] =
    useState(null);

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

  // Cache resolved transaction source wallets.
  // Prevents repeating getTransaction requests
  // for the same transaction on every refresh.
  const walletCache =
    useRef(new Map());

  // ==========================================================
  // VERIFIED UNIQUE USERS
  // ==========================================================

  const verifiedUsersCount =
    useMemo(() => {
      const wallets = new Set(
        userLogs
          .map(
            (log) =>
              log.fullWallet,
          )
          .filter(
            (wallet) =>
              wallet &&
              wallet !== "UNKNOWN",
          ),
      );

      return wallets.size;
    }, [userLogs]);

  // ==========================================================
  // TODAY'S REAL ON-CHAIN INTERACTIONS
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

      return userLogs.filter(
        (log) => {
          if (!log.timestamp) {
            return false;
          }

          return (
            new Date(
              log.timestamp,
            ) >= todayStart
          );
        },
      ).length;
    }, [userLogs]);

  // ==========================================================
  // RESOLVE REAL SOURCE WALLET
  // ==========================================================

  const resolveSourceWallet =
    async (txHash) => {
      if (!txHash) {
        return "UNKNOWN";
      }

      if (
        walletCache.current.has(
          txHash,
        )
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

        // Decode the real Stellar transaction
        // envelope received from RPC.
        const parsedTransaction =
          TransactionBuilder.fromXDR(
            transactionResult.envelopeXdr,
            Networks.TESTNET,
          );

        let sourceWallet =
          "UNKNOWN";

        // Standard Stellar transaction
        if (
          parsedTransaction.source
        ) {
          sourceWallet =
            parsedTransaction.source;
        }

        // Fee-bump transaction fallback
        if (
          parsedTransaction
            .innerTransaction
            ?.source
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
          "Source wallet could not be resolved:",
          txHash,
          error,
        );

        return "UNKNOWN";
      }
    };

  // ==========================================================
  // READ ALL RECENT CONTRACT EVENTS
  // ==========================================================

  const fetchContractEvents =
    async (
      oldestLedger,
    ) => {
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

        // First request starts at the
        // oldest ledger available in RPC.
        if (!cursor) {
          params.startLedger =
            oldestLedger;
        } else {
          // Following pages use the
          // cursor returned by RPC.
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

        // No more events.
        if (
          events.length <
          EVENT_PAGE_LIMIT
        ) {
          break;
        }

        if (
          !result?.cursor ||
          result.cursor === cursor
        ) {
          break;
        }

        cursor = result.cursor;
      }

      // Remove possible duplicate events
      // using Stellar's unique event ID.
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
      try {
        setIsRefreshing(true);
        setErrorMessage("");

        // ------------------------------------------------------
        // 1. REAL STELLAR RPC HEALTH + LATENCY
        // ------------------------------------------------------

        const startTime =
          performance.now();

        const health =
          await rpcRequest(
            "getHealth",
          );

        const endTime =
          performance.now();

        setLatency(
          Math.round(
            endTime - startTime,
          ),
        );

        const isHealthy =
          health?.status ===
          "healthy";

        setRpcHealthy(
          isHealthy,
        );

        if (!isHealthy) {
          throw new Error(
            "Stellar Testnet RPC is not healthy.",
          );
        }

        if (
          typeof health.oldestLedger !==
          "number"
        ) {
          throw new Error(
            "RPC ledger history information could not be loaded.",
          );
        }

        // ------------------------------------------------------
        // 2. FETCH REAL EVENTS FOR THIS CONTRACT
        // ------------------------------------------------------

        const allEvents =
          await fetchContractEvents(
            health.oldestLedger,
          );

        // ------------------------------------------------------
        // 3. ONLY KEEP fb_live EVENTS
        // ------------------------------------------------------

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

        // ------------------------------------------------------
        // 4. NEWEST EVENTS FIRST
        // ------------------------------------------------------

        feedbackEvents.sort(
          (a, b) =>
            new Date(
              b.ledgerClosedAt,
            ).getTime() -
            new Date(
              a.ledgerClosedAt,
            ).getTime(),
        );

        const visibleEvents =
          feedbackEvents.slice(
            0,
            MAX_VISIBLE_LOGS,
          );

        // ------------------------------------------------------
        // 5. RESOLVE REAL WALLET + REAL TX HASH
        // ------------------------------------------------------

        const logs =
          await Promise.all(
            visibleEvents.map(
              async (event) => {
                const sourceWallet =
                  await resolveSourceWallet(
                    event.txHash,
                  );

                const payload =
                  decodeScVal(
                    event.value,
                  );

                const feedbackId =
                  event.topic?.[1]
                    ? decodeScVal(
                        event
                          .topic[1],
                      )
                    : null;

                // Your current Security Audit
                // deposit demo internally calls
                // create_feedback using this payload.
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
                      ? "deposit_demo"
                      : "create_feedback",

                  status:
                    "Confirmed",

                  time:
                    formatRelativeTime(
                      event.ledgerClosedAt,
                    ),

                  timestamp:
                    event.ledgerClosedAt,

                  txHash:
                    event.txHash,

                  shortTxHash:
                    shortenHash(
                      event.txHash,
                    ),

                  feedbackId,

                  ledger:
                    event.ledger,
                };
              },
            ),
          );

        setUserLogs(logs);

        setLastUpdated(
          new Date(),
        );

        setLoading(false);
      } catch (error) {
        console.error(
          "Live Analytics Error:",
          error,
        );

        setErrorMessage(
          error.message ||
            "Live Stellar analytics could not be loaded.",
        );

        setRpcHealthy(false);
        setLoading(false);
      } finally {
        setIsRefreshing(false);
      }
    };

  // ==========================================================
  // AUTOMATIC REFRESH
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

    // This analytics panel starts one
    // polling cycle when mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="w-full mt-8 p-5 md:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md text-white">
      {/* Header */}
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
                  ? "Healthy"
                  : "Unavailable"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
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
                verifiedUsersCount >=
                10
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {verifiedUsersCount >=
              10
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

        {/* REAL RPC LATENCY */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Soroban RPC Latency
            </span>

            <Zap className="w-4 h-4 text-purple-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {latency !== null
                ? latency
                : "--"}

              <span className="text-sm font-normal text-slate-400 ml-1">
                ms
              </span>
            </span>
          </div>

          <div className="mt-2 text-[11px] text-slate-400">
            Real browser → Stellar Testnet RPC
            round-trip
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Live Stream */}
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
                userLogs.length ===
                  0 && (
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

              {/* Real Logs */}
              {!loading &&
                userLogs.map(
                  (log) => (
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
                            {
                              log.wallet
                            }
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
                          {
                            log.action
                          }
                        </code>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-2.5 text-slate-400 font-sans whitespace-nowrap">
                        {log.time}
                      </td>

                      {/* Explorer Proof */}
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
                  ),
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}