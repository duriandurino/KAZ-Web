import axios from 'axios';
import { Amenity, AmenitySubmission, AmenityResponse } from '../utils/types';
import mongoAdapter from '../utils/mongoAdapter';

// Create an API client with consistent configuration
const apiClient = axios.create({
  baseURL: '/api',  // This ensures all requests go through the proxy to the backend
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_API_KEY
  }
});

// Extended options interface to include MongoDB-specific fields
interface MongoAmenityOptions {
  limit?: number;
  offset?: number;
  category?: string;
  is_active?: boolean;
  search?: string;
  status?: string; // MongoDB-specific field
}

// Extended amenity interface for MongoDB responses which might have id field
interface MongoAmenity extends Amenity {
  id?: string;
  _id?: string;
}

/**
 * Get all amenities with filtering options
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with amenity data and total count
 */
export async function getAmenities(
  token: string,
  options: {
    limit?: number;
    offset?: number;
    category?: string;
    is_active?: boolean;
    search?: string;
  } = {}
): Promise<AmenityResponse> {
  try {
    // Convert is_active to status for MongoDB
    const mongoOptions: MongoAmenityOptions = { ...options };
    if (options.is_active !== undefined) {
      mongoOptions.status = options.is_active ? 'Active' : 'Inactive';
      delete mongoOptions.is_active;
    }
    
    const response = await apiClient.get('/amenities', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(mongoOptions)
    });

    // Transform MongoDB response to match frontend expected format
    const amenities = Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptAmenity)
      : (response.data.amenities || []).map(mongoAdapter.adaptAmenity);
    
    const totalCount = response.data.totalCount || amenities.length;

    return {
      amenities,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching amenities:', error);
    throw error;
  }
}

/**
 * Get a specific amenity by ID
 * @param amenityId - The ID of the amenity to get
 * @param token - Authentication token
 * @returns Promise with amenity data
 */
export async function getAmenityById(
  amenityId: string | number,
  token: string
): Promise<Amenity> {
  try {
    const formattedId = mongoAdapter.formatId(amenityId);
    const response = await apiClient.get(`/amenities/${formattedId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return mongoAdapter.adaptAmenity(response.data);
  } catch (error) {
    console.error(`Error fetching amenity ${amenityId}:`, error);
    throw error;
  }
}

/**
 * Create a new amenity
 * @param amenityData - The amenity data to submit
 * @param token - Authentication token
 * @returns Promise with the created amenity
 */
export async function createAmenity(
  amenityData: AmenitySubmission,
  token: string
): Promise<Amenity> {
  try {
    // Convert frontend data format to MongoDB format
    const mongoData = {
      name: amenityData.name,
      description: amenityData.description,
      icon_name: amenityData.icon_name,
      category: amenityData.category,
      status: amenityData.is_active === false ? 'Inactive' : 'Active'
    };

    const response = await apiClient.post(
      '/amenities',
      mongoData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptAmenity(response.data);
  } catch (error) {
    console.error('Error creating amenity:', error);
    throw error;
  }
}

/**
 * Update an existing amenity
 * @param amenityId - The ID of the amenity to update
 * @param amenityData - The updated amenity data
 * @param token - Authentication token
 * @returns Promise with the updated amenity
 */
export async function updateAmenity(
  amenityId: string | number,
  amenityData: Partial<AmenitySubmission>,
  token: string
): Promise<Amenity> {
  try {
    // Convert frontend data format to MongoDB format
    const mongoData: Record<string, any> = {};
    
    if (amenityData.name !== undefined) mongoData.name = amenityData.name;
    if (amenityData.description !== undefined) mongoData.description = amenityData.description;
    if (amenityData.icon_name !== undefined) mongoData.icon_name = amenityData.icon_name;
    if (amenityData.category !== undefined) mongoData.category = amenityData.category;
    if (amenityData.is_active !== undefined) mongoData.status = amenityData.is_active ? 'Active' : 'Inactive';

    const formattedId = mongoAdapter.formatId(amenityId);
    const response = await apiClient.put(
      `/amenities/${formattedId}`,
      mongoData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptAmenity(response.data.amenity || response.data);
  } catch (error) {
    console.error(`Error updating amenity ${amenityId}:`, error);
    throw error;
  }
}

/**
 * Delete an amenity
 * @param amenityId - The ID of the amenity to delete
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function deleteAmenity(
  amenityId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedId = mongoAdapter.formatId(amenityId);
    await apiClient.delete(`/amenities/${formattedId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return true;
  } catch (error) {
    console.error(`Error deleting amenity ${amenityId}:`, error);
    throw error;
  }
}

/**
 * Toggle amenity active status
 * @param amenityId - The ID of the amenity to toggle
 * @param isActive - Whether the amenity should be active
 * @param token - Authentication token
 * @returns Promise with the updated amenity
 */
export async function toggleAmenityStatus(
  amenityId: string | number,
  isActive: boolean,
  token: string
): Promise<Amenity> {
  try {
    const formattedId = mongoAdapter.formatId(amenityId);
    const response = await apiClient.put(
      `/amenities/${formattedId}`,
      { status: isActive ? 'Active' : 'Inactive' },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptAmenity(response.data.amenity || response.data);
  } catch (error) {
    console.error(`Error toggling amenity ${amenityId} status:`, error);
    throw error;
  }
}

/**
 * Get amenities for a specific room type
 * @param roomTypeId - The ID of the room type
 * @param token - Authentication token
 * @returns Promise with array of amenities for the room type
 */
export async function getRoomTypeAmenities(
  roomTypeId: string | number,
  token: string
): Promise<MongoAmenity[]> {
  try {
    const formattedId = mongoAdapter.formatId(roomTypeId);
    const response = await apiClient.get(`/amenities/roomtypes/${formattedId}/amenities`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptAmenity)
      : (response.data.amenities || []).map(mongoAdapter.adaptAmenity);
  } catch (error) {
    console.error(`Error fetching amenities for room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Get a list of available amenity icons
 * @returns Promise with array of icon names
 */
export async function getAmenityIcons(): Promise<string[]> {
  try {
    // This is a frontend-only function, no MongoDB changes needed
    return [
      'WifiIcon',
      'TvIcon',
      'AcIcon',
      'FridgeIcon',
      'ShowerIcon',
      'BathIcon',
      'CoffeeIcon',
      'IronIcon',
      'HairdryerIcon',
      'MinibarIcon',
      'SafeIcon',
      'PoolIcon',
      'GymIcon',
      'SpaIcon',
      'ParkingIcon',
      'PetsIcon',
      'BreakfastIcon',
      'ViewIcon',
      'WheelchairIcon',
      'AccessibilityIcon'
    ];
  } catch (error) {
    console.error('Error fetching amenity icons:', error);
    return [];
  }
} 