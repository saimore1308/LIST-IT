import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { MapPin, Navigation, Package, CheckCircle } from 'lucide-react';

export default function AgentDashboard() {
  const { user } = useAuthStore();
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen for orders that are ready for delivery and not assigned
    const availableQ = query(
      collection(db, 'orders'),
      where('type', '==', 'delivery'),
      where('status', '==', 'ready')
    );

    const unsubscribeAvailable = onSnapshot(availableQ, (snapshot) => {
      // Filter out orders that already have an agent
      const orders = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((o: any) => !o.agentId);
      setAvailableOrders(orders);
    }, (err) => console.error("Available orders listener error:", err));

    // Listen for the agent's currently active order
    const activeQ = query(
      collection(db, 'orders'),
      where('agentId', '==', user.uid),
      where('status', 'in', ['out_for_delivery'])
    );

    const unsubscribeActive = onSnapshot(activeQ, (snapshot) => {
      if (!snapshot.empty) {
        setActiveOrder({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveOrder(null);
      }
    }, (err) => console.error("Active order listener error:", err));

    return () => {
      unsubscribeAvailable();
      unsubscribeActive();
    };
  }, [user]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        agentId: user!.uid,
        status: 'out_for_delivery',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error accepting order:", error);
      alert("Failed to accept order. Someone else might have taken it.");
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'delivered',
        updatedAt: serverTimestamp()
      });
      setActiveOrder(null);
    } catch (error) {
      console.error("Error completing delivery:", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-500">Manage your deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isOnline ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {!isOnline ? (
        <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">You are offline</h2>
          <p className="text-gray-500">Go online to start receiving delivery requests.</p>
        </div>
      ) : activeOrder ? (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-orange-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Active Delivery</h2>
              <p className="text-sm text-gray-500">Order #{activeOrder.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <div className="w-0.5 h-12 bg-gray-200"></div>
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              </div>
              <div className="flex-1 space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pickup From</p>
                  <p className="font-medium text-gray-900">Store Location</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Deliver To</p>
                  <p className="font-medium text-gray-900">{activeOrder.deliveryAddress}</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => handleMarkDelivered(activeOrder.id)}
            className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
          >
            <CheckCircle className="h-6 w-6" />
            Mark as Delivered
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Requests</h2>
          {availableOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <p className="text-gray-500">No delivery requests right now. Waiting...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {availableOrders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</span>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md font-medium">
                        {order.items.length} items
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{order.deliveryAddress}</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between items-end">
                    <span className="font-bold text-lg text-green-600 mb-2">Earn ₹40</span>
                    <button 
                      onClick={() => handleAcceptOrder(order.id)}
                      className="w-full sm:w-auto bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
