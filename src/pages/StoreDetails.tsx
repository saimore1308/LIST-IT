import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCartStore } from '../store/useCartStore';
import { Star, Clock, MapPin, Plus, Minus, ShoppingBag } from 'lucide-react';
import StoreRating from '../components/StoreRating';
import { isStoreCurrentlyOpen, getTodayOperatingHours } from '../lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockCount: number;
  category: string;
  imageUrl?: string;
}

export default function StoreDetails() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { items, addItem, updateQuantity, getTotal } = useCartStore();

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      if (!storeId) return;
      
      try {
        const storeDoc = await getDoc(doc(db, 'stores', storeId));
        if (storeDoc.exists()) {
          setStore({ id: storeDoc.id, ...storeDoc.data() });
        }

        const q = query(collection(db, 'products'), where('storeId', '==', storeId));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreAndProducts();
  }, [storeId]);

  const getQuantity = (productId: string) => {
    return items.find(i => i.productId === productId)?.quantity || 0;
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!store) return <div className="text-center py-12">Store not found</div>;

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const handleRatingUpdate = (newRating: number, newCount: number) => {
    setStore({ ...store, rating: newRating, ratingCount: newCount });
  };

  return (
    <div className="pb-24">
      {/* Store Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="w-24 h-24 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-orange-500">{store.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
              {!isStoreCurrentlyOpen(store.operatingHours, store.isOpen) && (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">Closed</span>
              )}
            </div>
            <p className="text-gray-500 mb-4">{store.description || store.category}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md font-medium">
                <Star className="h-4 w-4 fill-current" />
                {store.rating || 'New'} {store.ratingCount ? `(${store.ratingCount})` : ''}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{getTodayOperatingHours(store.operatingHours)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{store.address}</span>
              </div>
            </div>
          </div>
        </div>
        
        <StoreRating 
          storeId={store.id} 
          currentRating={store.rating} 
          ratingCount={store.ratingCount} 
          onRatingUpdate={handleRatingUpdate} 
        />
      </div>

      {/* Menu */}
      <div className="space-y-12">
        {Object.entries(productsByCategory).map(([category, categoryProducts]: [string, Product[]]) => (
          <div key={category}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryProducts.map((product) => {
                const quantity = getQuantity(product.id);
                return (
                  <div key={product.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4 hover:shadow-md transition-all">
                    <div className="w-24 h-24 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No img</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
                        
                        {isStoreCurrentlyOpen(store.operatingHours, store.isOpen) && (product.stockCount || 0) > 0 ? (
                          quantity > 0 ? (
                            <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-1">
                              <button 
                                onClick={() => updateQuantity(product.id, quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center bg-white text-orange-600 rounded-md shadow-sm"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="font-medium text-orange-600 w-4 text-center">{quantity}</span>
                              <button 
                                onClick={() => quantity < (product.stockCount || 0) && updateQuantity(product.id, quantity + 1)}
                                disabled={quantity >= (product.stockCount || 0)}
                                className={`w-8 h-8 flex items-center justify-center rounded-md shadow-sm ${quantity >= (product.stockCount || 0) ? 'bg-orange-300 text-white cursor-not-allowed' : 'bg-orange-500 text-white'}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => addItem({
                                productId: product.id,
                                name: product.name,
                                price: product.price,
                                quantity: 1,
                                imageUrl: product.imageUrl || ""
                              }, storeId!)}
                              className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                            >
                              Add
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-red-500 font-medium">Out of stock</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 text-orange-600 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                {items.reduce((acc, item) => acc + item.quantity, 0)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-bold text-gray-900">₹{getTotal().toFixed(2)}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/cart')}
              className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
