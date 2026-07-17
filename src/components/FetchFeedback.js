import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import { fetchFeedback } from "./Soroban";

export const FetchFeedback = () => {
  const [fbData, _setFbData] = useState("");
  const [fbId, _setFbId] = useState("");
  const pubKey = useContext(pubKeyData);

  const handleFetchFeedback = async () => {
    try {
      const values = await fetchFeedback(pubKey, fbId);

      if (Array.isArray(values)) {
        _setFbData(values.join(", "));
      } else {
        _setFbData(values || "Geri bildirim bulunamadı.");
      }

      // KANKA BÜYÜK DOKUNUŞ: 4 saniye sonra ekranı ve inputu sıfırla
      setTimeout(() => {
        _setFbData("");
        _setFbId("");
      }, 4000);
    } catch (error) {
      console.error("Veri getirme hatası:", error);
      _setFbData("Geri bildirim alınamadı, ID'yi kontrol edin.");
    }
  };

  return (
    <div className="flex flex-wrap flex-col font-semibold bg-orange-300 rounded-lg my-4 items-center border p-4 w-full">
      <div className="flex-wrap bg-orange-400 w-full p-2 rounded-md sm:text-2xl font-bold text-center flex justify-between gap-3 items-center">
        Check Feedback
        <input
          type="text"
          className="sm:w-full p-2 rounded-md text-black"
          placeholder="Enter Feedback ID"
          value={fbId} // Otomatik sıfırlanabilmesi için value bağladık
          onChange={(e) => _setFbId(e.target.value)}
        />
        <button
          className="text-lg hover:bg-violet-500 bg-orange-700 rounded-md p-1 font-bold text-white"
          onClick={handleFetchFeedback}
        >
          Fetch
        </button>
      </div>
      <div className="mt-4 w-full text-center">
        <div className="text-2xl font-bold text-slate-800">Feedback</div>
        <div className="text-xl bg-cyan-300 p-4 border-4 border-black rounded-md break-all text-black">
          {fbData || "Henüz sorgulama yapılmadı"}
        </div>
      </div>
    </div>
  );
};
