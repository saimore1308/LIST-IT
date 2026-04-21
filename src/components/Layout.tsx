import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { ShoppingBag, User, LogOut, Store, MapPin, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Layout() {
  const { user, profile } = useAuthStore();
  const { locationName, fetchLocation } = useLocationStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (profile?.role === 'customer') {
      fetchLocation();
    }
  }, [profile?.role, fetchLocation]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-orange-500 text-white p-2 rounded-lg">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">LIST IT</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  {profile?.role === 'customer' && (
                    <div className="flex items-center text-sm text-gray-600 mr-4 bg-gray-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-200 transition-colors" onClick={fetchLocation}>
                      <MapPin className="h-4 w-4 mr-1 text-orange-500" />
                      <span>{locationName}</span>
                    </div>
                  )}
                  
                  {profile?.role === 'customer' && (
                    <Link to="/cart" className="text-gray-600 hover:text-orange-500 transition-colors">
                      <ShoppingBag className="h-6 w-6" />
                    </Link>
                  )}
                  
                  <div className="relative group">
                    <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <span className="font-medium text-sm">{profile?.name || 'User'}</span>
                    </button>
                    <div className="absolute right-0 w-48 mt-2 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100">
                      {profile?.role === 'customer' && (
                        <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          My Orders
                        </Link>
                      )}
                      {profile?.role === 'store_owner' && (
                        <Link to="/store" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          Store Dashboard
                        </Link>
                      )}
                      {profile?.role === 'delivery_agent' && (
                        <Link to="/agent" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          Agent Dashboard
                        </Link>
                      )}
                      {(profile?.role === 'admin' || user?.email === 'vinodjayrammore@gmail.com') && (
                        <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-100">
                    {profile?.name}
                  </div>
                  {profile?.role === 'customer' && (
                    <>
                      <Link to="/cart" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-md">
                        Cart
                      </Link>
                      <Link to="/orders" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-md">
                        My Orders
                      </Link>
                    </>
                  )}
                  {profile?.role === 'store_owner' && (
                    <Link to="/store" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-md">
                      Store Dashboard
                    </Link>
                  )}
                  {profile?.role === 'delivery_agent' && (
                    <Link to="/agent" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-md">
                      Agent Dashboard
                    </Link>
                  )}
                  {(profile?.role === 'admin' || user?.email === 'vinodjayrammore@gmail.com') && (
                    <Link to="/admin" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-md">
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-gray-50 rounded-md"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-3 py-2 text-base font-medium text-orange-600 hover:bg-gray-50 rounded-md"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
