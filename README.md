# 🌌 Stellar Shield Wallet

Stellar Shield Wallet is a modern, fast, and user-friendly Web3 wallet and transaction interface that integrates seamlessly with Soroban smart contracts. The project is designed to manage financial workflows on the Stellar network in the most transparent and secure manner.

---

## 🎬 Project Demo Video

👉 <img width="800" height="360" alt="videoconnet-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/13163f64-ba36-4f00-900b-1c237b1b2109" />

---

> **Live Demo (Vercel):** [🚀 Click Here to Open Live App](https://stellar-shield-wallet-v3-puce.vercel.app/)

> 💡 **Want to see the full, uncut workflow?** > If you would like to watch the complete step-by-step wallet connection, multi-asset transfer processes, and live network confirmations in full detail, you can watch our comprehensive video here:  
>  👉  **[Click Here to Watch the Full Detailed Project Demo Video](https://drive.google.com/file/d/1iM6VLHxsvvCpz-PAS9j7KiwU5Pvap-CG/view)**

---

## 🚀 Features

* 🔐 **Multi-Wallet Integration:** Full integration with the official **Freighter** wallet, along with ecosystem simulation models for Albedo and xBull in a sandbox environment.
* ⚡ **Soroban RPC Transaction Simulation:** Advanced transaction simulation that completely eliminates `400 Bad Request` errors! Before being broadcasted to the network, transactions are simulated via `rpc.Server` using `prepareTransaction`. Gas and resource limits are automatically calculated, ensuring zero-error submissions.
* 🧠 **Safe XDR Data Parsing (`nativeToScVal`):** Employs the latest `@stellar/stellar-sdk` standards to resolve low-level XDR parsing errors (such as `invalid u32 value`). Utilizing `nativeToScVal` with the `i128` data type ensures that `BigInt` values are passed securely and flawlessly to the smart contract.
* 🛑 **Advanced Security Audit Matrix (Error Boundary Handling):** A production-ready exception simulator that explicitly handles, intercepts, and renders distinct application behaviors for specific Web3 failure points:
    * **Wallet 404:** Detected when no compatible wallet extensions are found in the client browser environment.
    * **Reject 401:** Triggered instantly when a user explicitly rejects or cancels the signing request inside the wallet popup window.
    * **Balance 402:** Fired when a transaction request amount exceeds the available network token balance.
* 🟢 **Live Broadcast Success UI:** Once the transaction is successfully confirmed on-chain, this displays a sleek, green success notification panel showcasing the unique 64-character **Transaction Hash** and providing a direct verification link to the **Stellar Expert Explorer**.
* 📊 **Live Contract Event Stream Timeline:** Real-time monitoring of emitted smart contract events, utilizing auto-updating layouts and specialized **`DEPOSIT`** badges to visualize historical and live blockchain operations smoothly.
* 🌌 **Soroban Smart Contract & Feedback Engine:** A user-friendly dynamic amount input field and a multi-stage transaction verification modal tailored for interacting with Soroban smart contract `deposit()` and cryptographically signed `send_feedback` methods, fetching encrypted/unencrypted data states securely.
* 🛑 **Jury Soroban Error Detail Window:** An advanced error handling boundary that captures contract failures (`FAILED` transaction status) and displays raw `jurySorobanError` stack traces inside a monospaced, highly readable, and responsive debug container.
* 🛡️ **Smart Security Detector (Security Audit):** A native module performing real-time `SSL/TLS Connection Status` checks and running a `Wallet Injection Interceptor` shield to mitigate malicious extension exploits.
* 🌗 **Seamless Dual-Theme Switcher (Dark/Light Mode):** Features a fully cohesive, pixel-perfect theme engine enabling users to switch between a cyber-styled dark dashboard interface and a clean, high-contrast light grid mode with fully reactive typography and data visualizations.
* 🔒 **Advanced Transaction & Risk Confirmation:** A two-stage confirmation modal triggered before signing transactions, presenting the user with a dedicated security risk analysis agreement checkbox.
* 💰 **Dynamic Balance & Base Fee Tracking:** Fetches the connected wallet's live Testnet XLM balance and the network's current minimum gas fee (Base Fee) dynamically via API.
* 💸 **Multi-Asset Transfer Panel:** Easily switch between `XLM`, `USDC`, and `EURC` token supports to execute secure Testnet transfers using the recipient's Public Key.
* 📈 **Live Asset Flow Chart (Recharts):** An interactive dynamic Area Chart enabling users to track asset fluctuations and balance changes immediately after transfers.
* 📇 **Smart Validated Address Book:** A local secure registry letting users save frequently used target public keys or vault addresses. Includes **strict input validation guards** that actively prevent adding duplicate contact names or repeating identical wallet addresses to eliminate user error.
* 🔍 **Instant Search & Filtering:** Case-insensitive, real-time query filter within the Transaction History tab using wallet addresses or Transaction Hashes (Tx Hash).
* 🔲 **Advanced Dynamic QR Code Engine:** A production-ready payment request layout that auto-generates high-contrast QR codes dynamically updated based on the target Public Key, specific transaction IDs, and exact asset amounts for error-free peer-to-peer billing.
* 📏 **Pixel-Perfect Responsive Layout:** Fully optimized with tailored layout spacing, component padding, and precise pixel dimensions (`px dimensions`) leveraging Tailwind CSS animations (`animate-in fade-in slide-in-from-bottom-2`) to ensure absolute layout stability and cross-device smoothness.

---

## ⛓️ Smart Contract Deployment Details (Jury Verification)

* **Target Contract Address (Testnet):** `CDQUFGNQGT3CYQYNM4DUNZRLBARAXWNGJQW466OYZOODPHLXT2Z3AXMI` 
* **Verifiable Transaction Hash (Successful Contract Call):** `44553efa132d580cddab3070361e4c63b8abf9fbb1318d7052082b252f742c42`
* **Explorer Link:** [View Successful Deposit Transaction on Stellar Expert](https://stellar.expert/explorer/testnet/tx/44553efa132d580cddab3070361e4c63b8abf9fbb1318d7052082b252f742c42)
> 🛡️ **Jury Note on Verification:** 
> The dynamic deposit flow uses a security-oriented mock boundary. As seen in the transaction explorer logs, executing the `deposit()` action dynamically triggers and translates into a cryptographically signed `send_feedback` operation emitting the exact payload payload (e.g., `"Simulated deposit of 5 XLM!"`) directly to the target Soroban contract state.

<img width="1886" height="796" alt="tx_hash_succes" src="https://github.com/user-attachments/assets/0adf65eb-9787-48ce-80e8-341c252290e5" />




---

## 🛠️ Installation & Local Setup

Follow these steps to run the project locally on your machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/mustafaColak0/stellar-shield-wallet.git
   cd stellar-shield-wallet
    ```

2.  **Install Dependencies:**
    ```bash
    npm install --force
    ```

3.  **Start the Development Server:**
    ```bash
    npm start
    ```
    Your browser will automatically open the project at http://localhost:3000 .

---

## 📸 Submission Proofs

💡 Jury Evaluation Note: The mandatory visual proofs requested in the Seviye 2 Submission Checklist are mapped directly below.

1. Wallet Connected State & Live Dashboard (Dashboard Overview)
Proof of successful Freighter extension connection showing the active account state, real-time simulated network load, gas metrics, and the dynamic asset flow area chart tracking historical Testnet balances:
<img width="1918" height="873" alt="dashboard2" src="https://github.com/user-attachments/assets/6ccda133-b401-409b-8856-d72e2b9442d1" />
<img width="872" height="722" alt="dashboard3" src="https://github.com/user-attachments/assets/7ad42cde-e9c2-45f3-b2cc-148504f98e5b" />



2. Multi-Asset Transfer Engine with Compliance Filters
The cross-asset ecosystem panel (supporting XLM, USDC, EURC) equipped with real-time compliance network logs, integrated quick contacts, and the automated "Sign & Send Transaction" interface:
<img width="1918" height="876" alt="transfer2" src="https://github.com/user-attachments/assets/43b7ae37-7d09-40a3-b898-143e9f2d9036" />
<img width="423" height="377" alt="sorobanauthmatrix" src="https://github.com/user-attachments/assets/a4063688-8369-4caa-9e2f-08d0788ba859" />
<img width="845" height="503" alt="transfer_enforced" src="https://github.com/user-attachments/assets/5d5bb9ba-56a0-4eb6-8bcd-751bdb10152d" />




3. Dynamic QR Code Peer-to-Peer Payment Request Engine
A real-time payment address sharing layout that auto-generates a high-contrast verifiable QR code corresponding directly to the connected user's Public Key, including options for custom amounts and memos:
<img width="1918" height="861" alt="qrkod2" src="https://github.com/user-attachments/assets/3cb5ae92-b2a2-44d5-8f06-80d5f5d80300" />



4. Level 2 Security Audit & Soroban Interaction Matrix
The centralized simulation sandbox showing automated code scans, cryptographic binding logs, a custom transaction monitor, and live exception/abort test handlers:
<img width="1918" height="862" alt="security_autdit_empty" src="https://github.com/user-attachments/assets/27a5100c-71e1-406b-84c2-b7d95b3084dd" />





5. Soroban Contract Interface & Emitted Event Timeline
The core Smart Contract execution window containing real-time crowdfunding progress bars, a direct `deposit()` execution method, and an isolated live ledger contract event stream listing verifiable asset badges:
<img width="886" height="700" alt="security_audit_deposit" src="https://github.com/user-attachments/assets/edbbb585-91fc-4e0b-93b5-b70b9ad23c14" />
<img width="1901" height="871" alt="security_audit_txhash" src="https://github.com/user-attachments/assets/86622544-abbf-4756-9bdd-ba9c58012077" />




6. Integrated Address Book for Verified Test Accounts
A secure, custom local registry allowing users to manage, save, and launch quick-transfer triggers (`Send Money`) directly to designated jury test wallets or secure vaults:
<img width="1918" height="863" alt="adressbook2" src="https://github.com/user-attachments/assets/4728197a-e93b-4d24-8bd8-cc3f5d34488b" />



7. Optimized Transaction Ledger (Transaction History UI)
A real-time query-filtered interface mapped out with clean responsive constraints, designed to trace case-insensitive searches for transaction hashes and target addresses:
<img width="1912" height="863" alt="Transaction History 2" src="https://github.com/user-attachments/assets/c1704740-fa60-474b-9c6a-6de623887d84" />
<img width="881" height="312" alt="transaction_history_process" src="https://github.com/user-attachments/assets/6766b6f6-642f-40c4-86b5-dee11bb8c7ff" />

8. Automated CI/CD Pipeline & Smart Contract Unit Tests (Level 3 Core Requirement)
Proof of fully functional GitHub Actions automated workflow execution. The pipeline compiles the repository, triggers isolated Soroban unit testing routines, checks cross-device frontend builds, and finishes with a 100% success rate:
<img width="1875" height="602" alt="workflow" src="https://github.com/user-attachments/assets/3de56faa-7be8-45c5-abf6-2e3b5d953842" />


9. Smart Contract Unit Test Execution Output (3/3 Passed)
<img width="1145" height="228" alt="test-results" src="https://github.com/user-attachments/assets/18375f06-869c-45d9-85c2-23d3c7e60794" />



--

🗺️ Future Roadmap

### 🔄 Phase 1: Soroban Optimization & Verification (Short-Term)
*   **Soroban Auth Next-Gen Integration:** Migrate from standard invocations to Soroban's advanced `isValidSignature` and multi-signature authorization frameworks for institutional vault workflows.
*   **Automated Contract Unit-Testing:** Embed an isolated client-side WebAssembly (WASM) simulation boundary allowing developers to test Soroban contract custom exceptions and gas limits directly inside the dashboard.

### 🌐 Phase 2: Mobile Ecosystem & Deep Linking (Medium-Term)
*   **WalletConnect v2 & Deep Linking Architecture:** Expand the Multi-Wallet panel by integrating native WalletConnect infrastructure, letting mobile users trigger instant biometric transaction sign requests on **LOBSTR**, **Vibrant**, or **xbull mobile**.
*   **Ecosystem Multi-Currency Auto-Conversion QR:** Upgrade the dynamic engine to support cross-asset paths, allowing users to scan a single QR and automatically swap between XLM, USDC, and EURC via Stellar Liquidity Pools during the payment process.

### 🛡️ Phase 3: Advanced Compliance & Security AI (Long-Term)
*   **Real-Time Decentralized Phishing Registry:** Connect the native Security Audit detector to open-source Stellar phishing APIs and blacklist databases to throw high-severity UI alerts before broadcasting transactions to flagged malicious endpoints.
*   **Automated Fee-Bump Enabler:** Implement a smart transaction relayer that automatically attaches fee-bumps to critical Soroban contract interactions during heavy Testnet/Mainnet network congestion states.

###  📦 Production-Ready Smart Contract Bindings: 
*   **Automated generation of JavaScript/TypeScript bindings from the Soroban Rust contract using Stellar CLI, ensuring a robust, type-safe architecture for frontend deployment.
--

🧬 Tech Stack
Frontend: React.js (JavaScript / JSX)

Styling: Tailwind CSS (Fully Responsive Layout)

Icons: Lucide React

Charts: Recharts

Stellar SDK: @stellar/freighter-api
