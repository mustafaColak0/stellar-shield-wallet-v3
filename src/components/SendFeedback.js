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
        _setFbId("Başarıyla Gönderildi!");
      }

      // KANKA BÜYÜK DOKUNUŞ: 4 saniye sonra ekranı ve inputu sıfırla
      setTimeout(() => {
        _setFbId("");
        _setFbData("");
      }, 4000);
    } catch (error) {
      console.error("Arayüz hatası:", error);
      _setFbId("İşlem başarısız oldu.");
    }
  };

  return (
    <div className="flex flex-col font-semibold bg-green-300 rounded-lg my-4 items-center border p-4 w-full">
      <div className="flex-wrap bg-emerald-400 w-full p-2 rounded-md sm:text-2xl font-bold text-center flex justify-between gap-3 items-center">
        Create Feedback
        <input
          type="text"
          className="sm:w-full p-2 rounded-md text-black"
          placeholder="Enter your Feedback"
          value={fbData} // Otomatik sıfırlanabilmesi için value bağladık
          onChange={(e) => _setFbData(e.target.value)}
        />
        <button
          className="text-lg hover:bg-violet-500 bg-orange-700 rounded-md p-1 font-bold text-white"
          onClick={handleCreateFeedback}
        >
          Create
        </button>
      </div>
      <div className="mt-4 w-full text-center">
        <div className="text-2xl font-bold text-slate-800">
          Tx Hash / Status
        </div>
        <div className="text-lg bg-cyan-300 p-4 border-4 border-black rounded-md break-all text-black font-mono">
          {fbId || "Henüz işlem yapılmadı"}
        </div>
      </div>
    </div>
  );
};
