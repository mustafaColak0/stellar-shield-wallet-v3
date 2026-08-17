# 🌌 Stellar Shield Wallet

Stellar Shield Wallet is a React-based Web3 dashboard built for the Stellar Testnet. It combines Freighter wallet connectivity, real XLM transfers, Soroban smart contract interactions, wallet-specific transaction history, live Stellar network metrics, QR payment requests, security-focused transaction flows, and on-chain feedback analytics.

The project focuses on transparent verification: supported transactions expose their transaction hashes, Soroban interactions can be verified on Stellar Expert, and the analytics panel separates verified external tester activity from developer activity.

---

## 🎬 Project Demo Video

👉 <img width="800" height="360" alt="videoconnet-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/13163f64-ba36-4f00-900b-1c237b1b2109" />

---

> **Live Demo (Vercel):** [🚀 Click Here to Open Live App](https://stellar-shield-wallet-v3-puce.vercel.app/)

> 💡 **Want to see the full, uncut workflow?** > If you would like to watch the complete step-by-step wallet connection, multi-asset transfer processes, and live network confirmations in full detail, you can watch our comprehensive video here:  
>  👉  **[Click Here to Watch the Full Detailed Project Demo Video](https://drive.google.com/file/d/1iM6VLHxsvvCpz-PAS9j7KiwU5Pvap-CG/view)**

---

## 🚀 Features

* 🔐 **Freighter Wallet Integration:** Connects to the active Freighter account, restores the connected wallet on refresh, and synchronizes the real Stellar Testnet XLM balance.
* 💸 **Real XLM Transfers:** Broadcasts signed XLM transfers through Freighter and displays the resulting transaction hash for explorer verification. USDC/EURC remain visible as ecosystem UI options but are not presented as completed real-transfer flows.
* ⚡ **Soroban `create_feedback` Interaction:** Builds, prepares, signs, submits, retries, and confirms Soroban Testnet transactions through Stellar RPC. The current contract interaction records feedback payloads such as `"Simulated deposit of 5 XLM!"`; it does not transfer the entered XLM amount to the contract.
* 🧠 **Soroban Transaction Reliability:** Uses `prepareTransaction`, fresh account sequence reads, retry handling for temporary network congestion, `txBadSeq` rebuild protection, and final ledger confirmation polling.
* 🟢 **Live Broadcast Success UI:** Displays confirmed transaction hashes and direct Stellar Expert verification links after successful on-chain operations.
* 📊 **Live Stellar Network Metrics:** Refreshes every 15 seconds and displays the current base fee, network capacity usage, average ledger close time, Soroban inclusion fee (p50), protocol version, and an automatically derived `OPTIMAL / BUSY / CONGESTED` dashboard status.
* 👥 **Verified User Analytics:** Tracks real `fb_live` on-chain interactions, deduplicates wallets, excludes the developer wallet from the tester target, and preserves previously observed verified activity locally when older RPC events leave the active retention window.
* 💬 **Tester Feedback Filter:** Separates verified external tester feedback from developer/demo activity so real tester comments can be reviewed independently.
* 🧾 **Wallet-Specific Persistent Transaction History:** Stores transaction history under a wallet-specific `localStorage` key so different Freighter accounts on the same browser do not share history. Includes `All`, `Today`, `This Week`, and `This Month` filters plus search by destination address or transaction hash.
* 🔲 **Dynamic QR Payment Request:** Generates Stellar payment QR codes from the connected public key with optional numeric amount and sanitized memo fields.
* 📇 **Validated Address Book:** Prevents duplicate contact names and duplicate wallet addresses and supports quick-transfer workflows.
* 🛡️ **Security Audit & Confirmation UI:** Includes security-oriented confirmation flows, simulated audit/error scenarios, and explicit user approval before signing sensitive actions.
* 🛑 **Soroban Error Handling:** Handles rejected signatures, temporary network conditions, failed contract execution, sequence synchronization, and delayed transaction confirmation states.
* 🌗 **Dark / Light Theme:** Provides a cyber-styled dark dashboard and a high-contrast light interface.
* 📈 **Asset Flow Chart:** Recharts visualization synchronized with Testnet balance refreshes after supported transactions.
* 📘 **Integrated User Guide:** In-app guidance for connecting Freighter, interacting with the smart contract, verifying transactions, and obtaining Testnet XLM.
* 📏 **Responsive Dashboard Layout:** Responsive layouts, interactive cards, status panels, and Tailwind CSS transitions designed for a consistent Web3 dashboard experience.

---

## ⛓️ Smart Contract Deployment Details (Jury Verification)

* **Target Contract Address (Testnet):** `CDQUFGNQGT3CYQYNM4DUNZRLBARAXWNGJQW466OYZOODPHLXT2Z3AXMI`
* **Verifiable Transaction Hash (Successful Contract Call):** `44553efa132d580cddab3070361e4c63b8abf9fbb1318d7052082b252f742c42`
* **Explorer Link:** [View Successful Contract Transaction on Stellar Expert](https://stellar.expert/explorer/testnet/tx/44553efa132d580cddab3070361e4c63b8abf9fbb1318d7052082b252f742c42)

> 🛡️ **Jury Note on Verification:**  
> The current Soroban interaction calls the deployed contract's `create_feedback` function. The amount entered in the crowdfunding-style demo interface is included inside the feedback payload, for example `"Simulated deposit of 5 XLM!"`.
>
> The transaction itself is cryptographically signed and confirmed on the Stellar Testnet; however, this flow does **not** transfer or lock the entered XLM amount inside the smart contract.

<img width="1886" height="796" alt="tx_hash_succes" src="https://github.com/user-attachments/assets/0adf65eb-9787-48ce-80e8-341c252290e5" />




---

## 🛠️ Installation & Local Setup

Follow these steps to run the project locally on your machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/mustafaColak0/stellar-shield-wallet-v3.git
   cd stellar-shield-wallet-v3
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

💡 **Jury Evaluation Note:** The visual proofs for the project requirements and implemented Stellar / Soroban features are mapped below.

1. Wallet Connected State & Live Dashboard (Dashboard Overview)
Proof of successful Freighter wallet connection showing the active Testnet account, real XLM balance, live Stellar network metrics, base fee, network capacity, ledger close time, Soroban inclusion fee, protocol version, and the dynamic asset flow chart:
<img width="1918" height="873" alt="dashboard2" src="https://github.com/user-attachments/assets/6ccda133-b401-409b-8856-d72e2b9442d1" />
<img width="872" height="722" alt="dashboard3" src="https://github.com/user-attachments/assets/7ad42cde-e9c2-45f3-b2cc-148504f98e5b" />


2. Multi-Asset Transfer Engine with Compliance Filters
The transfer panel provides real Stellar Testnet XLM transfer support through Freighter, while USDC and EURC remain available as ecosystem UI options. The interface also includes compliance-oriented status panels, integrated quick contacts, security confirmation, and the transaction signing workflow:
<img width="1918" height="876" alt="transfer2" src="https://github.com/user-attachments/assets/43b7ae37-7d09-40a3-b898-143e9f2d9036" />
<img width="423" height="377" alt="sorobanauthmatrix" src="https://github.com/user-attachments/assets/a4063688-8369-4caa-9e2f-08d0788ba859" />
<img width="845" height="503" alt="transfer_enforced" src="https://github.com/user-attachments/assets/5d5bb9ba-56a0-4eb6-8bcd-751bdb10152d" />


3. Dynamic QR Code Peer-to-Peer Payment Request Engine
A real-time payment address sharing layout that generates a high-contrast QR code corresponding to the connected user's public key, with optional amount and memo fields:
<img width="1918" height="861" alt="qrkod2" src="https://github.com/user-attachments/assets/3cb5ae92-b2a2-44d5-8f06-80d5f5d80300" />

4. Level 2 Security Audit & Soroban Interaction Matrix
The centralized security-oriented sandbox showing audit simulations, cryptographic signing states, transaction monitoring, and exception / abort test handlers:
<img width="1918" height="862" alt="security_autdit_empty" src="https://github.com/user-attachments/assets/27a5100c-71e1-406b-84c2-b7d95b3084dd" />


5. Soroban Contract Interface & Emitted Event Timeline
The Soroban interaction panel contains a crowdfunding-style demonstration interface, cryptographically signed `create_feedback` contract interactions, transaction confirmation states, and live contract event visualization:
<img width="886" height="700" alt="security_audit_deposit" src="https://github.com/user-attachments/assets/edbbb585-91fc-4e0b-93b5-b70b9ad23c14" />
<img width="1901" height="871" alt="security_audit_txhash" src="https://github.com/user-attachments/assets/86622544-abbf-4756-9bdd-ba9c58012077" />

6. Integrated Address Book for Verified Test Accounts
A local registry allowing users to manage, save, and launch quick-transfer workflows directly to saved Stellar wallet addresses:
<img width="1918" height="863" alt="adressbook2" src="https://github.com/user-attachments/assets/4728197a-e93b-4d24-8bd8-cc3f5d34488b" />

7. Optimized Transaction Ledger (Transaction History UI)
A wallet-specific persistent transaction history interface with case-insensitive destination / transaction hash search and `All`, `Today`, `This Week`, and `This Month` date filters:
<img width="1912" height="863" alt="Transaction History 2" src="https://github.com/user-attachments/assets/c1704740-fa60-474b-9c6a-6de623887d84" />
<img width="881" height="312" alt="transaction_history_process" src="https://github.com/user-attachments/assets/6766b6f6-642f-40c4-86b5-dee11bb8c7ff" />

8. Automated CI/CD Pipeline & Smart Contract Unit Tests (Level 3 Core Requirement)
Proof of the GitHub Actions workflow execution. The pipeline compiles the repository, executes Soroban unit tests, validates the frontend build, and reports the workflow result:
<img width="1915" height="896" alt="ci-summary" src="https://github.com/user-attachments/assets/49a560da-c1fa-477c-8d0b-0b3f7d0e538a" />
<img width="1905" height="853" alt="ci-detail" src="https://github.com/user-attachments/assets/22223c04-5952-4c9a-9cdf-762abb7086bd" />


9. Smart Contract Unit Test Execution Output (3/3 Passed)
<img width="1145" height="228" alt="test-results" src="https://github.com/user-attachments/assets/18375f06-869c-45d9-85c2-23d3c7e60794" />


### 10. Soroban Smart Contract Feedback Matrix (Level 3 Architecture)

A feedback and status verification module integrated with smart contracts running live on the Soroban Testnet network:
- **Create Feedback:** Records feedback through the create_feedback contract function.
- **On-Chain Verification:** Displays confirmed transaction hashes and network validation status for supported contract interactions.
- **Verified Tester Analytics:** Separates real external tester activity from developer activity and provides a dedicated Testers feedback filter.
- **Unique Wallet Tracking:** Counts verified external wallets toward the testing target while excluding the developer wallet.

<img width="1918" height="862" alt="feedback" src="https://github.com/user-attachments/assets/a6f19c87-54cb-49e4-810f-6ad74224ec7d" />
<img width="1918" height="731" alt="create_feedback" src="https://github.com/user-attachments/assets/bdc24cb9-a625-4501-aedf-163ae454b917" />

---

## 👥 Live Analytics & Real-User Testing (Level 4 Progress)
StellarShield now includes a dedicated live analytics panel for external testing:

* **Verified Unique Wallets:** Counts unique wallets with confirmed `fb_live` activity.
* **Developer Exclusion:** The developer wallet remains visible in the event stream but is excluded from the external tester target.
* **Tester Feedback Filter:** Displays external tester comments separately from developer/demo feedback.
* **Verified Event Persistence:** Previously observed verified activity is preserved locally even when older RPC events move outside the active retention window.
* **Unique User Validation:** Repeated interactions from the same wallet do not increase the verified unique wallet count.

> 🚧 **Current Status:** Real-user testing is currently in progress. The final tester count and latest proof screenshots will be added after the external testing target is reached.

## User Feedback

We collect user feedback via Google Forms — name, email, wallet address, and product ratings — and export all responses for continuous UI/UX and zero-knowledge workflow analysis.

📝 [Share your feedback](https://docs.google.com/forms/d/e/1FAIpQLScdB-Kdr1fzhEaM2YNk22lubI09lZcpcztqGGDoyTgDjdBbfQ/viewform) — takes ~1 minute.

---

## Feedback-Driven Iteration

Every round of user feedback helps us shape the next iteration. Here is how we are addressing the tester feedback:

| User Feedback | Action Taken / Improvement | Status |
| :--- | :--- | :---: |
| "No major issues on desktop. One note: all navigation is locked behind wallet connect — would be nice to browse the User Guide before connecting Freighter| Unlocking public access for the User Guide so users can read instructions before connecting Freighter. | **In Progress** |
| "UI could be much better and there is no logo for it. Work more on branding." | Refining global UI styling and adding official StellarShield logo/branding to the header. | **In Progress** |
| "I'd love to have a simple transaction history that explains what actually happened in plain language." | Planning human-readable transaction logs to replace raw contract payloads. | **Planned** |
| "Transaction history export (CSV) — handy for tax/record keeping." | Adding CSV export functionality for all transaction logs. | **Planned** |
| "My recommendation will be add a walkthrough for beginners..." | Designing an interactive step-by-step onboarding walkthrough for first-time users. | **Planned** |

---

## 🗺️ Future Roadmap

### 🔄 Phase 1: Soroban Optimization & Verification (Short-Term)
* **Soroban Auth Next-Gen Integration:** Explore advanced Soroban authorization and multi-signature workflows for institutional vault use cases.
* **Advanced Contract Testing:** Expand automated contract test coverage and simulation workflows for additional Soroban execution and error scenarios.

### 🌐 Phase 2: Mobile Ecosystem & Deep Linking (Medium-Term)
* **Mobile Wallet & Deep Linking Architecture:** Expand wallet connectivity to improve mobile signing workflows and ecosystem compatibility.
* **Ecosystem Multi-Currency Auto-Conversion QR:** Explore cross-asset payment paths that could support XLM, USDC, and EURC conversion through Stellar liquidity infrastructure.

### 🛡️ Phase 3: Advanced Compliance & Security (Long-Term)
* **Real-Time Phishing Registry Integration:** Explore integration with trusted security data sources to warn users before interacting with known malicious addresses.
* **Automated Fee-Bump Support:** Explore fee-bump transaction support for selected Stellar operations during network congestion.

### 📦 Production-Ready Smart Contract Bindings
* **Automated JavaScript / TypeScript Bindings:** Generate type-safe frontend bindings from the Soroban Rust contract using Stellar tooling for a more robust production architecture.

---


## 🧬 Tech Stack

* **Frontend:** React.js (JavaScript / JSX)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Charts:** Recharts
* **Stellar SDK:** `@stellar/stellar-sdk`
* **Wallet API:** `@stellar/freighter-api`
* **Network Data:** Stellar Horizon Testnet + Soroban RPC
* **Persistence:** Browser `localStorage` for wallet-specific transaction history and verified analytics cache
* **Deployment:** Vercel

