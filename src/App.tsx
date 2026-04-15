import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ReviewDashboard from './pages/ReviewDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reviews" element={<ReviewDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
