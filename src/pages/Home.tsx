import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Search, Star, Clock, MapPin, Store, Navigation, ShoppingBasket, Pill, Utensils, Drumstick, Croissant, PawPrint, Gift, LayoutGrid } from 'lucide-react';

const CATEGORIES = [
  { name: 'Grocery', icon: ShoppingBasket },
  { name: 'Pharmacy', icon: Pill },
  { name: 'Food', icon: Utensils },
  { name: 'Meat', icon: Drumstick },
  { name: 'Bakery', icon: Croissant },
  { name: 'Pet Care', icon: PawPrint },
  { name: 'Gifts', icon: Gift },
  { name: 'More', icon: LayoutGrid },
];
import { useAuthStore } from '../store/useAuthStore';
import { useLocationStore } from '../store/useLocationStore';
import { isStoreCurrentlyOpen, getTodayOperatingHours, OperatingHours } from '../lib/utils';

interface Store {
  id: string;
  name: string;
  category: string;
  rating: number;
  ratingCount?: number;
  isOpen: boolean;
  operatingHours?: OperatingHours;
  address: string;
  imageUrl?: string;
  lat: number;
  lng: number;
  distance?: number;
}

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();
  const { userLocation, loading: locationLoading, fetchLocation } = useLocationStore();

  const handleGetLocation = () => {
    fetchLocation();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all open stores
        const storesQ = query(collection(db, 'stores'));
        const storesSnapshot = await getDocs(storesQ);
        const storesData = storesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Store[];
        setStores(storesData);

        // Fetch all products for search
        const productsQ = query(collection(db, 'products'));
        const productsSnapshot = await getDocs(productsQ);
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredStores = stores.filter(store => {
    const queryLower = searchQuery.toLowerCase();
    
    // Check if store name or category matches
    const matchesStore = store.name.toLowerCase().includes(queryLower) ||
                         store.category.toLowerCase().includes(queryLower);
    
    // Check if any product in this store matches
    const storeProducts = products.filter(p => p.storeId === store.id);
    const matchesProduct = storeProducts.some(p => 
      p.name.toLowerCase().includes(queryLower) ||
      (p.description && p.description.toLowerCase().includes(queryLower)) ||
      (p.category && p.category.toLowerCase().includes(queryLower))
    );

    return matchesStore || matchesProduct;
  }).map(store => {
    if (userLocation && store.lat && store.lng) {
      return {
        ...store,
        distance: calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng)
      };
    }
    return store;
  }).sort((a, b) => {
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    return 0;
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 sm:p-12 text-white shadow-lg">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Anything you need,<br />delivered locally.
        </h1>
        <p className="text-orange-100 text-lg mb-8 max-w-xl">
          Support local businesses and get groceries, food, and pharmacy items delivered to your door in minutes.
        </p>
        
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 rounded-xl text-gray-900 bg-white shadow-md focus:ring-2 focus:ring-orange-300 focus:outline-none"
            placeholder="Search for stores, groceries, food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = searchQuery.toLowerCase() === cat.name.toLowerCase();
          return (
            <div 
              key={cat.name} 
              className="flex flex-col items-center gap-2 cursor-pointer group"
              onClick={() => {
                if (cat.name === 'More') return;
                if (isSelected) {
                  setSearchQuery('');
                } else {
                  setSearchQuery(cat.name);
                }
              }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-white shadow-sm border flex items-center justify-center group-hover:shadow-md transition-all ${isSelected ? 'border-orange-500 shadow-md bg-orange-50' : 'border-gray-100 group-hover:border-orange-200'}`}>
                <Icon className={`w-8 h-8 ${isSelected ? 'text-orange-500' : 'text-gray-500 group-hover:text-orange-400 transition-colors'}`} strokeWidth={1.5} />
              </div>
              <span className={`text-sm font-medium text-center ${isSelected ? 'text-orange-600' : 'text-gray-700'}`}>{cat.name}</span>
            </div>
          );
        })}
      </div>

      {/* Stores List */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Nearby Stores</h2>
          <button 
            onClick={handleGetLocation}
            disabled={locationLoading}
            className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-medium hover:bg-orange-200 transition-colors disabled:opacity-50"
          >
            <Navigation className="h-4 w-4" />
            {locationLoading ? 'Finding you...' : userLocation ? 'Location Updated' : 'Use My Location'}
          </button>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-4 h-64 border border-gray-100"></div>
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <Link 
                key={store.id} 
                to={`/store/${store.id}`}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="h-40 bg-gray-200 relative overflow-hidden">
                  {store.imageUrl ? (
                    <img src={store.imageUrl} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                      <Store className="h-12 w-12 text-orange-300" />
                    </div>
                  )}
                  {!isStoreCurrentlyOpen(store.operatingHours, store.isOpen) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-white text-gray-900 px-3 py-1 rounded-full text-sm font-bold">Closed</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{store.name}</h3>
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md text-sm font-medium">
                      <Star className="h-3 w-3 fill-current" />
                      {store.rating || 'New'} {store.ratingCount ? `(${store.ratingCount})` : ''}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">{store.category}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{getTodayOperatingHours(store.operatingHours)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {store.distance !== undefined && (
                      <div className="flex items-center gap-1">
                        <Navigation className="h-4 w-4 text-gray-400" />
                        <span>{store.distance.toFixed(1)} km</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="line-clamp-1">{store.address}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No stores found</h3>
            <p className="text-gray-500">Try adjusting your search or location.</p>
          </div>
        )}
      </div>
    </div>
  );
}
