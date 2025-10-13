import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartPage from "./pages/StartPage";
import RegistrationPage from "./pages/RegistrationPage";
import InputPage from "./pages/InputPage";
import AccountPage from "./pages/AccountPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/registration" element={<RegistrationPage />} />
        <Route path="/input" element={<InputPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Routes>
    </Router>
  );
};

export default App;
