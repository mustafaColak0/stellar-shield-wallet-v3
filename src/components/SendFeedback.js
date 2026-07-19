import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import { sendFeedback } from "./Soroban";

export const SendFeedback = () => {
  const [fbData, _setFbData] = useState("");
  const [fbId, _setFbId] = useState("");
  const pubKey = useContext(pubKeyData);

  const handleCreateFeedback = async () => {
    try {
      const res = await sendFeedback(pubKey, fbData);

      if (res && res.hash) {
        _setFbId(res.hash);
      } else {
        _setFbId("Sent successfully!");
      }

      //Reset the screen and input after 4 seconds
      setTimeout(() => {
        _setFbId("");
        _setFbData("");
      }, 4000);
    } catch (error) {
      console.error("User interface error:", error);
      _setFbId("The transaction failed.");
    }
  };

  return (
    <div className="relative group flex flex-col p-6 rounded-xl bg-[#090d16] border border-emerald-900/30 hover:border-emerald-500/50 transition-all duration-500 h-full">
      <div className="absolute inset-0 bg-emerald-500/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="relative z-10 flex-1 flex flex-col">
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-6 flex items-center gap-3">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          Create Feedback
        </h3>

        {/* Input Area */}
        <input
          type="text"
          placeholder="Enter your Feedback..."
          className="w-full bg-[#030712] border border-slate-800 rounded-lg px-4 py-3 text-sm text-emerald-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/70 transition-all mb-4 shadow-inner"
          value={fbData}
          onChange={(e) => _setFbData(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={handleCreateFeedback}
          className="w-full px-4 py-3 rounded-lg font-bold text-sm tracking-wider uppercase bg-emerald-950/40 border border-emerald-800 text-emerald-400 hover:bg-emerald-900/80 hover:text-emerald-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 mb-8"
        >
          Submit Record
        </button>

        {/* Terminal Output Screen */}
        <div className="mt-auto flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Tx Hash / Log Status
          </span>
          <div className="w-full min-h-[70px] bg-black/60 border border-slate-800 rounded-lg p-4 font-mono text-xs flex items-center justify-center text-center shadow-inner break-all">
            {fbId ? (
              <span className="text-emerald-400">{fbId}</span>
            ) : (
              <span className="animate-pulse text-slate-600">
                Awaiting transaction...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
