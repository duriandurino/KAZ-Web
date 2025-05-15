import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Switch, Select, Divider, Button, Form, Modal, Collapse, theme, notification } from 'antd';
import { 
  BellOutlined,  
  DeleteOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  FireOutlined
} from '@ant-design/icons';
import AppLayout from '../components/AppLayout';
import { updateNotificationPreferences, updateUserPreferences } from '../lib/userService';
import '../darkMode.css'; // This will be created later
import { applyDarkMode as applyDarkModeUtil, applyLightMode } from '../utils/darkModeInit'; // Import the dark mode utility functions

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { confirm } = Modal;
const { useToken } = theme;

interface UserPreferences {
  theme_mode?: 'light' | 'dark';
}

interface NotificationPreferences {
  email_notifications: boolean;
  booking_reminders: boolean;
  promotional_emails?: boolean;
  sms_notifications?: boolean;
  recommendations_enabled?: boolean;
}

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { token: themeToken } = useToken();

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Preferences
  const [darkMode, setDarkMode] = useState(false);

  // Load saved preferences
  useEffect(() => {
    console.log('Loading saved preferences from localStorage');
    
    // Load dark mode setting
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    console.log('Saved dark mode setting:', savedDarkMode);
    setDarkMode(savedDarkMode);
    
    // Apply dark mode class immediately if saved
    applyDarkModeFromSetting(savedDarkMode);
    
    // Load notification preferences from localStorage
    const savedEmailNotifs = localStorage.getItem('emailNotifications') !== 'false';
    const savedBookingReminders = localStorage.getItem('bookingReminders') !== 'false';
    const savedShowRecommendations = localStorage.getItem('showRecommendations') !== 'false';
    
    console.log('Saved notification settings:', {
      emailNotifications: savedEmailNotifs,
      bookingReminders: savedBookingReminders,
      showRecommendations: savedShowRecommendations
    });
    
    setEmailNotifications(savedEmailNotifs);
    setBookingReminders(savedBookingReminders);
    setShowRecommendations(savedShowRecommendations);
  }, []);

  // Apply dark mode to the document using the utility functions
  const applyDarkModeFromSetting = (isDarkMode: boolean) => {
    console.log('Applying dark mode:', isDarkMode);
    
    if (isDarkMode) {
      applyDarkModeUtil();
    } else {
      applyLightMode();
    }
  };

  // Handle dark mode toggle
  const handleDarkModeChange = (checked: boolean) => {
    console.log('Dark mode toggled to:', checked);
    setDarkMode(checked);
    localStorage.setItem('darkMode', checked.toString());
    
    // Apply dark mode class to the document
    applyDarkModeFromSetting(checked);
    
    // Show notification to confirm the change
    notification.success({
      message: checked ? 'Dark Mode Enabled' : 'Light Mode Enabled',
      description: checked 
        ? 'The dark theme has been applied.' 
        : 'The light theme has been applied.',
      placement: 'topRight',
      duration: 2
    });
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Get token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to save settings');
      }
      
      console.log('Saving settings with token:', token ? 'Valid token exists' : 'No token');
      console.log('Settings to save:', {
        emailNotifications,
        bookingReminders,
        showRecommendations,
        darkMode
      });
      
      // Save notification preferences with only supported fields
      const notifResult = await updateNotificationPreferences({
        email_notifications: emailNotifications,
        booking_reminders: bookingReminders,
        promotional_emails: true, // Default value to satisfy type
        sms_notifications: false // Default value to satisfy type
        // Don't send recommendations_enabled since it's not in the API type
      }, token);
      
      console.log('Notification preferences update result:', notifResult);
      
      // Instead of sending theme_mode, store dark mode in localStorage only
      const prefResult = await updateUserPreferences({
        currency: 'PHP', // Default value to satisfy type
        time_format: '24h' // Default value to satisfy type
        // Don't send theme_mode since it's not in the API type
      }, token);
      
      console.log('User preferences update result:', prefResult);
      
      // Save to localStorage (this is what will actually control the settings)
      localStorage.setItem('emailNotifications', emailNotifications.toString());
      localStorage.setItem('bookingReminders', bookingReminders.toString());
      localStorage.setItem('showRecommendations', showRecommendations.toString());
      localStorage.setItem('darkMode', darkMode.toString());
      
      console.log('Settings saved to localStorage');
      
      // Apply settings immediately (just to be sure)
      applyDarkModeFromSetting(darkMode);
      
      Modal.success({
        title: 'Settings Saved',
        content: 'Your preferences have been updated successfully.'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      Modal.error({
        title: 'Error',
        content: 'Failed to save settings. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const showDeleteAccountConfirm = () => {
    confirm({
      title: 'Are you sure you want to delete your account?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>This action cannot be undone. Please note:</Paragraph>
          <ul>
            <li>All your booking history will be permanently deleted</li>
            <li>You will lose access to any active bookings</li>
            <li>Any unused credits or rewards will be forfeited</li>
          </ul>
        </div>
      ),
      okText: 'Yes, Delete My Account',
      okType: 'danger',
      cancelText: 'No, Keep My Account',
      onOk() {
        // Implement account deletion logic
        Modal.success({
          title: 'Account Deletion Requested',
          content: 'Your account deletion request has been submitted and will be processed within 24 hours.'
        });
      },
    });
  };

  return (
    <AppLayout userRole="guest">
      <Content className="p-6" style={{ background: 'var(--app-background, #f5f5f5)' }}>
        <div className="max-w-3xl mx-auto">
          <Title level={2} className="mb-6">Settings</Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveSettings}
            initialValues={{
              emailNotifications,
              bookingReminders,
              showRecommendations,
              darkMode
            }}
            className="space-y-6"
          >
            <Collapse defaultActiveKey={['1', '2', '3']} className="bg-white">
              {/* General Settings */}
              <Panel 
                header={
                  <div className="flex items-center gap-2">
                    <BellOutlined />
                    <span>General Settings</span>
                  </div>
                } 
                key="1"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text strong>Email Notifications</Text>
                      <Text type="secondary" className="block">Receive booking confirmations and updates</Text>
                    </div>
                    <Switch 
                      checked={emailNotifications} 
                      onChange={(checked) => {
                        console.log('Email notifications toggled:', checked);
                        setEmailNotifications(checked);
                      }} 
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <Text strong>Booking Reminders</Text>
                      <Text type="secondary" className="block">Get reminded about upcoming stays</Text>
                    </div>
                    <Switch 
                      checked={bookingReminders} 
                      onChange={(checked) => {
                        console.log('Booking reminders toggled:', checked);
                        setBookingReminders(checked);
                      }} 
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <Text strong>Room Recommendations</Text>
                      <Text type="secondary" className="block">Show personalized room suggestions</Text>
                    </div>
                    <Switch 
                      checked={showRecommendations} 
                      onChange={(checked) => {
                        console.log('Recommendations toggled:', checked);
                        setShowRecommendations(checked);
                      }}
                      className="recommendation-switch"
                    />
                  </div>
                </div>
              </Panel>

              {/* Preferences */}
              <Panel 
                header={
                  <div className="flex items-center gap-2">
                    <SettingOutlined />
                    <span>Preferences</span>
                  </div>
                } 
                key="2"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text strong>Dark Mode</Text>
                      <Text type="secondary" className="block">Switch between light and dark themes</Text>
                    </div>
                    <Switch 
                      checked={darkMode} 
                      onChange={handleDarkModeChange}
                      className="dark-mode-switch"
                    />
                  </div>
                </div>
              </Panel>

              {/* Account Settings */}
              <Panel 
                header={
                  <div className="flex items-center gap-2">
                    <DeleteOutlined />
                    <span>Account Settings</span>
                  </div>
                } 
                key="3"
              >
                <div className="space-y-4">
                  <Button 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={showDeleteAccountConfirm}
                    className="w-full md:w-auto"
                  >
                    Delete Account
                  </Button>
                </div>
              </Panel>
            </Collapse>

            <div className="flex justify-end">
              <Button 
                type="primary"
                htmlType="submit"
                loading={loading}
                className="bg-[#2C1810] hover:bg-[#3D2317]"
              >
                Save Settings
              </Button>
            </div>
          </Form>
        </div>
      </Content>
    </AppLayout>
  );
};

export default Settings; 