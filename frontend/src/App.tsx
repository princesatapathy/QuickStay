import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import HotelDetail from './pages/HotelDetail';
import BookingDetail from './pages/BookingDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

// Separate component so useLocation works inside BrowserRouter
function AppLayout() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  if (isAdmin) {
    // Admin has its own full-page layout with sidebar — no outer shell
    return (
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    );
  }

  return (
    <div className="relative min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Routes>
          <Route path="/"                   element={<Home />} />
          <Route path="/search"             element={<Search />} />
          <Route path="/hotels/:hotelId"    element={<HotelDetail />} />
          <Route path="/booking/:bookingId" element={<BookingDetail />} />
          <Route path="/login"              element={<Login />} />
          <Route path="/register"           element={<Register />} />
          <Route path="/profile"            element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
