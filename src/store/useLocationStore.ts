import { create } from 'zustand';

interface LocationState {
  userLocation: { lat: number; lng: number } | null;
  locationName: string;
  loading: boolean;
  error: string | null;
  fetchLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  userLocation: null,
  locationName: 'Detecting location...',
  loading: false,
  error: null,
  fetchLocation: () => {
    set({ loading: true, error: null, locationName: 'Detecting location...' });
    if (!navigator.geolocation) {
      set({ 
        loading: false, 
        error: 'Geolocation is not supported',
        locationName: 'Location not supported'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        set({
          userLocation: { lat, lng },
          locationName: 'Location Updated',
          loading: false
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        set({ 
          loading: false, 
          error: 'Unable to retrieve location',
          locationName: 'Location access denied'
        });
      }
    );
  }
}));
