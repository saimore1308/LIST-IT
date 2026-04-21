import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { Store, User, Bike } from 'lucide-react';
import { Role, useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [role, setRole] = useState<Role>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile
        await setDoc(userRef, {
          uid: user.uid,
          role: role,
          name: user.displayName || 'User',
          email: user.email,
          createdAt: new Date().toISOString(),
        });
      } else {
        // Update user role if they selected a different one
        const currentData = userSnap.data();
        if (currentData.role !== role) {
          await updateDoc(userRef, {
            role: role
          });
        }
      }

      // Force refresh profile to ensure the app has the latest role
      await useAuthStore.getState().fetchProfile(user.uid);

      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to LIST IT</h1>
          <p className="text-gray-500">Your neighborhood marketplace</p>
        </div>

        <div className="mb-8">
          <p className="text-sm font-medium text-gray-700 mb-4 text-center">I want to join as a:</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setRole('customer')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                role === 'customer'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-200 hover:border-orange-200 text-gray-500'
              }`}
            >
              <User className="h-6 w-6 mb-2" />
              <span className="text-xs font-medium">Customer</span>
            </button>
            <button
              onClick={() => setRole('store_owner')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                role === 'store_owner'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-200 hover:border-orange-200 text-gray-500'
              }`}
            >
              <Store className="h-6 w-6 mb-2" />
              <span className="text-xs font-medium">Store</span>
            </button>
            <button
              onClick={() => setRole('delivery_agent')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                role === 'delivery_agent'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-200 hover:border-orange-200 text-gray-500'
              }`}
            >
              <Bike className="h-6 w-6 mb-2" />
              <span className="text-xs font-medium">Agent</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}
