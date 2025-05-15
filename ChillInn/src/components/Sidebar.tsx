import React, { useState, useEffect } from 'react';
import { Menu, Avatar, Typography, Button, theme, Modal } from 'antd';
import { 
  UserOutlined, 
  HomeOutlined, 
  LogoutOutlined, 
  SettingOutlined, 
  CalendarOutlined, 
  BarsOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  StarOutlined,
  AppstoreAddOutlined,
  CustomerServiceOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { removeToken } from '../utils/auth';
import logo from '../assets/logoDark.png';
import { motion } from 'framer-motion';
import { getUserProfile } from '../lib/userService';
import { useSidebar } from './SidebarContext';
import CachedImage from './CachedImage';

const { Text, Title } = Typography;

// CSS for custom scrollbar
const customScrollbarStyle = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1f1f1f;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #444;
    border-radius: 20px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #444 #1f1f1f;
  }
`;

interface SidebarProps {
  userRole: 'admin' | 'guest';
  userName?: string;
}

const DEFAULT_PROFILE_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC44NCAyLjE3IDQuODQgNC44NFMxNC42NyAxNC42OCAxMiAxNC42OCA3LjE2IDEyLjUxIDcuMTYgOS44NCA5LjMzIDUgMTIgNXptMCAxM2MtMi4zMyAwLTQuMzEtMS4zNi01LjI2LTMuMzEuODUtMS40MiAyLjQxLTIuMzcgNC4xNy0yLjM3IDEuNzYgMCAzLjMyLjk1IDQuMTcgMi4zNy0uOTUgMS45NS0yLjkzIDMuMzEtNS4yNiAzLjMxeiIvPjwvc3ZnPg==';

const Sidebar: React.FC<SidebarProps> = ({ userRole, userName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = React.useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  
  // Try to use the context, fall back to local state
  let sidebarState: ReturnType<typeof useSidebar> | undefined;
  try {
    sidebarState = useSidebar();
  } catch (e) {
    // Context not available, use local state
    console.warn('SidebarContext not available, using local state instead');
  }
  
  // Create local state that will be used if no context is available
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [localIsMobile, setLocalIsMobile] = useState(window.innerWidth < 768);

  // Use either context values or local state
  const collapsed = sidebarState?.collapsed ?? localCollapsed;
  const setCollapsed = sidebarState?.setCollapsed ?? setLocalCollapsed;
  const isMobile = sidebarState?.isMobile ?? localIsMobile;
  
  // Set up local resize handler if context isn't available
  useEffect(() => {
    if (!sidebarState) {
      const handleResize = () => {
        setLocalIsMobile(window.innerWidth < 768);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [sidebarState]);

  useEffect(() => {
    fetchUserProfile();
    
    // If userName is not provided but we have a token, try to fetch user details
    if (!userName) {
      fetchUserDetails();
    }
  }, [userName]);

  const fetchUserProfile = async () => {
    try {
      setLoadingImage(true);
      const authToken = localStorage.getItem('token');
      
      if (!authToken) return;

      // Fetch user profile info which includes profile image
      const userData = await getUserProfile(authToken);
      
      if (userData && userData.profile_image) {
        setProfileImage(userData.profile_image);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
      // Don't show error to user, just fail silently for profile image
    } finally {
      setLoadingImage(false);
    }
  };

  // New function to fetch user details if not passed as props
  const fetchUserDetails = async () => {
    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) return;
      
      const userData = await getUserProfile(authToken);
      if (userData) {
        // Use existing state update if name is already set
        setUserData(userData);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Add state for user data if not provided through props
  const [userData, setUserData] = useState<{fullname?: string, role?: string}>({});
  
  // Use either props or fetched data
  const displayName = userName || userData.fullname;
  const displayRole = userRole || userData.role as 'admin' | 'guest' || 'guest';

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setCollapsed(true);
    }
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

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
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
    {
      key: 'bookings',
      icon: <CalendarOutlined />,
      label: 'Bookings',
      onClick: () => handleNavigation('/admin/bookings'),
    },
    {
      key: 'payments',
      icon: <DollarOutlined />,
      label: 'Payment Management',
      onClick: () => handleNavigation('/admin/payments'),
    },
    {
      key: 'reviews',
      icon: <StarOutlined />,
      label: 'Reviews',
      onClick: () => handleNavigation('/admin/reviews'),
    },
    {
      key: 'amenities',
      icon: <AppstoreAddOutlined />,
      label: 'Amenities',
      onClick: () => handleNavigation('/admin/amenities'),
    },
    {
      key: 'services',
      icon: <CustomerServiceOutlined />,
      label: 'Services',
      onClick: () => handleNavigation('/admin/services'),
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
  
  // Determine active menu item
  const getSelectedKeys = () => {
    const path = location.pathname;
    
    // Check if we're on the admin dashboard
    if (path.startsWith('/admin/')) {
      if (path === '/admin/dashboard') return ['dashboard'];
      if (path === '/admin/user-management') return ['users'];
      if (path === '/admin/room-management') return ['rooms'];
      if (path === '/admin/bookings') return ['bookings'];
      if (path === '/admin/payments') return ['payments'];
      if (path === '/admin/reviews') return ['reviews'];
      if (path === '/admin/amenities') return ['amenities'];
      if (path === '/admin/services') return ['services'];
      return [];
    }
    
    // For regular user routes
    if (path === '/user/dashboard') return ['dashboard'];
    if (path === '/user/profile') return ['profile'];
    if (path === '/user/bookings') return ['bookings'];
    if (path === '/user/settings') return ['settings'];
    if (path.startsWith('/user/room/')) return ['dashboard']; // Highlight dashboard when viewing a room
    
    return [];
  };

  return (
    <>
      {/* Inject custom scrollbar styles */}
      <style>{customScrollbarStyle}</style>
      
      {/* Toggle button - shown when sidebar is collapsed (on any screen size) */}
      {collapsed && (
        <Button
          type="primary"
          className="fixed z-50 top-4 left-4 flex items-center justify-center"
          onClick={toggleCollapsed}
          style={{ width: 40, height: 40, borderRadius: '50%' }}
        >
          <MenuUnfoldOutlined />
        </Button>
      )}
      
      {/* Fixed sidebar */}
      <div 
        className={`fixed top-0 left-0 h-screen shadow-lg z-40 bg-[#2C1810] transition-all duration-300 ${
          collapsed ? 'w-[0px]' : 'w-[280px]'
        }`}
        style={{ overflow: 'hidden' }}
      >
        <div className="flex flex-col h-full w-[280px]">
          <motion.div 
            className="flex flex-col h-full"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Logo and User Profile Section */}
            <div className="p-6 flex flex-col relative flex-shrink-0">
              {/* Collapse button - visible in sidebar */}
              <Button
                type="text"
                icon={<MenuFoldOutlined style={{ color: 'white' }} />}
                onClick={toggleCollapsed}
                className="absolute top-4 right-4 flex items-center justify-center"
                style={{ background: 'transparent', border: 'none' }}
              />
              
              <motion.div 
                className="flex items-center justify-center mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <img src={logo} alt="ChillInn Logo" className="h-16 w-auto" />
              </motion.div>
              
              {(displayName) && (
                <motion.div 
                  className="text-center mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="relative w-16 h-16 mx-auto mb-3">
                    {loadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                      </div>
                    )}
                    {profileImage ? (
                      <CachedImage 
                        src={profileImage}
                        alt={`${displayName}'s profile`}
                        className="rounded-full"
                        style={{ 
                          border: `2px solid ${token.colorBgContainer}`,
                          width: '64px',
                          height: '64px',
                          objectFit: 'cover'
                        }}
                        preload={true}
                        fallback={DEFAULT_PROFILE_IMAGE}
                      />
                    ) : (
                      <Avatar 
                        size={64} 
                        icon={<UserOutlined />}
                        className="mb-3"
                        style={{ 
                          backgroundColor: token.colorPrimary,
                          border: `2px solid ${token.colorBgContainer}`,
                        }} 
                      />
                    )}
                  </div>
                  <Title level={5} style={{ margin: 0, color: token.colorPrimary }}>{displayName}</Title>
                  <Text style={{ color: token.colorBgContainer }} className="username-text">{displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}</Text>
                </motion.div>
              )}
            </div>
            
            {/* Menu Section with Overflow */}
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              <Menu
                mode="inline"
                items={menuItems}
                className="border-r-0"
                style={{
                  fontSize: '16px',
                }}
                theme="dark"
                selectedKeys={getSelectedKeys()}
              />
            </div>
            
            {/* Logout Section - Always Visible */}
            <motion.div 
              className="p-4 border-t border-gray-700 mt-auto flex-shrink-0"
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
        </div>
      </div>

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
    </>
  );
};

export default Sidebar; 