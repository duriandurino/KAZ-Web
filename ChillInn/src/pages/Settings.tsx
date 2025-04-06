import { useState } from 'react';
import { Layout, Card, Typography, Switch, Select, Divider, Button, Form, Radio, message, Collapse, Modal } from 'antd';
import { 
  BellOutlined, 
  LockOutlined, 
  GlobalOutlined, 
  DeleteOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { confirm } = Modal;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(true);

  // Privacy settings
  const [showProfile, setShowProfile] = useState('public');
  const [shareBookingHistory, setShareBookingHistory] = useState(false);

  // Preferences
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('PHP');
  const [timeFormat, setTimeFormat] = useState('12h');

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const settings = {
        notifications: {
          email: emailNotifications,
          bookingReminders,
          promotional: promotionalEmails,
          sms: smsNotifications
        },
        privacy: {
          profileVisibility: showProfile,
          shareBookingHistory
        },
        preferences: {
          language,
          currency,
          timeFormat
        }
      };

      console.log('Saving settings:', settings);
      message.success('Settings saved successfully');
    } catch (error) {
      message.error('Failed to save settings');
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
        message.success('Account deletion request submitted');
      },
    });
  };

  const handlePasswordReset = () => {
    // Implement password reset logic
    message.info('Password reset email sent');
  };

  const handleTwoFactorAuth = () => {
    // Implement 2FA setup logic
    message.info('Two-factor authentication setup will be available soon');
  };

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="guest" />
      <Layout className="bg-[#F5F5F5]">
        <PageTransition>
          <Content className="p-6">
            <div className="max-w-4xl mx-auto">
              <Title level={2} className="mb-6">Settings</Title>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSaveSettings}
                className="space-y-6"
              >
                <Collapse defaultActiveKey={['1', '2', '3', '4']} className="bg-white">
                  {/* Notification Settings */}
                  <Panel 
                    header={
                      <div className="flex items-center gap-2">
                        <BellOutlined />
                        <span>Notification Settings</span>
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
                        <Switch checked={emailNotifications} onChange={setEmailNotifications} />
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <Text strong>Booking Reminders</Text>
                          <Text type="secondary" className="block">Get reminded about upcoming stays</Text>
                        </div>
                        <Switch checked={bookingReminders} onChange={setBookingReminders} />
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <Text strong>Promotional Emails</Text>
                          <Text type="secondary" className="block">Receive special offers and discounts</Text>
                        </div>
                        <Switch checked={promotionalEmails} onChange={setPromotionalEmails} />
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <Text strong>SMS Notifications</Text>
                          <Text type="secondary" className="block">Get important updates via SMS</Text>
                        </div>
                        <Switch checked={smsNotifications} onChange={setSmsNotifications} />
                      </div>
                    </div>
                  </Panel>

                  {/* Privacy Settings */}
                  <Panel 
                    header={
                      <div className="flex items-center gap-2">
                        <LockOutlined />
                        <span>Privacy Settings</span>
                      </div>
                    } 
                    key="2"
                  >
                    <div className="space-y-4">
                      <div>
                        <Text strong className="block mb-2">Profile Visibility</Text>
                        <Radio.Group value={showProfile} onChange={e => setShowProfile(e.target.value)}>
                          <Radio value="public">Public</Radio>
                          <Radio value="private">Private</Radio>
                          <Radio value="friends">Friends Only</Radio>
                        </Radio.Group>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <Text strong>Share Booking History</Text>
                          <Text type="secondary" className="block">Allow hotels to view your past stays</Text>
                        </div>
                        <Switch checked={shareBookingHistory} onChange={setShareBookingHistory} />
                      </div>
                    </div>
                  </Panel>

                  {/* Preferences */}
                  <Panel 
                    header={
                      <div className="flex items-center gap-2">
                        <GlobalOutlined />
                        <span>Preferences</span>
                      </div>
                    } 
                    key="3"
                  >
                    <div className="space-y-4">
                      <div>
                        <Text strong className="block mb-2">Language</Text>
                        <Select
                          value={language}
                          onChange={setLanguage}
                          style={{ width: 200 }}
                          options={[
                            { value: 'en', label: 'English' },
                            { value: 'fil', label: 'Filipino' },
                            { value: 'es', label: 'Spanish' },
                            { value: 'zh', label: 'Chinese' }
                          ]}
                        />
                      </div>
                      <div>
                        <Text strong className="block mb-2">Currency</Text>
                        <Select
                          value={currency}
                          onChange={setCurrency}
                          style={{ width: 200 }}
                          options={[
                            { value: 'PHP', label: 'Philippine Peso (₱)' },
                            { value: 'USD', label: 'US Dollar ($)' },
                            { value: 'EUR', label: 'Euro (€)' },
                            { value: 'GBP', label: 'British Pound (£)' }
                          ]}
                        />
                      </div>
                      <div>
                        <Text strong className="block mb-2">Time Format</Text>
                        <Radio.Group value={timeFormat} onChange={e => setTimeFormat(e.target.value)}>
                          <Radio value="12h">12-hour</Radio>
                          <Radio value="24h">24-hour</Radio>
                        </Radio.Group>
                      </div>
                    </div>
                  </Panel>

                  {/* Security Settings */}
                  <Panel 
                    header={
                      <div className="flex items-center gap-2">
                        <SafetyCertificateOutlined />
                        <span>Security Settings</span>
                      </div>
                    } 
                    key="4"
                  >
                    <div className="space-y-4">
                      <Button 
                        icon={<LockOutlined />}
                        onClick={handlePasswordReset}
                        className="w-full md:w-auto"
                      >
                        Change Password
                      </Button>
                      <Button 
                        icon={<SafetyCertificateOutlined />}
                        onClick={handleTwoFactorAuth}
                        className="w-full md:w-auto"
                      >
                        Setup Two-Factor Authentication
                      </Button>
                      <Divider />
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
                    onClick={handleSaveSettings}
                    loading={loading}
                    className="bg-[#2C1810] hover:bg-[#3D2317]"
                  >
                    Save Settings
                  </Button>
                </div>
              </Form>
            </div>
          </Content>
        </PageTransition>
      </Layout>
    </Layout>
  );
};

export default Settings; 