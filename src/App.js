import logo from "./logo.svg";
import "./App.css";
import Header from "./components/Header";
import { useState, createContext } from "react";
import { SendFeedback } from "./components/SendFeedback";
import { FetchFeedback } from "./components/FetchFeedback";

const pubKeyData = createContext();

function App() {
  // GEREKLİ TÜM STATE'LERİ BURAYA EKLİYORUZ:
  const [pubKey, _setPubKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="App">
      <pubKeyData.Provider value={pubKey}>
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pubKey={pubKey}
          setPubKey={_setPubKey}
          connected={connected}
          setConnected={setConnected}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          SendFeedback={SendFeedback}
          FetchFeedback={FetchFeedback}
        />
      </pubKeyData.Provider>
    </div>
  );
}

export default App;
export { pubKeyData };
