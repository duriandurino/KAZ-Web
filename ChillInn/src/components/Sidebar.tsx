import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Typography, Button, theme, Modal } from 'antd';
import { UserOutlined, HomeOutlined, LogoutOutlined, SettingOutlined, CalendarOutlined, BarsOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { removeToken } from '../utils/auth';
import logo from '../assets/logoDark.png';
import { motion } from 'framer-motion';
import axios from 'axios';

const { Sider } = Layout;
const { Text, Title } = Typography;

interface SidebarProps {
  userRole: 'admin' | 'guest';
  userName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, userName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = React.useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const authToken = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        if (!authToken || !userId) return;

        const response = await axios.get('/api/images', {
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY,
            'Authorization': `Bearer ${authToken}`
          },
          params: {
            guest_id: userId,
            purpose: 'profile'
          }
        });

        if (response.data && response.data.length > 0 && response.data[0].image_url) {
          setProfileImage(response.data[0].image_url);
        }
      } catch (error) {
        console.error('Error fetching profile image:', error);
      }
    };

    fetchProfileImage();
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const showLogoutConfirmation = () => {
    setIsLogoutModalVisible(true);
  };

  const handleLogout = () => {
    removeToken();
    navigate('/');
  };

  const handleCancelLogout = () => {
    setIsLogoutModalVisible(false);
  };

  const adminMenuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
      onClick: () => handleNavigation('/admin/dashboard'),
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'User Management',
      onClick: () => handleNavigation('/admin/user-management'),
    },
    {
      key: 'rooms',
      icon: <BarsOutlined />,
      label: 'Room Management',
      onClick: () => handleNavigation('/admin/room-management'),
    },
  ];

  const guestMenuItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
      onClick: () => handleNavigation('/user/dashboard'),
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => handleNavigation('/user/profile'),
    },
    {
      key: 'bookings',
      icon: <CalendarOutlined />,
      label: 'My Bookings',
      onClick: () => handleNavigation('/user/bookings'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => handleNavigation('/user/settings'),
    },
  ];

  const menuItems = userRole === 'admin' ? adminMenuItems : guestMenuItems;

  return (
    <Sider
      width={280}
      className="min-h-screen shadow-lg"
      breakpoint="lg"
      collapsedWidth="0"
      theme="dark"
    >
      <motion.div 
        className="flex flex-col h-full"
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="p-6">
          <motion.div 
            className="flex items-center justify-center mb-6"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <img src={logo} alt="ChillInn Logo" className="h-16 w-auto" />
          </motion.div>
          {userName && (
            <motion.div 
              className="text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Avatar 
                size={64} 
                icon={<UserOutlined />}
                src={profileImage}
                className="mb-3"
                style={{ 
                  backgroundColor: token.colorPrimary,
                  border: `2px solid ${token.colorBgContainer}`,
                }} 
              />
              <Title level={5} style={{ margin: 0, color: token.colorPrimary }}>{userName}</Title>
              <Text style={{ color: token.colorBgContainer }}>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</Text>
            </motion.div>
          )}
        </div>
        
        <Menu
          mode="inline"
          items={menuItems}
          className="flex-1 border-r-0"
          style={{
            fontSize: '16px',
          }}
          theme="dark"
          selectedKeys={[location.pathname.split('/')[2]]}
        />
        
        <motion.div 
          style={{ padding: 16, borderTop: `1px solid ${token.colorBgContainer}` }}
          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <Button 
            danger
            type="primary"
            icon={<LogoutOutlined />} 
            onClick={showLogoutConfirmation}
            className="w-full h-10 flex items-center justify-start"
          >
            Logout
          </Button>
        </motion.div>
      </motion.div>

      <Modal
        title="Confirm Logout"
        open={isLogoutModalVisible}
        onOk={handleLogout}
        onCancel={handleCancelLogout}
        okText="Logout"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        centered
        width={400}
      >
        <p>Are you sure you want to logout?</p>
      </Modal>
    </Sider>
  );
};

export default Sidebar; 