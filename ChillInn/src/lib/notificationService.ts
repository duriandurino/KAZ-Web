import apiClient from '../utils/apiClient';
import { Notification } from '../components/NotificationSystem';

/**
 * Fetch user notifications from the backend
 * @param token Authentication token
 * @returns Promise with notification data
 */
export const getUserNotifications = async (token: string): Promise<Notification[]> => {
  try {
    const response = await apiClient.get('/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.notifications || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Fall back to empty array on error
    return [];
  }
};

/**
 * Mark a notification as read
 * @param notificationId The ID of the notification to mark
 * @param token Authentication token
 * @returns Promise with success indicator
 */
export const markNotificationAsRead = async (notificationId: string, token: string): Promise<boolean> => {
  try {
    await apiClient.put(`/notifications/${notificationId}/read`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return true;
  } catch (error) {
    console.error(`Error marking notification ${notificationId} as read:`, error);
    return false;
  }
};

/**
 * Mark all notifications as read
 * @param token Authentication token
 * @returns Promise with success indicator
 */
export const markAllNotificationsAsRead = async (token: string): Promise<boolean> => {
  try {
    await apiClient.put('/notifications/read-all', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Delete a notification
 * @param notificationId The ID of the notification to delete
 * @param token Authentication token
 * @returns Promise with success indicator
 */
export const deleteNotification = async (notificationId: string, token: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/notifications/${notificationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return true;
  } catch (error) {
    console.error(`Error deleting notification ${notificationId}:`, error);
    return false;
  }
};

export default {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
}; 