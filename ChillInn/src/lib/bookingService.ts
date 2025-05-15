import axios from 'axios';
import { Booking } from '../utils/types';
import mongoAdapter from '../utils/mongoAdapter';
import apiClient from '../utils/apiClient';

// Extended options interface for MongoDB specifics
interface MongoBookingOptions {
  limit?: number;
  offset?: number;
  guest_id?: string | number;
  room_id?: string | number;
  status?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Get all bookings for a guest
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with booking data
 */
export async function getGuestBookings(
  token: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}
): Promise<{ bookings: Booking[]; totalCount: number }> {
  try {
    const mongoOptions: MongoBookingOptions = { ...options };
    
    console.log('Fetching guest bookings with options:', mongoOptions);
    
    const response = await apiClient.get('/bookings/mybookings', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(mongoOptions)
    });

    console.log('Bookings API response:', response.data);

    // Transform MongoDB response
    const bookings = Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptBooking)
      : (response.data.bookings || []).map(mongoAdapter.adaptBooking);
    
    const totalCount = response.data.totalCount || bookings.length;

    return {
      bookings,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Bookings API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      // Try alternative endpoint if the main one fails
      if (error.response?.status === 404) {
        console.log('Main bookings endpoint not found, trying alternative endpoint...');
        try {
          const alternativeResponse = await axios.get('/bookings/guest', {
            headers: {
              'x-api-key': import.meta.env.VITE_API_KEY,
              'Authorization': `Bearer ${token}`
            },
            params: mongoAdapter.formatQueryParams(options)
          });
          
          console.log('Alternative bookings endpoint worked:', alternativeResponse.data);
          
          // Transform response
          const altBookings = Array.isArray(alternativeResponse.data) 
            ? alternativeResponse.data.map(mongoAdapter.adaptBooking)
            : (alternativeResponse.data.bookings || []).map(mongoAdapter.adaptBooking);
          
          const altTotalCount = alternativeResponse.data.totalCount || altBookings.length;
          
          return {
            bookings: altBookings,
            totalCount: altTotalCount
          };
        } catch (altError) {
          console.error('Alternative bookings endpoint also failed:', altError);
          throw altError;
        }
      }
    }
    
    throw error;
  }
}

/**
 * Get all bookings (Admin only)
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with booking data
 */
export async function getAllBookings(
  token: string, 
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    room_id?: string | number;
    guest_id?: string | number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}
): Promise<{ bookings: Booking[]; totalCount: number }> {
  try {
    const mongoOptions: MongoBookingOptions = { ...options };
    
    if (options.room_id) {
      mongoOptions.room_id = mongoAdapter.formatId(options.room_id);
    }
    
    if (options.guest_id) {
      mongoOptions.guest_id = mongoAdapter.formatId(options.guest_id);
    }
    
    console.log('Fetching all bookings for admin with options:', mongoOptions);
    
    const response = await apiClient.get('/bookings/admin/all', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(mongoOptions)
    });

    console.log('Admin bookings API response:', response.data);

    // Transform MongoDB response
    const bookings = Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptBooking)
      : (response.data.bookings || []).map(mongoAdapter.adaptBooking);
    
    const totalCount = response.data.totalCount || bookings.length;

    return {
      bookings,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching all bookings for admin:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Admin bookings API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      // Try alternative endpoint if the main one fails
      if (error.response?.status === 404) {
        console.log('Main admin bookings endpoint not found, trying alternative endpoint...');
        try {
          const alternativeResponse = await apiClient.get('/bookings/admin', {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            params: mongoAdapter.formatQueryParams(options)
          });
          
          console.log('Alternative admin bookings endpoint worked:', alternativeResponse.data);
          
          // Transform response
          const altBookings = Array.isArray(alternativeResponse.data) 
            ? alternativeResponse.data.map(mongoAdapter.adaptBooking)
            : (alternativeResponse.data.bookings || []).map(mongoAdapter.adaptBooking);
          
          const altTotalCount = alternativeResponse.data.totalCount || altBookings.length;
          
          return {
            bookings: altBookings,
            totalCount: altTotalCount
          };
        } catch (altError) {
          console.error('Alternative admin bookings endpoint also failed:', altError);
          throw altError;
        }
      }
    }
    
    throw error;
  }
}

