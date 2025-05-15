import React, { useEffect } from 'react';
import { Layout, Menu, Dropdown } from 'antd';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import { useSidebar } from './SidebarContext';
import NotificationSystem from './NotificationSystem';
import webSocketService from '../utils/webSocketService';
import { 
  UserOutlined, 
  LogoutOutlined, 
  SettingOutlined, 
  BellOutlined, 
  MenuOutlined,
  HeartOutlined 
} from '@ant-design/icons';

interface AppLayoutProps {
  children: React.ReactNode;
  userRole: 'admin' | 'guest';
  userName?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, userRole, userName }) => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  
  // Initialize WebSocket connection when app loads
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Connect to WebSocket for real-time notifications
    webSocketService.connect(token, {
      onNotification: (notification) => {
        // When a notification is received and it's important, show a toast
        const { message } = require('antd');
        
        if (notification.type === 'booking_confirmation' || 
            notification.type === 'booking_cancelled' || 
            notification.type === 'payment_confirmation') {
          message.info({
            content: notification.title,
            duration: 5
          });
        }
      }
    });
    
    // Cleanup on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);
  
  const handleLogout = () => {
    // Disconnect WebSocket before logout
    webSocketService.disconnect();
    localStorage.removeItem('token');
    navigate('/');
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />} onClick={() => navigate('/user/profile')}>
        Profile
      </Menu.Item>
      <Menu.Item key="saved" icon={<HeartOutlined />} onClick={() => navigate('/user/saved-rooms')}>
        Saved Rooms
      </Menu.Item>
      <Menu.Item key="bookings" icon={<SettingOutlined />} onClick={() => navigate('/user/bookings')}>
        My Bookings
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={userRole} userName={userName} />
      
      <div 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: collapsed ? 0 : 280 }}
      >
        {/* Notification System - Fixed position */}
        <div className="fixed bottom-6 right-6 z-50">
          <NotificationSystem userRole={userRole} />
        </div>
        
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </div>
  );
};

export default AppLayout; 