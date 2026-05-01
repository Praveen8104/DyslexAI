import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Test from "./pages/Test";
import Results from "./pages/Results";
import About from "./pages/About";
import History from "./pages/History";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          <Navbar />
          <Routes>
            <Route path="/"        element={<Home />} />
            <Route path="/test"    element={<Test />} />
            <Route path="/results" element={<Results />} />
            <Route path="/about"   element={<About />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
