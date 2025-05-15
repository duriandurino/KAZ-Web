import apiClient from '../utils/apiClient';
import { Room, RoomService } from '../utils/types';
import mongoAdapter from '../utils/mongoAdapter';

// Room search options interface
interface RoomSearchOptions {
  limit?: number;
  offset?: number;
  room_type?: string;
  min_price?: number;
  max_price?: number;
  min_capacity?: number;
  max_capacity?: number;
  check_in?: string;
  check_out?: string;
  amenities?: string[];
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Get available rooms with filtering options
 * @param options - Search and filtering options
 * @param token - Authentication token (optional for public endpoints)
 * @returns Promise with room data and total count
 */
export async function getAvailableRooms(
  options: RoomSearchOptions = {},
  token?: string
): Promise<{ rooms: Room[]; totalCount: number }> {
  try {
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Fetching available rooms with params:', mongoAdapter.formatQueryParams(options));
    
    const response = await apiClient.get('/room/available', {
      headers,
      params: mongoAdapter.formatQueryParams(options)
    });

    console.log('Raw response from /room/available:', response.data);
    
    // If the response has a rooms array (from our updated endpoint)
    if (response.data && response.data.rooms) {
      const rooms = response.data.rooms.map(adaptRoom);
      const totalCount = response.data.totalCount || rooms.length;
      
      return {
        rooms,
        totalCount
      };
    }
    
    // Fallback for old response format (direct array)
    const rooms = Array.isArray(response.data) 
      ? response.data.map(adaptRoom)
      : [];
    
    return {
      rooms,
      totalCount: rooms.length
    };
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    throw error;
  }
}

/**
 * Get all rooms (admin function)
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with room data and total count
 */
export async function getAllRooms(
  token: string,
  options: { 
    limit?: number;
    offset?: number;
    status?: string;
    room_type?: string;
  } = {}
): Promise<{ rooms: Room[]; totalCount: number }> {
  try {
    console.log('Fetching all rooms with params:', mongoAdapter.formatQueryParams(options));
    
    const response = await apiClient.get('/room/getallrooms', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(options)
    });

    console.log('Raw response from /room/getallrooms:', response.data);
    
    // Handle response format - it could be an array or an object with rooms property
    let rooms: Room[] = [];
    
    if (Array.isArray(response.data)) {
      rooms = response.data.map(adaptRoom);
    } else if (response.data && response.data.rooms && Array.isArray(response.data.rooms)) {
      rooms = response.data.rooms.map(adaptRoom);
    } else if (response.data) {
      rooms = [adaptRoom(response.data)];
    }
    
    const totalCount = response.data.totalCount || rooms.length;

    return {
      rooms,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching all rooms:', error);
    throw error;
  }
}

/**
 * Get a specific room by ID
 * @param roomId - The ID of the room
 * @param token - Authentication token (optional for public endpoints)
 * @returns Promise with room data
 */
export async function getRoomById(
  roomId: string | number,
  token?: string
): Promise<Room> {
  try {
    const formattedId = mongoAdapter.formatId(roomId);
    console.log(`Fetching room details for ID: ${formattedId}`);
    
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await apiClient.get(`/room/getroombyid/${formattedId}`, {
      headers
    });

    console.log('Raw room response data:', response.data);
    
    // Transform the data using adaptRoom
    const adaptedRoom = adaptRoom(response.data);
    console.log('Adapted room data:', adaptedRoom);
    
    return adaptedRoom;
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error);
    // If throwing error isn't desired, return a default room object
    throw error;
  }
}

/**
 * Check room availability for specific dates
 * @param roomId - The ID of the room
 * @param checkIn - Check-in date string
 * @param checkOut - Check-out date string
 * @returns Promise with availability status
 */
