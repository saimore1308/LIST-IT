import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { Trash2, Plus, Minus, ArrowRight, MapPin } from 'lucide-react';

export default function Cart() {
  const { items, storeId, updateQuantity, removeItem, clearCart, getTotal } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
  const [address, setAddress] = useState('');

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (orderType === 'delivery' && !address) {
      alert('Please enter a delivery address');
      return;
    }

    setLoading(true);
    try {
      let storeOwnerId = null;
      if (storeId) {
        const storeDoc = await getDoc(doc(db, 'stores', storeId));
        if (storeDoc.exists()) {
          storeOwnerId = storeDoc.data().ownerId;
        }
      }

      const deliveryFee = orderType === 'delivery' ? 40 : 0;
      const finalTotal = getTotal() + deliveryFee;

      const orderData = {
        customerId: user.uid,
        storeId,
        storeOwnerId,
        items,
        status: 'pending',
        type: orderType,
        totalAmount: finalTotal,
        deliveryAddress: orderType === 'delivery' ? address : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      navigate('/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
        <div className="space-y-4 mb-6">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500">₹{item.price.toFixed(2)}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                  <button 
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-gray-600 rounded-md shadow-sm hover:text-orange-600"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-medium w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-gray-600 rounded-md shadow-sm hover:text-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button 
                  onClick={() => removeItem(item.productId)}
                  className="text-gray-400 hover:text-red-500 p-2"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₹{getTotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Delivery Fee</span>
            <span>{orderType === 'delivery' ? '₹40.00' : 'Free'}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
            <span>Total</span>
            <span>₹{(getTotal() + (orderType === 'delivery' ? 40 : 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Fulfillment</h2>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setOrderType('delivery')}
            className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-colors ${
              orderType === 'delivery' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Delivery
          </button>
          <button
            onClick={() => setOrderType('takeaway')}
            className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-colors ${
              orderType === 'takeaway' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Takeaway
          </button>
        </div>

        {orderType === 'delivery' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full address"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading || (orderType === 'delivery' && !address)}
        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Place Order'}
        {!loading && <ArrowRight className="h-5 w-5" />}
      </button>
    </div>
  );
}

// Need to import ShoppingBag for the empty state
import { ShoppingBag } from 'lucide-react';
