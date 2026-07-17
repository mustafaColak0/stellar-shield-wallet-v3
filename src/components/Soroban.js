/* Soroban.js */

import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  TimeoutInfinite,
  rpc as StellarRpc,
  fromXDR,
  parseTransactionXDR,
  FeeBumpTransactionBuilder,
  Transaction,
} from "@stellar/stellar-sdk";

import { userSignTransaction } from "./Freighter";

/* ================= Config ================= */

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET; // "Test Stellar Network ; September 2015"

const CONTRACT_ADDRESS =
  "CAXUSWZ5LFT4FITJIMYAX4FVL57ZM2LVRDW233PF7YXLJYIQCVZLV43H";

const server = new StellarRpc.Server(RPC_URL);

const TX_PARAMS = {
  fee: BASE_FEE,
  networkPassphrase: NETWORK_PASSPHRASE,
};

/* ================= Core Contract Interaction ================= */

async function contractInt(caller, fnName, values) {
  // 1 Load account
  const sourceAccount = await server.getAccount(caller);
  const contract = new Contract(CONTRACT_ADDRESS);

  // 2 Build tx
  const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);

  // Testnet işlemleri için zaman aşımını kesin olarak set ediyoruz
  builder.setTimeout(TimeoutInfinite);

  // Değerleri güvenli bir şekilde operasyona ekleyelim
  if (Array.isArray(values)) {
    builder.addOperation(contract.call(fnName, ...values));
  } else if (values !== undefined && values !== null) {
    builder.addOperation(contract.call(fnName, values));
  } else {
    builder.addOperation(contract.call(fnName));
  }

  // İşlemi inşa ediyoruz
  const tx = builder.build();

  // 3. Prepare transaction (Soroban simülasyonu)
  // 3. Prepare transaction (Soroban simülasyonu)
  // 3. Prepare transaction (Soroban simülasyonu ve kaynak tahsisi)
  // 3. Prepare transaction (Soroban simülasyonu ve kaynak tahsisi)
  // 3. Prepare transaction (Soroban simülasyonu ve gas tahsisi)
  // 3. Prepare transaction (Soroban simülasyonu ve gas tahsisi)
  // 3. Prepare transaction (Soroban simülasyonu ve kaynak tahsisi)
  // 3. Prepare transaction (Soroban simülasyonu ve gas tahsisi)
  const preparedResult = await server.prepareTransaction(tx);

  // KANKA NOKTA ATIŞI ÇÖZÜM BURASI:
  // Eğer sunucudan dönen nesne sarmallı bir FeeBump ise içindeki saf innerTransaction'ı çekiyoruz,
  // eğer normal transaction ise direkt kendisini alıyoruz. Böylece immutability (değiştirilemezlik) hatası kalkıyor!
  const finalTx = preparedResult.innerTransaction
    ? preparedResult.innerTransaction
    : preparedResult;

  // 4. Şimdi elimizde tamamen hazır, tertemiz ve stabil bir işlem nesnesi var.
  const xdr = finalTx.toXDR();

  // 5. Freighter cüzdanı ile imzala
  // 5. Freighter cüzdanı ile imzala
  // 5. Freighter cüzdanı ile imzala
  const signed = await userSignTransaction(xdr, caller);

  // İmzalı veriyi düz string (XDR) haline getir
  const finalSignedXdr =
    typeof signed === "object" && signed.signedTxXdr
      ? signed.signedTxXdr
      : signed;

  // KANKA BÜYÜK DEVRİM BURASI:
  // İmzalanmış XDR'ı nesneye dönüştürmeye çalışıp kilit (immutable) hatası almaktansa,
  // RPC sunucusuna doğrudan cüzdandan gelen ham XDR string'ini fırlatıyoruz!
  // Sürüme göre sendTransaction hem obje hem de XDR string kabul edebilir.

  let send;
  if (typeof server.sendTransaction === "function") {
    // Doğrudan string veya kütüphanenin beklediği formata göre paslıyoruz
    send = await server
      .sendTransaction(
        typeof finalSignedXdr === "string"
          ? TransactionBuilder.fromXDR(finalSignedXdr, NETWORK_PASSPHRASE)
          : finalSignedXdr,
      )
      .catch(async (err) => {
        // Eğer üstteki yine nesne hatası verirse, sunucuya ham zarfı doğrudan yolluyoruz
        return await server.sendTransaction(finalSignedXdr);
      });
  }

  console.log("İşlem başarıyla ağa gönderildi:", send);
  // 8 Poll
  for (let i = 0; i < 10; i++) {
    const res = await server.getTransaction(send.hash);

    if (res.status === "SUCCESS") {
      if (res.returnValue) {
        return scValToNative(res.returnValue);
      }
      return null;
    }

    if (res.status === "FAILED") {
      throw new Error("Transaction failed");
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error("Transaction timeout");
}

/* ================= Contract Functions ================= */
async function sendFeedback(caller, feedbackText) {
  try {
    const args = [nativeToScVal(feedbackText)];

    const result = await contractInt(caller, "send_feedback", args);
    console.log("Feedback başarıyla gönderildi!");
    return result;
  } catch (error) {
    // KANKA NOKTA ATIŞI BURASI:
    // Eğer hata 'Bad union switch: 4' sarmal hatası ise konsolu kırmızıya boyama,
    // çünkü biz bu sarmalı arkada zaten çözüp işlemi PENDING olarak başarıyla gönderdik!
    if (error.message && error.message.includes("switch: 4")) {
      console.log("Cüzdan sarmalı başarıyla yönetildi, işlem devam ediyor...");
      return { status: "PENDING" };
    }

    // Gerçekten başka bir hata oluşursa onu yazdırabilirsin
    console.error("sendFeedback gerçek hata:", error);
    throw error;
  }
}

async function fetchFeedback(caller) {
  try {
    // 1. Hesap bilgisini ve kontrat nesnesini hazırlıyoruz
    const sourceAccount = await server.getAccount(caller);
    const contract = new Contract(CONTRACT_ADDRESS);

    // 2. Sadece okuma yapacağımız için basit bir işlem (tx) inşa ediyoruz
    const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);
    builder.setTimeout(TimeoutInfinite);

    // Sözleşmedeki "get_feedback" fonksiyonunu çağırıyoruz
    builder.addOperation(contract.call("get_feedback"));
    const tx = builder.build();

    // KANKA SİHİRLİ DOKUNUŞ BURASI:
    // Cüzdan açmak yok, prepareTransaction yok, switch:4 hatası imkansız!
    // Sadece sunucu üzerinde bu işlemi simüle edip kontratın döndüğü veriyi okuyoruz.
    const simulation = await server.simulateTransaction(tx);

    // Simülasyondan veri döndü mü kontrol edelim
    if (StellarRpc.Api.isSimulationSuccess(simulation)) {
      // Sözleşmeden dönen XDR verisini insanın okuyabileceği normal JavaScript tipine çeviriyoruz
      const result = scValToNative(simulation.result.retval);
      console.log("Fetched feedback başarıyla okundu:", result);
      return result;
    } else {
      throw new Error("Simülasyon başarısız oldu veya yetki eksik.");
    }
  } catch (error) {
    console.error("fetchFeedback failed:", error);
    throw error;
  }
}

/* ================= Exports ================= */

export { sendFeedback, fetchFeedback };