/**
 * Get a specific booking by ID
 * @param bookingId - The ID of the booking
 * @param token - Authentication token
 * @returns Promise with booking data
 */
export async function getBookingById(
  bookingId: string | number,
  token: string
): Promise<Booking> {
  try {
    const formattedId = mongoAdapter.formatId(bookingId);
    const response = await axios.get(`/bookings/${formattedId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    return mongoAdapter.adaptBooking(response.data);
  } catch (error) {
    console.error(`Error fetching booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Create a new booking
 * @param bookingData - The booking data to submit
 * @param token - Authentication token
 * @returns Promise with the created booking
 */
export async function createBooking(
  bookingData: {
    room_id: string | number;
    check_in: string;
    check_out: string;
    guests: number;
    total_price?: number;
    payment_method?: string;
    special_requests?: string;
  },
  token: string
): Promise<Booking> {
  try {
    // Format for MongoDB
    const mongoData = {
      ...bookingData,
      room_id: mongoAdapter.formatId(bookingData.room_id)
    };
    
    console.log('Creating booking with formatted data:', mongoData);
    console.log('Using token:', token ? 'Valid token exists' : 'No token');
    
    // Use apiClient to ensure proper base URL
    const response = await apiClient.post(
      '/bookings',
      mongoData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Booking API response:', response.data);
    return mongoAdapter.adaptBooking(response.data.booking || response.data);
  } catch (error) {
    console.error('Error creating booking:', error);
    // Store mongoData for potential reuse in fallback
    const formattedData = {
      ...bookingData,
      room_id: mongoAdapter.formatId(bookingData.room_id)
    };
    
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Try the alternative endpoint if the main one fails
      if (error.response?.status === 404) {
        console.log('Main booking endpoint not found, trying alternative endpoint...');
        try {
          const alternativeResponse = await apiClient.post(
            '/bookings/create',
            formattedData,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          console.log('Alternative booking endpoint worked:', alternativeResponse.data);
          return mongoAdapter.adaptBooking(alternativeResponse.data.booking || alternativeResponse.data);
        } catch (altError) {
          console.error('Alternative booking endpoint also failed:', altError);
          throw altError;
        }
      }
    }
    throw error;
  }
}

/**
 * Cancel a booking
 * @param bookingId - The ID of the booking to cancel
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function cancelBooking(
  bookingId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedId = mongoAdapter.formatId(bookingId);
    
    console.log(`Attempting to cancel booking ${formattedId}`);
    
    // Use DELETE method to match the backend route (router.delete('/:id', ...))
    await apiClient.delete(
      `/bookings/${formattedId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log(`Successfully cancelled booking ${formattedId}`);
    return true;
  } catch (error) {
    console.error(`Error cancelling booking ${bookingId}:`, error);
    
    if (axios.isAxiosError(error)) {
      console.error('Cancel booking API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      // Try alternative endpoint if the main one fails
      if (error.response?.status === 404) {
        console.log('Main cancel endpoint not found, trying alternative endpoint...');
        try {
          const altFormattedId = mongoAdapter.formatId(bookingId);
          await axios.put(
            `/bookings/${altFormattedId}/cancel`,
            {},
            {
              headers: {
                'x-api-key': import.meta.env.VITE_API_KEY,
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          console.log('Alternative cancel endpoint worked');
          return true;
        } catch (altError) {
          console.error('Alternative cancel endpoint also failed:', altError);
          throw altError;
        }
      }
    }
    throw error;
  }
}

export default {
  getGuestBookings,
  getAllBookings,
  getBookingById,
  createBooking,
  cancelBooking
};