export async function checkRoomAvailability(
  roomId: string | number,
  checkIn: string,
  checkOut: string
): Promise<{ available: boolean; conflicting_bookings?: any[] }> {
  try {
    const formattedId = mongoAdapter.formatId(roomId);
    const response = await apiClient.get(`/room/${formattedId}/availability`, {
      params: {
        check_in: checkIn,
        check_out: checkOut
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error checking availability for room ${roomId}:`, error);
    throw error;
  }
}

/**
 * Get featured rooms for homepage
 * @returns Promise with featured rooms
 */
export async function getFeaturedRooms(): Promise<Room[]> {
  try {
    const response = await apiClient.get('/room/featured');

    // Transform MongoDB response
    return Array.isArray(response.data) 
      ? response.data.map(adaptRoom)
      : (response.data.rooms || []).map(adaptRoom);
  } catch (error) {
    console.error('Error fetching featured rooms:', error);
    throw error;
  }
}

/**
 * Helper function to adapt room data from MongoDB format
 */
function adaptRoom(roomData: any): Room {
  if (!roomData) return roomData;
  
  // Apply general ID adaptation
  const adapted = mongoAdapter.adaptId(roomData);
  
  // Convert _id to room_id if needed
  if (adapted._id && !adapted.room_id) {
    adapted.room_id = adapted._id;
  }
  
  // Handle the room_type field
  let roomType;
  if (typeof adapted.room_type === 'object' && adapted.room_type !== null) {
    // If room_type is already an object, adapt it
    roomType = {
      room_type_id: adapted.room_type._id || adapted.room_type.room_type_id || adapted.room_type_id,
      name: adapted.room_type.name || adapted.room_type_name || 'Standard Room',
      price: adapted.room_type.price || adapted.room_type_price || 0,
      capacity: adapted.room_type.capacity || adapted.room_type_capacity || 1,
      description: adapted.room_type.description || adapted.room_type_description,
      amenities: adapted.room_type.amenities || adapted.amenities || []
    };
  } else {
    // If room_type is not an object, construct one from individual fields
    roomType = {
      room_type_id: adapted.room_type_id || adapted.room_type || 0,
      name: adapted.room_type_name || 'Standard Room',
      price: adapted.room_type_price || 0,
      capacity: adapted.room_type_capacity || 1,
      description: adapted.room_type_description || '',
      amenities: adapted.amenities || []
    };
  }
  
  // Normalize the images array - check all possible image fields
  let images: string[] = [];
  
  // Common function to extract image URLs from different formats
  const extractImageUrl = (img: any): string | null => {
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (typeof img === 'object') {
      // Check for all possible image URL field names
      return img.image_url || img.imageUrl || img.url || null;
    }
    return null;
  };
  
  // Process image arrays - extract URLs from each image
  const processImageArray = (imgArray: any[]): string[] => {
    return imgArray
      .map(extractImageUrl)
      .filter((url): url is string => url !== null);
  };
  
  // Check possible image sources in order of preference
  if (adapted.images) {
    if (Array.isArray(adapted.images)) {
      images = processImageArray(adapted.images);
    } else if (typeof adapted.images === 'string') {
      images = [adapted.images];
    }
  }
  
  // Try preview_images if still empty
  if (images.length === 0 && adapted.preview_images) {
    if (Array.isArray(adapted.preview_images)) {
      images = processImageArray(adapted.preview_images);
    } else if (typeof adapted.preview_images === 'string') {
      images = [adapted.preview_images];
    }
  }
  
  // Try room_images if still empty
  if (images.length === 0 && adapted.room_images) {
    if (Array.isArray(adapted.room_images)) {
      images = processImageArray(adapted.room_images);
    } else if (typeof adapted.room_images === 'string') {
      images = [adapted.room_images];
    }
  }
  
  // Try thumbnail_url as last resort
  if (images.length === 0) {
    const thumbnailUrl = adapted.thumbnail_url || adapted.thumbnailUrl || adapted.thumbnail;
    if (thumbnailUrl) {
      images = [thumbnailUrl];
    }
  }
  
  // If still no images, use default image
  if (images.length === 0) {
    images = ["https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070"];
  }
  
  return {
    ...adapted,
    room_id: adapted.room_id || adapted._id || adapted.id,
    room_number: adapted.room_number || '',
    status: adapted.status || adapted.room_status || 'Available',
    room_type: roomType,
    images: images,
    description: adapted.description || roomType.description || ''
  };
}

/**
 * Get all room types 
 * @param token - Authentication token (optional for public endpoints)
 * @returns Promise with room type data
 */
export async function getRoomTypes(token?: string): Promise<any[]> {
  try {
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await apiClient.get('/room/getroomtypes', {
      headers
    });

    return Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptId)
      : [];
  } catch (error) {
    console.error('Error fetching room types:', error);
    throw error;
  }
}

/**
 * Get services for a specific room type
 * @param roomTypeId - The ID of the room type
 * @param token - Authentication token
 * @returns Promise with array of room services
 */
export async function getRoomTypeServices(
  roomTypeId: string | number,
  token: string
): Promise<RoomService[]> {
  try {
    const formattedId = mongoAdapter.formatId(roomTypeId);
    const response = await apiClient.get(`/room/roomtypes/${formattedId}/services`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Extract and transform the services
    const roomTypeServices = Array.isArray(response.data.services) 
      ? response.data.services
      : [];

    return roomTypeServices.map((rts: any) => ({
      service: mongoAdapter.adaptService(rts.service),
      included: rts.included,
      discount_percentage: rts.discount_percentage
    }));
  } catch (error) {
    console.error(`Error fetching services for room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Assign a service to a room type (Admin function)
 * @param roomTypeId - The ID of the room type
 * @param serviceId - The ID of the service
 * @param included - Whether the service is included in room price
 * @param discountPercentage - Discount percentage for the service
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function assignServiceToRoomType(
  roomTypeId: string | number,
  serviceId: string | number,
  included: boolean,
  discountPercentage: number,
  token: string
): Promise<boolean> {
  try {
    const formattedRoomTypeId = mongoAdapter.formatId(roomTypeId);
    const formattedServiceId = mongoAdapter.formatId(serviceId);
    
    await apiClient.post(
      `/services/roomtypes/${formattedRoomTypeId}/services`, 
      {
        service_id: formattedServiceId,
        included,
        discount_percentage: discountPercentage
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`Error assigning service ${serviceId} to room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Update service assignment for a room type (Admin function)
 * @param roomTypeId - The ID of the room type
 * @param serviceId - The ID of the service
 * @param included - Whether the service is included in room price
 * @param discountPercentage - Discount percentage for the service
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function updateRoomTypeService(
  roomTypeId: string | number,
  serviceId: string | number,
  included: boolean,
  discountPercentage: number,
  token: string
): Promise<boolean> {
  try {
    const formattedRoomTypeId = mongoAdapter.formatId(roomTypeId);
    const formattedServiceId = mongoAdapter.formatId(serviceId);
    
    await apiClient.put(
      `/services/roomtypes/${formattedRoomTypeId}/services/${formattedServiceId}`, 
      {
        included,
        discount_percentage: discountPercentage
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`Error updating service ${serviceId} for room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Remove a service from a room type (Admin function)
 * @param roomTypeId - The ID of the room type
 * @param serviceId - The ID of the service
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function removeServiceFromRoomType(
  roomTypeId: string | number,
  serviceId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedRoomTypeId = mongoAdapter.formatId(roomTypeId);
    const formattedServiceId = mongoAdapter.formatId(serviceId);
    
    await apiClient.delete(
      `/services/roomtypes/${formattedRoomTypeId}/services/${formattedServiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`Error removing service ${serviceId} from room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Get amenities for a specific room type
 * @param roomTypeId - The ID of the room type
 * @param token - Authentication token
 * @returns Promise with array of amenities
 */
export async function getRoomTypeAmenities(
  roomTypeId: string | number,
  token: string
): Promise<any[]> {
  try {
    const formattedId = mongoAdapter.formatId(roomTypeId);
    const response = await apiClient.get(`/amenities/roomtypes/${formattedId}/amenities`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const amenities = Array.isArray(response.data.amenities) 
      ? response.data.amenities
      : [];

    return amenities.map(mongoAdapter.adaptAmenity);
  } catch (error) {
    console.error(`Error fetching amenities for room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Assign an amenity to a room type (Admin function)
 * @param roomTypeId - The ID of the room type
 * @param amenityId - The ID of the amenity
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function assignAmenityToRoomType(
  roomTypeId: string | number,
  amenityId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedRoomTypeId = mongoAdapter.formatId(roomTypeId);
    const formattedAmenityId = mongoAdapter.formatId(amenityId);
    
    await apiClient.post(
      `/amenities/roomtypes/${formattedRoomTypeId}/amenities`, 
      {
        amenity_id: formattedAmenityId
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`Error assigning amenity ${amenityId} to room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Remove an amenity from a room type (Admin function)
 * @param roomTypeId - The ID of the room type
 * @param amenityId - The ID of the amenity
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function removeAmenityFromRoomType(
  roomTypeId: string | number,
  amenityId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedRoomTypeId = mongoAdapter.formatId(roomTypeId);
    const formattedAmenityId = mongoAdapter.formatId(amenityId);
    
    await apiClient.delete(
      `/amenities/roomtypes/${formattedRoomTypeId}/amenities/${formattedAmenityId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`Error removing amenity ${amenityId} from room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Create a new room type (Admin function)
 * @param roomTypeData - Room type data
 * @param token - Authentication token
 * @returns Promise with created room type data
 */
export async function createRoomType(
  roomTypeData: {
    name: string;
    price: number;
    capacity: number;
    description?: string;
    size?: number;
    beds?: number;
    status?: string;
    category?: string;
  },
  token: string
): Promise<any> {
  try {
    const response = await apiClient.post(
      '/room/add-roomtype',
      roomTypeData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptId(response.data);
  } catch (error) {
    console.error('Error creating room type:', error);
    throw error;
  }
}

/**
 * Update a room type (Admin function)
 * @param roomTypeId - The ID of the room type to update
 * @param roomTypeData - Room type data to update
 * @param token - Authentication token
 * @returns Promise with updated room type data
 */
export async function updateRoomType(
  roomTypeId: string | number,
  roomTypeData: {
    name?: string;
    price?: number;
    capacity?: number;
    description?: string;
    size?: number;
    beds?: number;
    status?: string;
    category?: string;
  },
  token: string
): Promise<any> {
  try {
    const formattedId = mongoAdapter.formatId(roomTypeId);
    
    const response = await apiClient.put(
      `/room/updateroomtypebyid/${formattedId}`,
      roomTypeData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptId(response.data);
  } catch (error) {
    console.error(`Error updating room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Delete a room type (Admin function)
 * @param roomTypeId - The ID of the room type to delete
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function deleteRoomType(
  roomTypeId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedId = mongoAdapter.formatId(roomTypeId);
    
    await apiClient.delete(
      `/room/deleteroomtypebyid/${formattedId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`Error deleting room type ${roomTypeId}:`, error);
    throw error;
  }
}

/**
 * Create a new room
 * @param roomData - Room data including room_number, type_id, floor, and status
 * @param token - Authentication token
 * @returns Promise with created room data
 */
export async function createRoom(
  roomData: {
    room_number: string;
    type_id: number | string;
    floor: string;
    status: string;
    images?: string[];
    image_ids?: string[];
  },
  token: string
): Promise<any> {
  try {
    // Ensure room_type_id is properly formatted
    const formattedData = {
      ...roomData,
      room_type_id: mongoAdapter.formatId(roomData.type_id)
    };

    // Send the request
    const response = await apiClient.post('/room/add-room', formattedData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return mongoAdapter.adaptId(response.data);
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

export default {
  getAvailableRooms,
  getAllRooms,
  getRoomById,
  checkRoomAvailability,
  getFeaturedRooms,
  getRoomTypes,
  getRoomTypeServices,
  assignServiceToRoomType,
  updateRoomTypeService,
  removeServiceFromRoomType,
  getRoomTypeAmenities,
  assignAmenityToRoomType,
  removeAmenityFromRoomType,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  createRoom
}; 