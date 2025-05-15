import axios from 'axios';
import { Review, ReviewSubmission, ReviewResponse } from '../utils/types';
import mongoAdapter from '../utils/mongoAdapter';

// Extended options interface to include MongoDB-specific fields
interface MongoReviewOptions {
  limit?: number;
  offset?: number;
  guest_id?: string | number;
  room_id?: string | number;
  is_approved?: boolean;
  min_rating?: number;
  max_rating?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Extended review interface for MongoDB responses which might have id field
interface MongoReview extends Review {
  id?: string;
  _id?: string;
}

/**
 * Get reviews with filtering options
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with review data and total count
 */
export async function getReviews(
  token: string,
  options: {
    limit?: number;
    offset?: number;
    guest_id?: string | number;
    room_id?: string | number;
    is_approved?: boolean;
    min_rating?: number;
    max_rating?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}
): Promise<ReviewResponse> {
  try {
    // Format options for MongoDB
    const mongoOptions: MongoReviewOptions = { ...options };
    
    // Format IDs
    if (options.guest_id) mongoOptions.guest_id = mongoAdapter.formatId(options.guest_id);
    if (options.room_id) mongoOptions.room_id = mongoAdapter.formatId(options.room_id);
    
    const response = await axios.get('/reviews', {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(mongoOptions)
    });

    // Transform MongoDB response
    const reviews = Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptReview)
      : (response.data.reviews || []).map(mongoAdapter.adaptReview);
    
    const totalCount = response.data.totalCount || reviews.length;

    return {
      reviews,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
}

/**
 * Get reviews for a specific room
 * @param roomId - The ID of the room
 * @param limit - Maximum number of reviews to retrieve (optional)
 * @param offset - Number of reviews to skip (optional)
 * @param token - Authentication token (optional)
 * @returns Promise with review data and total count
 */
export async function getRoomReviews(
  roomId: string | number,
  limit?: number,
  offset?: number,
  token?: string
): Promise<ReviewResponse> {
  try {
    const formattedId = mongoAdapter.formatId(roomId);
    const headers: Record<string, string> = {
      'x-api-key': import.meta.env.VITE_API_KEY
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add pagination parameters if provided
    const params: Record<string, any> = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;
    
    const response = await axios.get(`/reviews/room/${formattedId}`, {
      headers,
      params: mongoAdapter.formatQueryParams(params)
    });

    console.log('Review response:', response.data);

    // Handle different response formats
    let reviews: Review[] = [];
    let totalCount = 0;
    
    if (Array.isArray(response.data)) {
      // Direct array of reviews
      reviews = response.data.map(mongoAdapter.adaptReview);
      totalCount = reviews.length;
    } else if (response.data.reviews) {
      // Object with reviews array
      reviews = response.data.reviews.map(mongoAdapter.adaptReview);
      totalCount = response.data.totalCount || reviews.length;
    } else if (response.data) {
      // Single review object
      const review = mongoAdapter.adaptReview(response.data);
      reviews = [review];
      totalCount = 1;
    }
    
    // Filter out unapproved reviews for public view (no token)
    if (!token) {
      reviews = reviews.filter(review => review.is_approved);
      totalCount = reviews.length;
    }
    
    return {
      reviews,
      totalCount
    };
  } catch (error) {
    console.error(`Error fetching reviews for room ${roomId}:`, error);
    // Return empty array on error
    return {
      reviews: [],
      totalCount: 0
    };
  }
}

/**
 * Get a specific review by ID
 * @param reviewId - The ID of the review
 * @param token - Authentication token
 * @returns Promise with review data
 */
export async function getReviewById(
  reviewId: string | number,
  token: string
): Promise<Review> {
  try {
    const formattedId = mongoAdapter.formatId(reviewId);
    const response = await axios.get(`/reviews/${formattedId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    return mongoAdapter.adaptReview(response.data);
  } catch (error) {
    console.error(`Error fetching review ${reviewId}:`, error);
    throw error;
  }
}

/**
 * Create a new review
 * @param reviewData - The review data to submit
 * @param token - Authentication token
 * @returns Promise with the created review
 */
export async function createReview(
  reviewData: ReviewSubmission,
  token: string
): Promise<Review> {
  try {
    // Format for MongoDB
    const mongoData = {
      booking: mongoAdapter.formatId(reviewData.booking_id),
      rating: reviewData.rating,
      comment: reviewData.comment
    };
    
    const response = await axios.post(
      '/reviews',
      mongoData,
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptReview(response.data);
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}

/**
 * Update a review's approval status (admin only)
 * @param reviewId - The ID of the review
 * @param isApproved - Whether the review should be approved
 * @param token - Authentication token
 * @returns Promise with the updated review
 */
export async function updateReviewApproval(
  reviewId: string | number,
  isApproved: boolean,
  token: string
): Promise<Review> {
  try {
    const formattedId = mongoAdapter.formatId(reviewId);
    const response = await axios.put(
      `/reviews/${formattedId}`,
      { is_approved: isApproved },
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptReview(response.data.review || response.data);
  } catch (error) {
    console.error(`Error updating review approval status for ${reviewId}:`, error);
    throw error;
  }
}

/**
 * Delete a review
 * @param reviewId - The ID of the review to delete
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function deleteReview(
  reviewId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedId = mongoAdapter.formatId(reviewId);
    await axios.delete(`/reviews/${formattedId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    return true;
  } catch (error) {
    console.error(`Error deleting review ${reviewId}:`, error);
    throw error;
  }
}

/**
 * Check if a user has already reviewed a booking
 * @param bookingId - The ID of the booking
 * @param token - Authentication token
 * @returns Promise with boolean indicating if review exists
 */
export async function hasReviewedBooking(
  bookingId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedId = mongoAdapter.formatId(bookingId);
    const response = await axios.get(`/reviews/check-booking/${formattedId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data.has_reviewed || false;
  } catch (error) {
    console.error(`Error checking if booking ${bookingId} was reviewed:`, error);
    return false;
  }
}

/**
 * Get review statistics for a room
 * @param roomId - The ID of the room
 * @returns Promise with average rating and review count
 */
export async function getRoomReviewStats(
  roomId: string | number
): Promise<{ average_rating: number; review_count: number }> {
  try {
    const formattedId = mongoAdapter.formatId(roomId);
    const response = await axios.get(`/rooms/${formattedId}/reviews/stats`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY
      }
    });

    return {
      average_rating: response.data.average_rating || 0,
      review_count: response.data.review_count || 0
    };
  } catch (error) {
    console.error(`Error fetching review stats for room ${roomId}:`, error);
    return { average_rating: 0, review_count: 0 };
  }
} 