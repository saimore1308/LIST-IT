import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import StoreDashboard from './pages/StoreDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StoreDetails from './pages/StoreDetails';
import Cart from './pages/Cart';
import Orders from './pages/Orders';

function App() {
  const { setUser, fetchProfile, setLoading, user, profile, loading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        useAuthStore.getState().setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, fetchProfile, setLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={
            !user ? <Home /> :
            profile?.role === 'store_owner' ? <Navigate to="/store" /> :
            profile?.role === 'delivery_agent' ? <Navigate to="/agent" /> :
            <Home />
          } />
          
          <Route path="store/:storeId" element={<StoreDetails />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<Orders />} />
          
          <Route path="store" element={
            user && profile?.role === 'store_owner' ? <StoreDashboard /> : <Navigate to="/" />
          } />
          
          <Route path="agent" element={
            user && profile?.role === 'delivery_agent' ? <AgentDashboard /> : <Navigate to="/" />
          } />
          
          <Route path="admin" element={
            user && (profile?.role === 'admin' || user.email === 'vinodjayrammore@gmail.com') ? <AdminDashboard /> : <Navigate to="/" />
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
