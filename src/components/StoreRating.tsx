import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Star } from 'lucide-react';

interface StoreRatingProps {
  storeId: string;
  currentRating?: number;
  ratingCount?: number;
  onRatingUpdate?: (newRating: number, newCount: number) => void;
}

export default function StoreRating({ storeId, currentRating, ratingCount, onRatingUpdate }: StoreRatingProps) {
  const { user, profile } = useAuthStore();
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState('');
  const [existingRatingId, setExistingRatingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== 'customer') return;

    const fetchUserRating = async () => {
      try {
        const q = query(
          collection(db, 'ratings'),
          where('storeId', '==', storeId),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const ratingData = snapshot.docs[0].data();
          setUserRating(ratingData.rating);
          setReview(ratingData.review || '');
          setExistingRatingId(snapshot.docs[0].id);
        }
      } catch (error) {
        console.error("Error fetching user rating:", error);
      }
    };

    fetchUserRating();
  }, [storeId, user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || userRating === 0) return;

    setIsSubmitting(true);
    try {
      let newTotalRating = (currentRating || 0) * (ratingCount || 0);
      let newCount = ratingCount || 0;

      if (existingRatingId) {
        // Update existing rating
        const oldRatingDoc = await getDocs(query(collection(db, 'ratings'), where('storeId', '==', storeId), where('userId', '==', user.uid)));
        const oldRating = oldRatingDoc.docs[0].data().rating;
        
        await updateDoc(doc(db, 'ratings', existingRatingId), {
          rating: userRating,
          review,
          updatedAt: serverTimestamp()
        });

        newTotalRating = newTotalRating - oldRating + userRating;
      } else {
        // Create new rating
        await addDoc(collection(db, 'ratings'), {
          storeId,
          userId: user.uid,
          rating: userRating,
          review,
          createdAt: serverTimestamp()
        });

        newTotalRating += userRating;
        newCount += 1;
        setExistingRatingId('temp'); // Just to mark it as existing in UI
      }

      const newAverage = newCount > 0 ? Number((newTotalRating / newCount).toFixed(1)) : 0;

      // Update store document
      await updateDoc(doc(db, 'stores', storeId), {
        rating: newAverage,
        ratingCount: newCount
      });

      if (onRatingUpdate) {
        onRatingUpdate(newAverage, newCount);
      }
      
      setShowForm(false);
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profile?.role !== 'customer') {
    return null;
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-6">
      {!showForm ? (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Rate this store</h3>
            <p className="text-sm text-gray-500">
              {existingRatingId ? 'You have already rated this store.' : 'Share your experience with others.'}
            </p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-orange-100 text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-200 transition-colors"
          >
            {existingRatingId ? 'Edit Rating' : 'Write a Review'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {existingRatingId ? 'Update your rating' : 'Rate your experience'}
          </h3>
          
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setUserRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <Star 
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoverRating || userRating) 
                      ? 'fill-orange-400 text-orange-400' 
                      : 'text-gray-300'
                  }`} 
                />
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Review (Optional)</label>
            <textarea 
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 focus:outline-none bg-white"
              placeholder="What did you like or dislike?"
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button 
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={userRating === 0 || isSubmitting}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
