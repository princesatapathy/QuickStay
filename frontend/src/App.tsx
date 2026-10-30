import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { PageTransition } from './components/motion/Motion';
import Home from './pages/Home';
import Search from './pages/Search';
import HotelDetail from './pages/HotelDetail';
import BookingDetail from './pages/BookingDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';

function AppLayout() {
  const location = useLocation();
  const { pathname } = location;

  // Admin and auth screens bring their own full-page layout.
  if (pathname === '/admin') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    );
  }
  const bare = pathname === '/login' || pathname === '/register';

  return (
    <div className="flex min-h-dvh flex-col bg-night">
      {!bare && <Navbar />}
      <main className={`flex-1 ${bare ? '' : pathname === '/' ? '' : 'pt-24'}`}>
        <AnimatePresence mode="wait">
          <PageTransition key={pathname}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/hotels/:hotelId" element={<HotelDetail />} />
              <Route path="/booking/:bookingId" element={<BookingDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </PageTransition>
        </AnimatePresence>
      </main>
      {!bare && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
