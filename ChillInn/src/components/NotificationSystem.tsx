import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Popover, List, Typography, Button, Empty, Spin, Tag, message } from 'antd';
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined, 
  ExclamationCircleOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useNavigate } from 'react-router-dom';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../lib/notificationService';
import webSocketService from '../utils/webSocketService';

// Add relative time plugin
dayjs.extend(relativeTime);

const { Text, Title } = Typography;

export interface Notification {
  id: string;
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancelled' | 'payment_confirmation' | 'system_message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: {
    booking_id?: string | number;
    payment_id?: string | number;
    room_name?: string;
    check_in?: string;
    check_out?: string;
    [key: string]: any;
  };
}

interface NotificationSystemProps {
  userRole: 'admin' | 'guest';
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ userRole }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const navigate = useNavigate();

  // Function to fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const data = await getUserNotifications(token);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If API fails, we can fall back to empty notifications
      // We don't show an error message to avoid disrupting UX
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Set up WebSocket connection with handlers
    webSocketService.connect(token, {
      onNotification: (notification) => {
        setNotifications(prev => {
          // Check if notification already exists
          const exists = prev.some(n => n.id === notification.id);
          if (exists) return prev;
          
          // Add new notification at the beginning of the array
          return [notification, ...prev];
        });
        
        // Show notification toast for important messages if not viewing notifications
        if (!open && (notification.type === 'booking_confirmation' || notification.type === 'booking_cancelled')) {
          message.info({
            content: notification.title,
            icon: getNotificationIcon(notification.type),
            onClick: () => setOpen(true)
          });
        }
      },
      onConnectionChange: (connected) => {
        setWsConnected(connected);
      }
    });

    // Cleanup WebSocket connection on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  // Fetch notifications on mount and when popover opens
  useEffect(() => {
    fetchNotifications();
    
    // Set up periodic refresh (every 60 seconds when WebSocket is disconnected)
    const intervalId = setInterval(() => {
      if (!wsConnected && !open) {  // Only refresh in background when WebSocket is down and popover is closed
        fetchNotifications();
      }
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchNotifications, wsConnected]);
  
  // Refresh when popover opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking_confirmation':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'booking_reminder':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'booking_cancelled':
        return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
      case 'payment_confirmation':
        return <CheckCircleOutlined style={{ color: '#722ed1' }} />;
      case 'system_message':
      default:
        return <BellOutlined style={{ color: '#faad14' }} />;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const success = await markNotificationAsRead(id, token);
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id ? { ...notification, read: true } : notification
          )
        );
      }
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      setLoading(true);
      const success = await markAllNotificationsAsRead(token);
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        message.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const success = await deleteNotification(id, token);
      
      if (success) {
        setNotifications(prev => 
          prev.filter(notification => notification.id !== id)
        );
      }
    } catch (error) {
      console.error(`Error deleting notification ${id}:`, error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'booking_confirmation' || notification.type === 'booking_reminder') {
      if (notification.data?.booking_id) {
        if (userRole === 'admin') {
          navigate(`/admin/bookings`);
        } else {
          navigate(`/user/bookings`);
        }
      }
    } else if (notification.type === 'payment_confirmation' && notification.data?.payment_id) {
      // Navigate to payment details if available
      if (notification.data?.booking_id) {
        navigate(`/user/bookings`);
      }
    }
    
    // Close popover after clicking
    setOpen(false);
  };

  const reconnectWebSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Reconnect WebSocket
    webSocketService.disconnect();
    webSocketService.connect(token, {
      onNotification: (notification) => {
        setNotifications(prev => {
          const exists = prev.some(n => n.id === notification.id);
          if (exists) return prev;
          return [notification, ...prev];
        });
      },
      onConnectionChange: setWsConnected
    });
    
    message.info('Attempting to reconnect...');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const notificationContent = (
    <div className="w-96 max-h-[600px] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center">
          <Title level={5} className="m-0">Notifications</Title>
          {!wsConnected && (
            <Tag 
              color="error" 
              className="ml-2 flex items-center cursor-pointer" 
              onClick={reconnectWebSocket}
            >
              <DisconnectOutlined className="mr-1" /> Offline
            </Tag>
          )}
        </div>
        <div className="flex items-center">
          {unreadCount > 0 && (
            <Button type="link" size="small" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
          <Button 
            type="text" 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={fetchNotifications}
            className="ml-1"
          />
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Spin />
        </div>
      ) : notifications.length > 0 ? (
        <div className="overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={notification => (
              <List.Item 
                key={notification.id}
                className={`rounded-md transition-colors mb-2 cursor-pointer ${notification.read ? 'bg-gray-50' : 'bg-blue-50'}`}
                onClick={() => handleNotificationClick(notification)}
                actions={[
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                  />
                ]}
              >
                <List.Item.Meta
                  avatar={getNotificationIcon(notification.type)}
                  title={
                    <div className="flex justify-between">
                      <Text strong>{notification.title}</Text>
                      {!notification.read && (
                        <Tag color="blue" className="ml-2">New</Tag>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <Text>{notification.message}</Text>
                      <div className="mt-1">
                        <Text type="secondary" className="text-xs">
                          {dayjs(notification.timestamp).fromNow()}
                        </Text>
                        
                        {notification.data?.check_in && (
                          <div className="mt-1 flex items-center">
                            <CalendarOutlined className="mr-1 text-xs" />
                            <Text type="secondary" className="text-xs">
                              {dayjs(notification.data.check_in).format('MMM D')} - {dayjs(notification.data.check_out).format('MMM D, YYYY')}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      ) : (
        <Empty description="No notifications" />
      )}
      
      {notifications.length > 0 && (
        <div className="mt-auto pt-2 border-t border-gray-200">
          <Button type="link" block onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={notificationContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      overlayClassName="notification-popover"
    >
      <Badge count={unreadCount} offset={[-2, 2]}>
        <Button 
          type="link" 
          icon={<BellOutlined />} 
          size="large"
          className={`notification-button flex items-center justify-center ${!wsConnected && 'pulse-animation'}`}
          style={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            background: '#fff',
            color: '#333',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        />
      </Badge>
    </Popover>
  );
};

export default NotificationSystem; 