import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Package, Clock, CheckCircle, Truck, XCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function Orders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'accepted':
      case 'preparing': return <Package className="h-5 w-5 text-blue-500" />;
      case 'ready':
      case 'out_for_delivery': return <Truck className="h-5 w-5 text-orange-500" />;
      case 'delivered': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleCancelOrder = async (orderId: string) => {
    setIsCancelling(true);
    setError(null);
    
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
      setConfirmCancelId(null);
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      setError(`Failed to cancel order: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading orders...</div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-24">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500">When you place an order, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
      
      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-500">Order #{order.id.slice(-6).toUpperCase()}</span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md font-medium uppercase">
                    {order.type}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM d, yyyy • h:mm a') : 'Just now'}
                </p>
              </div>
              
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                {getStatusIcon(order.status)}
                <span className="font-medium text-gray-900">{getStatusText(order.status)}</span>
              </div>
            </div>

            <div className="border-t border-b border-gray-50 py-4 my-4 space-y-2">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-700"><span className="text-gray-400 mr-2">{item.quantity}x</span> {item.name}</span>
                  <span className="font-medium text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Amount</span>
              <span className="text-lg font-bold text-gray-900">₹{order.totalAmount.toFixed(2)}</span>
            </div>
            
            {order.type === 'delivery' && order.deliveryAddress && (
              <div className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-600 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span>{order.deliveryAddress}</span>
              </div>
            )}

            {error && confirmCancelId === order.id && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {['pending', 'accepted', 'preparing'].includes(order.status) && (
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                {confirmCancelId === order.id ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Are you sure?</span>
                    <button
                      onClick={() => setConfirmCancelId(null)}
                      disabled={isCancelling}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      No
                    </button>
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={isCancelling}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCancelId(order.id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
