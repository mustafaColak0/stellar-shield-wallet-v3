import React from "react";
import {
  BookOpen,
  Wallet,
  Send,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export default function UserGuide({ darkMode }) {
const steps = [
  {
    icon: <Wallet className="w-6 h-6 text-cyan-400" />,
    title: "1. Connect Freighter Wallet",
    description:
      "Set your Freighter wallet to Stellar Testnet, then connect it securely to StellarShield.",
  },
  {
    icon: <Send className="w-6 h-6 text-cyan-400" />,
    title: "2. Transfer Assets & Interact with Soroban",
    description:
      "Send XLM, USDC, or EURC on Stellar Testnet and interact with the Soroban smart contract through the Dashboard and Feedback sections.",
  },
  {
    icon: <CheckCircle2 className="w-6 h-6 text-cyan-400" />,
    title: "3. Verify Live Transactions",
    description:
      "Track confirmed transactions, transaction hashes, live ledger events, and RPC performance in real time through StellarShield.",
  },
  {
    icon: <ShieldAlert className="w-6 h-6 text-cyan-400" />,
    title: "4. Need Testnet Assets?",
    description:
      "Use Stellar Lab for Testnet XLM and asset trustlines, then use the Circle Faucet to receive free Testnet USDC and EURC.",
  },
];
  return (
    <div
      className={`w-full min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-8 transition-colors duration-300 ${
        darkMode ? "bg-slate-950" : "bg-slate-50"
      }`}
    >
      <div className="w-full max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen
              className="
                w-8 h-8
                text-cyan-400
                drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]
              "
            />

            <h1
              className={`text-2xl md:text-3xl font-bold transition-colors duration-300 ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              StellarShield User Guide
            </h1>
          </div>

       <p
  className={`max-w-2xl mx-auto text-sm md:text-base leading-relaxed transition-colors duration-300 ${
    darkMode ? "text-slate-400" : "text-slate-600"
  }`}
>
  Welcome to StellarShield! Follow these steps to connect your wallet,
  transfer Stellar Testnet assets, interact with Soroban smart contracts,
  and monitor live network activity.
</p>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((step, index) => (
            <div
              key={index}
              className="
                group
                relative
                overflow-hidden
                bg-[#111827]
                border
                border-slate-700
                p-6
                rounded-2xl
                min-h-[190px]
                flex
                flex-col
                justify-between
                transition-all
                duration-300
                ease-out
                hover:-translate-y-1
                hover:border-cyan-400
                hover:shadow-[0_0_30px_rgba(34,211,238,0.45)]
              "
            >
              {/* HOVER BACKGROUND GLOW */}
              <div
                className="
                  absolute
                  inset-0
                  bg-cyan-400/5
                  opacity-0
                  group-hover:opacity-100
                  transition-opacity
                  duration-300
                  pointer-events-none
                "
              />

              <div className="relative z-10">

                {/* ICON */}
                <div
                  className="
                    p-3
                    bg-slate-800
                    border
                    border-slate-700
                    rounded-xl
                    w-fit
                    mb-5
                    transition-all
                    duration-300
                    group-hover:border-cyan-400/60
                    group-hover:bg-cyan-500/10
                    group-hover:shadow-[0_0_20px_rgba(34,211,238,0.40)]
                    group-hover:scale-105
                  "
                >
                  {step.icon}
                </div>

                {/* TITLE */}
                <h3
                  className="
                    font-semibold
                    text-lg
                    mb-3
                    text-white
                    transition-colors
                    duration-300
                    group-hover:text-cyan-300
                  "
                >
                  {step.title}
                </h3>

                {/* DESCRIPTION */}
                <p
                  className="
                    text-slate-400
                    text-sm
                    leading-relaxed
                    transition-colors
                    duration-300
                    group-hover:text-slate-300
                  "
                >
                  {step.description}
                </p>
              </div>

              {/* BOTTOM CYAN LIGHT */}
              <div
                className="
                  absolute
                  bottom-0
                  left-1/2
                  -translate-x-1/2
                  w-0
                  h-[2px]
                  bg-cyan-400
                  shadow-[0_0_12px_rgba(34,211,238,0.9)]
                  group-hover:w-[80%]
                  transition-all
                  duration-300
                "
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}