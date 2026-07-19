import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import { fetchFeedback } from "./Soroban";

export const FetchFeedback = () => {
  const [fbData, _setFbData] = useState(""); // Result to be displayed on screen
  const [fbId, _setFbId] = useState(""); //The ID entered by the user
  const pubKey = useContext(pubKeyData);

  const handleFetchFeedback = async () => {
    try {
      const res = await fetchFeedback(pubKey, fbId);

      // We check the output on the console (it was returning an array) and print it to the screen
      if (Array.isArray(res) && res.length > 0) {
        _setFbData(res.join(", "));
      } else if (res) {
        _setFbData(res);
      } else {
        _setFbData("Geri bildirim bulunamadı.");
      }

      // Reset the screen and input after 4 seconds
      setTimeout(() => {
        _setFbId("");
        _setFbData("");
      }, 4000);
    } catch (error) {
      console.error("Arayüz hatası:", error);
      _setFbData("İşlem başarısız oldu.");

      setTimeout(() => {
        _setFbData("");
      }, 4000);
    }
  };

  return (
    <div className="relative group flex flex-col p-6 rounded-xl bg-[#090d16] border border-cyan-900/30 hover:border-cyan-500/50 transition-all duration-500 h-full">
      <div className="absolute inset-0 bg-cyan-500/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="relative z-10 flex-1 flex flex-col">
        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-6 flex items-center gap-3">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </div>
          Check Feedback
        </h3>

        {/* Input Area */}
        <input
          type="text"
          placeholder="Enter Feedback ID..."
          className="w-full bg-[#030712] border border-slate-800 rounded-lg px-4 py-3 text-sm text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/70 transition-all mb-4 shadow-inner"
          value={fbId}
          onChange={(e) => _setFbId(e.target.value)}
        />

        {/* Buton */}
        <button
          onClick={handleFetchFeedback}
          className="w-full px-4 py-3 rounded-lg font-bold text-sm tracking-wider uppercase bg-cyan-950/40 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/80 hover:text-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300 mb-8"
        >
          Fetch Data
        </button>

        {/* Terminal Output Screen */}
        <div className="mt-auto flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Decrypted Feedback
          </span>

          <div className="w-full min-h-[70px] bg-black/60 border border-slate-800 rounded-lg p-4 font-mono text-xs flex items-center justify-center text-center shadow-inner break-all">
            {fbData ? (
              <span className="text-cyan-400">{fbData}</span>
            ) : (
              <span className="animate-pulse text-slate-600">
                Awaiting query...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
