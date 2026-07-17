import logo from "./logo.svg";
import "./App.css";
import Header from "./components/Header";
import { useState, createContext } from "react";
import { SendFeedback } from "./components/SendFeedback";
import { FetchFeedback } from "./components/FetchFeedback";
const pubKeyData = createContext();

function App() {
  const [pubKey, _setPubKey] = useState("");
  return (
    <div className="App">
      <Header pubKey={pubKey} setPubKey={_setPubKey} />
      <pubKeyData.Provider value={pubKey}>
        <div>
          <SendFeedback />
          <FetchFeedback />
        </div>
      </pubKeyData.Provider>
    </div>
  );
}

export default App;
export { pubKeyData };
