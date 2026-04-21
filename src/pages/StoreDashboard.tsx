import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Store, Package, Settings, Plus, Minus, Edit2, Trash2, Upload } from 'lucide-react';

export default function StoreDashboard() {
  const { user } = useAuthStore();
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'settings'>('orders');
  const [orderFilter, setOrderFilter] = useState<string>('active');
  const [loading, setLoading] = useState(true);

  // New Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '', stockCount: 10, imageUrl: '' });

  const defaultOperatingHours = {
    monday: { open: '09:00', close: '17:00', isClosed: false },
    tuesday: { open: '09:00', close: '17:00', isClosed: false },
    wednesday: { open: '09:00', close: '17:00', isClosed: false },
    thursday: { open: '09:00', close: '17:00', isClosed: false },
    friday: { open: '09:00', close: '17:00', isClosed: false },
    saturday: { open: '09:00', close: '17:00', isClosed: false },
    sunday: { open: '09:00', close: '17:00', isClosed: true },
  };

  const [operatingHours, setOperatingHours] = useState<any>(defaultOperatingHours);
  const [isSavingHours, setIsSavingHours] = useState(false);

  const [storeLocation, setStoreLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState('');

  const handleGetLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStoreLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        setLocationError('Unable to retrieve your location');
        console.error("Geolocation error:", error);
      }
    );
  };

  useEffect(() => {
    if (!user) return;

    let unsubscribeOrders: () => void;
    let unsubscribeProducts: () => void;

    const fetchStoreAndListen = async () => {
      try {
        const q = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const storeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setStore(storeData);
          if (storeData.operatingHours) {
            setOperatingHours(storeData.operatingHours);
          }
          
          // Listen to orders
          const ordersQ = query(collection(db, 'orders'), where('storeOwnerId', '==', user.uid));
          unsubscribeOrders = onSnapshot(ordersQ, (orderSnap) => {
            setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }, (err) => console.error("Order listener error:", err));

          // Listen to products
          const productsQ = query(collection(db, 'products'), where('storeId', '==', storeData.id));
          unsubscribeProducts = onSnapshot(productsQ, (prodSnap) => {
            setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }, (err) => console.error("Product listener error:", err));

        }
      } catch (error) {
        console.error("Error fetching store:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreAndListen();

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeProducts) unsubscribeProducts();
    };
  }, [user]);

  // Set up listeners if store is created in the current session
  useEffect(() => {
    if (!store?.id) return;
    
    const ordersQ = query(collection(db, 'orders'), where('storeOwnerId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(ordersQ, (orderSnap) => {
      setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Order listener error (second):", err));

    const productsQ = query(collection(db, 'products'), where('storeId', '==', store.id));
    const unsubscribeProducts = onSnapshot(productsQ, (prodSnap) => {
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Product listener error (second):", err));

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, [store?.id]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const storeData = {
      ownerId: user!.uid,
      name: form.storeName.value,
      category: form.category.value,
      address: form.address.value,
      description: form.description.value,
      lat: storeLocation ? storeLocation.lat : 0,
      lng: storeLocation ? storeLocation.lng : 0,
      isOpen: true,
      deliveryRadius: 5,
      operatingHours: defaultOperatingHours,
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'stores'), storeData);
      setStore({ id: docRef.id, ...storeData });
    } catch (error) {
      console.error("Error creating store:", error);
      alert("Failed to create store");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setNewProduct({ ...newProduct, imageUrl: dataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    try {
      await addDoc(collection(db, 'products'), {
        storeId: store.id,
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        stockCount: Number(newProduct.stockCount),
        imageUrl: newProduct.imageUrl || null,
        createdAt: serverTimestamp()
      });
      setShowAddProduct(false);
      setNewProduct({ name: '', description: '', price: '', category: '', stockCount: 10, imageUrl: '' });
    } catch (error: any) {
      console.error("Error adding product:", error);
      alert("Error adding product: " + error.message);
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;
    try {
      await updateDoc(doc(db, 'products', productId), {
        stockCount: newStock
      });
    } catch (error: any) {
      console.error("Error updating stock:", error);
      alert("Error updating stock: " + error.message);
    }
  };

  const handleSaveOperatingHours = async () => {
    if (!store) return;
    setIsSavingHours(true);
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        operatingHours
      });
      setStore({ ...store, operatingHours });
      alert('Operating hours saved successfully');
    } catch (error) {
      console.error("Error saving operating hours:", error);
      alert('Failed to save operating hours');
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleToggleStoreStatus = async () => {
    if (!store) return;
    try {
      await updateDoc(doc(db, 'stores', store.id), {
        isOpen: !store.isOpen
      });
      setStore({ ...store, isOpen: !store.isOpen });
    } catch (error) {
      console.error("Error toggling store status:", error);
    }
  };

  if (loading) return <div className="text-center py-12">Loading dashboard...</div>;

  if (!store) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <Store className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Create Your Store</h1>
          <p className="text-gray-500">Set up your local business on LIST IT</p>
        </div>

        <form onSubmit={handleCreateStore} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
            <input name="storeName" required className="w-full p-3 border rounded-xl" placeholder="e.g. Fresh Mart" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="category" required className="w-full p-3 border rounded-xl bg-white">
              <option value="Grocery">Grocery</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Food">Food</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" className="w-full p-3 border rounded-xl" placeholder="Short description of your store"></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input name="address" required className="w-full p-3 border rounded-xl" placeholder="Full physical address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Location (Coordinates)</label>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={handleGetLocation}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200"
              >
                Get Current Location
              </button>
              {storeLocation && (
                <span className="text-sm text-green-600 font-medium">
                  Location set ({storeLocation.lat.toFixed(4)}, {storeLocation.lng.toFixed(4)})
                </span>
              )}
            </div>
            {locationError && <p className="text-red-500 text-sm mt-1">{locationError}</p>}
            {!storeLocation && !locationError && <p className="text-gray-500 text-sm mt-1">Please set your location to appear in nearby searches.</p>}
          </div>
          <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600">
            Create Store
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{store.name} Dashboard</h1>
          <p className="text-gray-500">Manage your orders and inventory</p>
        </div>
        <button 
          onClick={handleToggleStoreStatus}
          className={`px-4 py-2 rounded-lg font-medium ${store.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {store.isOpen ? 'Store is Open' : 'Store is Closed'}
        </button>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-2 font-medium border-b-2 transition-colors ${activeTab === 'orders' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Active Orders ({orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length})
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`pb-4 px-2 font-medium border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Inventory ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-2 font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Settings
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="grid gap-6">
          <div className="flex justify-end mb-2">
            <select 
              value={orderFilter} 
              onChange={(e) => setOrderFilter(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="active">Active Orders</option>
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {(() => {
            const filteredOrders = orders.filter(o => {
              if (orderFilter === 'active') return !['delivered', 'cancelled'].includes(o.status);
              if (orderFilter === 'all') return true;
              return o.status === orderFilter;
            });

            if (filteredOrders.length === 0) {
              return (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No orders found for this filter.</p>
                </div>
              );
            }

            return filteredOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Order #{order.id.slice(-6).toUpperCase()}</span>
                    <h3 className="font-bold text-gray-900 mt-1">{order.type.toUpperCase()}</h3>
                  </div>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div className="border-t border-b border-gray-50 py-4 my-4">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm mb-1">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="font-medium text-gray-500">Total</span>
                  <span className="font-bold text-lg">₹{order.totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'accepted')} className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600">Accept Order</button>
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')} className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg font-medium hover:bg-red-200">Reject</button>
                    </>
                  )}
                  {order.status === 'accepted' && (
                    <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600">Start Preparing</button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => handleUpdateOrderStatus(order.id, 'ready')} className="w-full bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600">Mark as Ready</button>
                  )}
                  {order.status === 'ready' && order.type === 'takeaway' && (
                    <button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800">Handed to Customer</button>
                  )}
                  {order.status === 'ready' && order.type === 'delivery' && (
                    <div className="w-full text-center py-2 bg-gray-100 text-gray-600 rounded-lg font-medium">Waiting for Delivery Agent</div>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div className="flex justify-end mb-6">
            <button 
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          </div>

          {showAddProduct && (
            <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="e.g. Beverages" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Count</label>
                <input required type="number" min="0" value={newProduct.stockCount} onChange={e => setNewProduct({...newProduct, stockCount: parseInt(e.target.value) || 0})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="flex items-center gap-3">
                  {newProduct.imageUrl && (
                    <img src={newProduct.imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                  )}
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-orange-500 hover:bg-orange-50 transition-colors">
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">Upload Photo</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowAddProduct(false)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                <button type="submit" className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium">Save Product</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-medium text-gray-600">Product</th>
                  <th className="p-4 font-medium text-gray-600">Category</th>
                  <th className="p-4 font-medium text-gray-600">Price</th>
                  <th className="p-4 font-medium text-gray-600">Stock</th>
                  <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-gray-50 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          {product.description && <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500">{product.category}</td>
                    <td className="p-4 text-gray-900">₹{product.price.toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateStock(product.id, (product.stockCount || 0) - 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"><Minus className="h-3 w-3" /></button>
                        <span className="w-8 text-center font-medium text-sm">{product.stockCount || 0}</span>
                        <button onClick={() => handleUpdateStock(product.id, (product.stockCount || 0) + 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"><Plus className="h-3 w-3" /></button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {/* Edit/Delete placeholders */}
                      <button className="text-gray-400 hover:text-gray-900 p-1"><Edit2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="text-center py-8 text-gray-500">No products added yet.</div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Operating Hours</h2>
          <div className="space-y-4">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <div key={day} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl">
                <div className="w-32">
                  <span className="font-medium text-gray-900 capitalize">{day}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={!operatingHours[day].isClosed}
                    onChange={(e) => setOperatingHours({
                      ...operatingHours,
                      [day]: { ...operatingHours[day], isClosed: !e.target.checked }
                    })}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </div>
                {!operatingHours[day].isClosed && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input 
                      type="time" 
                      value={operatingHours[day].open}
                      onChange={(e) => setOperatingHours({
                        ...operatingHours,
                        [day]: { ...operatingHours[day], open: e.target.value }
                      })}
                      className="p-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input 
                      type="time" 
                      value={operatingHours[day].close}
                      onChange={(e) => setOperatingHours({
                        ...operatingHours,
                        [day]: { ...operatingHours[day], close: e.target.value }
                      })}
                      className="p-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                )}
                {operatingHours[day].isClosed && (
                  <div className="ml-auto text-sm text-gray-500 italic">Closed all day</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSaveOperatingHours}
              disabled={isSavingHours}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isSavingHours ? 'Saving...' : 'Save Hours'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
