import apiClient from '../utils/apiClient';
import { Service, ServiceSubmission, ServiceResponse } from '../utils/types';
import mongoAdapter from '../utils/mongoAdapter';

// Extended options interface to include MongoDB-specific fields
interface MongoServiceOptions {
  limit?: number;
  offset?: number;
  category?: string;
  is_active?: boolean;
  search?: string;
  min_price?: number;
  max_price?: number;
  min_duration?: number;
  max_duration?: number;
  status?: string; // MongoDB-specific field
}

/**
 * Get all services with filtering options
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with service data and total count
 */
export async function getServices(
  token: string,
  options: {
    limit?: number;
    offset?: number;
    category?: string;
    is_active?: boolean;
    search?: string;
    min_price?: number;
    max_price?: number;
    min_duration?: number;
    max_duration?: number;
  } = {}
): Promise<ServiceResponse> {
  try {
    // Convert is_active to status for MongoDB
    const mongoOptions: MongoServiceOptions = { ...options };
    if (options.is_active !== undefined) {
      mongoOptions.status = options.is_active ? 'Active' : 'Inactive';
      delete mongoOptions.is_active;
    }
    
    const response = await apiClient.get('/services', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(mongoOptions)
    });

    // Transform MongoDB response to match frontend expected format
    const services = Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptService)
      : (response.data.services || []).map(mongoAdapter.adaptService);
    
    const totalCount = response.data.totalCount || services.length;

    return {
      services,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}

/**
 * Get a specific service by ID
 * @param serviceId - The ID of the service to get
 * @param token - Authentication token
 * @returns Promise with service data
 */
export async function getServiceById(
  serviceId: string | number,
  token: string
): Promise<Service> {
  try {
    const formattedId = mongoAdapter.formatId(serviceId);
    const response = await apiClient.get(`/services/${formattedId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return mongoAdapter.adaptService(response.data);
  } catch (error) {
    console.error(`Error fetching service ${serviceId}:`, error);
    throw error;
  }
}

/**
 * Create a new service
 * @param serviceData - The service data to submit
 * @param token - Authentication token
 * @returns Promise with the created service
 */
export async function createService(
  serviceData: ServiceSubmission,
  token: string
): Promise<Service> {
  try {
    // Convert frontend data format to MongoDB format
    const mongoData = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      icon_name: serviceData.icon_name,
      category: serviceData.category,
      status: serviceData.is_active === false ? 'Inactive' : 'Active'
    };

    const response = await apiClient.post(
      '/services',
      mongoData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptService(response.data);
  } catch (error) {
    console.error('Error creating service:', error);
    throw error;
  }
}

/**
 * Update an existing service
 * @param serviceId - The ID of the service to update
 * @param serviceData - The updated service data
 * @param token - Authentication token
 * @returns Promise with the updated service
 */
export async function updateService(
  serviceId: string | number,
  serviceData: Partial<ServiceSubmission>,
  token: string
): Promise<Service> {
  try {
    // Convert frontend data format to MongoDB format
    const mongoData: Record<string, any> = {};
    
    if (serviceData.name !== undefined) mongoData.name = serviceData.name;
    if (serviceData.price !== undefined) mongoData.price = serviceData.price;
    if (serviceData.description !== undefined) mongoData.description = serviceData.description;
    if (serviceData.duration !== undefined) mongoData.duration = serviceData.duration;
    if (serviceData.icon_name !== undefined) mongoData.icon_name = serviceData.icon_name;
    if (serviceData.category !== undefined) mongoData.category = serviceData.category;
    if (serviceData.is_active !== undefined) mongoData.status = serviceData.is_active ? 'Active' : 'Inactive';

    const formattedId = mongoAdapter.formatId(serviceId);
    const response = await apiClient.put(
      `/services/${formattedId}`,
      mongoData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptService(response.data.service || response.data);
  } catch (error) {
    console.error(`Error updating service ${serviceId}:`, error);
    throw error;
  }
}

/**
 * Delete a service
 * @param serviceId - The ID of the service to delete
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function deleteService(
  serviceId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedId = mongoAdapter.formatId(serviceId);
    await apiClient.delete(`/services/${formattedId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return true;
  } catch (error) {
    console.error(`Error deleting service ${serviceId}:`, error);
    throw error;
  }
}

/**
 * Toggle service active status
 * @param serviceId - The ID of the service to toggle
 * @param isActive - Whether the service should be active
 * @param token - Authentication token
 * @returns Promise with the updated service
 */
export async function toggleServiceStatus(
  serviceId: string | number,
  isActive: boolean,
  token: string
): Promise<Service> {
  try {
    const formattedId = mongoAdapter.formatId(serviceId);
    const response = await apiClient.put(
      `/services/${formattedId}`,
      { status: isActive ? 'Active' : 'Inactive' },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptService(response.data.service || response.data);
  } catch (error) {
    console.error(`Error toggling service ${serviceId} status:`, error);
    throw error;
  }
}

// Extended service interface for MongoDB responses which might have id field
interface MongoService extends Service {
  id?: string;
  _id?: string;
}

/**
 * Get services for a specific booking
 * @param bookingId - The ID of the booking
 * @param token - Authentication token
 * @returns Promise with array of services for the booking
 */
export async function getBookingServices(
  bookingId: string | number,
  token: string
): Promise<MongoService[]> {
  try {
    const formattedId = mongoAdapter.formatId(bookingId);
    const response = await apiClient.get(`/bookings/${formattedId}/services`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptService)
      : (response.data.services || []).map(mongoAdapter.adaptService);
  } catch (error) {
    console.error(`Error fetching services for booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Add services to a booking
 * @param bookingId - The ID of the booking
 * @param serviceIds - Array of service IDs to add
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function addServicesToBooking(
  bookingId: string | number,
  serviceIds: (string | number)[],
  token: string
): Promise<boolean> {
  try {
    const formattedBookingId = mongoAdapter.formatId(bookingId);
    
    // Convert service IDs to MongoDB format
    const formattedServiceIds = serviceIds.map(id => mongoAdapter.formatId(id));
    
    await apiClient.post(
      `/services/booking`,
      {
        booking_id: formattedBookingId,
        service_ids: formattedServiceIds
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`Error adding services to booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Remove a service from a booking
 * @param bookingId - The ID of the booking
 * @param serviceId - The ID of the service to remove
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function removeServiceFromBooking(
  bookingId: string | number,
  serviceId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedBookingId = mongoAdapter.formatId(bookingId);
    const formattedServiceId = mongoAdapter.formatId(serviceId);
    
    await apiClient.delete(`/bookings/${formattedBookingId}/services/${formattedServiceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return true;
  } catch (error) {
    console.error(`Error removing service ${serviceId} from booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Get a list of available service icons
 * @returns Promise with array of icon names
 */
export async function getServiceIcons(): Promise<string[]> {
  try {
    return [
      'RoomServiceIcon',
      'LocalLaundryServiceIcon',
      'RestaurantIcon',
      'SpaIcon',
      'FitnessCenterIcon',
      'PoolIcon',
      'DirectionsCarIcon',
      'AirportShuttleIcon',
      'LocalBarIcon',
      'ChildCareIcon',
      'MeetingRoomIcon',
      'WifiIcon',
      'RoomIcon',
      'CleaningServicesIcon',
      'PetsIcon',
      'LocalFloristIcon',
      'MedicalServicesIcon',
      'EventAvailableIcon',
      'NightlifeIcon',
      'TourIcon'
    ];
  } catch (error) {
    console.error('Error fetching service icons:', error);
    return [];
  }
} 