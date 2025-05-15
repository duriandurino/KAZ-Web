import axios from 'axios';
import mongoAdapter from '../utils/mongoAdapter';
import apiClient from '../utils/apiClient';

// User interface
interface User {
  user_id: number;
  email: string;
  fullname: string;
  phone_number: string;
  role: string;
  special_requests?: string;
  profile_image?: string;
}

// User update interface
interface UserUpdate {
  userId: number | string;
  fullname: string;
  phone_number: string;
  special_requests?: string;
  profile_image?: string;
  password?: string;
}

/**
 * Get the current user's profile
 * @param token - Authentication token
 * @returns Promise with user data
 */
export async function getUserProfile(token: string): Promise<User> {
  try {
    console.log('getUserProfile called with token:', token ? 'Valid token exists' : 'No token');
    console.log('Making API request to /users/userinfobyid');
    
    const response = await apiClient.get('/users/userinfobyid', {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('getUserProfile response:', response);
    console.log('getUserProfile data:', response.data);

    // MongoDB response might have _id instead of user_id
    const userData = response.data;
    if (userData._id && !userData.user_id) {
      userData.user_id = userData._id;
      console.log('Mapped _id to user_id:', userData.user_id);
    }

    return userData;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // More detailed error logging
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    throw error;
  }
}

/**
 * Update user profile
 * @param userData - The user data to update
 * @param token - Authentication token
 * @returns Promise with updated user data
 */
export async function updateUserProfile(userData: UserUpdate, token: string): Promise<{message: string, user: User}> {
  try {
    console.log('Updating user profile with data:', userData);
    
    // Format for MongoDB
    const mongoData = {
      ...userData,
      userId: mongoAdapter.formatId(userData.userId)
    };
    
    // Make sure the API endpoint starts with /api to properly use the proxy
    const response = await axios.put(
      '/api/users/update-user',
      mongoData,
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Profile update response:', response);
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    throw error;
  }
}

/**
 * Change user password
 * @param oldPassword - Current password
 * @param newPassword - New password
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
  token: string
): Promise<boolean> {
  try {
    await apiClient.put(
      '/users/change-password',
      { oldPassword, newPassword },
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

/**
 * Update notification preferences
 * @param preferences - Notification preferences
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function updateNotificationPreferences(
  preferences: {
    email_notifications: boolean;
    booking_reminders: boolean;
    promotional_emails: boolean;
    sms_notifications: boolean;
  },
  token: string
): Promise<boolean> {
  try {
    await apiClient.put(
      '/users/notification-preferences',
      preferences,
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Update privacy settings
 * @param settings - Privacy settings
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function updatePrivacySettings(
  settings: {
    profile_visibility: string;
    share_booking_history: boolean;
  },
  token: string
): Promise<boolean> {
  try {
    await apiClient.put(
      '/users/privacy-settings',
      settings,
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    throw error;
  }
}

/**
 * Update user preferences
 * @param preferences - User preferences
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function updateUserPreferences(
  preferences: {
    language?: string;
    currency: string;
    time_format: string;
  },
  token: string
): Promise<boolean> {
  try {
    // If language is not provided, set a default value
    if (!preferences.language) {
      preferences.language = 'en';
    }

    await apiClient.put(
      '/users/preferences',
      preferences,
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

/**
 * Get all users (admin function)
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with user data
 */
export async function getAllUsers(
  token: string,
  options: { 
    limit?: number;
    offset?: number;
    role?: string;
    status?: string;
  } = {}
): Promise<User[]> {
  try {
    console.log('Fetching all users with options:', options);
    
    // Try the new endpoint we just added in admin.js first
    const response = await apiClient.get('/admin/users', {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(options)
    });

    console.log('Admin users response:', response.data);

    // Transform MongoDB response if needed
    const users = Array.isArray(response.data) 
      ? response.data.map((user: any) => {
          // Ensure MongoDB _id is mapped to user_id if needed
          if (user._id && !user.user_id) {
            user.user_id = user._id;
          }
          return user;
        })
      : (response.data?.users || []).map((user: any) => {
          if (user._id && !user.user_id) {
            user.user_id = user._id;
          }
          return user;
        });
    
    return users;
  } catch (error) {
    console.error('Error fetching all users from primary endpoint:', error);
    
    // Try the original endpoint as fallback
    try {
      console.log('Trying alternative endpoint /users/admin/all...');
      const alternativeResponse = await apiClient.get('/users/admin/all', {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        },
        params: mongoAdapter.formatQueryParams(options)
      });
      
      console.log('Alternative users endpoint response:', alternativeResponse.data);
      
      // Transform response
      const altUsers = Array.isArray(alternativeResponse.data) 
        ? alternativeResponse.data.map((user: any) => {
            if (user._id && !user.user_id) {
              user.user_id = user._id;
            }
            return user;
          })
        : (alternativeResponse.data?.users || []).map((user: any) => {
            if (user._id && !user.user_id) {
              user.user_id = user._id;
            }
            return user;
          });
      
      return altUsers;
    } catch (altError) {
      console.error('Alternative users endpoint also failed:', altError);
      // Return empty array as fallback to prevent dashboard from breaking
      return [];
    }
  }
}

/**
 * Save a room for a user
 * @param roomId - The ID of the room to save
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function saveRoom(
  roomId: string | number,
  token: string
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.post(
      '/users/savedrooms',
      { room_id: roomId },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error saving room:', error);
    throw error;
  }
}

/**
 * Remove a saved room for a user
 * @param roomId - The ID of the room to unsave
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function unsaveRoom(
  roomId: string | number,
  token: string
): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.delete(
      `/users/savedrooms/${roomId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error removing saved room:', error);
    throw error;
  }
}

/**
 * Get all saved rooms for a user
 * @param token - Authentication token
 * @returns Promise with saved rooms data
 */
export async function getSavedRooms(
  token: string
): Promise<{ rooms: any[] }> {
  try {
    const response = await apiClient.get(
      '/users/savedrooms',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return { 
      rooms: response.data.rooms || [] 
    };
  } catch (error) {
    console.error('Error fetching saved rooms:', error);
    throw error;
  }
}

/**
 * Check if a room is saved by the user
 * @param roomId - The ID of the room to check
 * @param token - Authentication token
 * @returns Promise with saved status
 */
export async function checkRoomSaved(
  roomId: string | number,
  token: string
): Promise<{ saved: boolean }> {
  try {
    const response = await apiClient.get(
      `/users/savedrooms/check/${roomId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return { 
      saved: response.data.saved || false
    };
  } catch (error) {
    console.error('Error checking saved room status:', error);
    return { saved: false };
  }
}

export default {
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateNotificationPreferences,
  updatePrivacySettings,
  updateUserPreferences,
  getAllUsers,
  saveRoom,
  unsaveRoom,
  getSavedRooms,
  checkRoomSaved
}; 