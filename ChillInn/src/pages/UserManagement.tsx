import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Table, Typography, message, Space, Layout, Tabs, Modal, Form, Input, Select } from "antd";
import { UserOutlined, EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import { removeToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";

const { Title, Text, Paragraph } = Typography;
const { Header, Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;
const { Password } = Input;

interface User {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
  phone_number?: string;
}

interface AdminRegistrationData {
  email: string;
  password: string;
  fullname: string;
  phone_number: string;
  role: string;
  access_level: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [guestUsers, setGuestUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminForm] = Form.useForm();
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get<User[]>("/api/users/getallusers", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      setUsers(response.data);
      
      // Separate users by role
      const admins = response.data.filter(user => user.role.toLowerCase() === 'admin');
      const guests = response.data.filter(user => user.role.toLowerCase() === 'guest');
      
      setAdminUsers(admins);
      setGuestUsers(guests);
    } catch (error) {
      message.error("Error fetching users!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (userId: number, updates: Partial<User>) => {
    try {
      await axios.put(
        `/api/users/update-user`,
        { userId, ...updates },
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );
      message.success("User updated successfully!");
      fetchUsers();
    } catch (error) {
      message.error("Error updating user!");
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    try {
      await axios.put(
        `/api/users/deactivateuserbyid`,
        { user_id: userId },
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );
      message.success("User deactivated successfully!");
      fetchUsers();
    } catch (error) {
      message.error("Error deactivating user!");
    }
  };

  const handleActivateUser = async (userId: number) => {
    try {
      await axios.put(
        `/api/users/activateuserbyid`,
        { user_id: userId },
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );
      message.success("User activated successfully!");
      fetchUsers();
    } catch (error) {
      message.error("Error activating user!");
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const response = await axios.get("/api/users/getallusers", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      return response.data.some((user: any) => user.email === email);
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    return { isValid: minLength && hasNumber && hasUpperCase, minLength, hasNumber, hasUpperCase };
  };

  const handleAddAdmin = async (values: AdminRegistrationData) => {
    try {
      setAddAdminLoading(true);
      setRegisterError(null);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        setRegisterError("Please enter a valid email address");
        return;
      }

      // Validate password
      const { isValid, minLength, hasNumber, hasUpperCase } = validatePassword(values.password);
      if (!isValid) {
        const errors = [];
        if (!minLength) errors.push("at least 8 characters");
        if (!hasNumber) errors.push("one number");
        if (!hasUpperCase) errors.push("one uppercase letter");
        setRegisterError(`Password must contain ${errors.join(", ")}`);
        return;
      }

      // Validate phone number
      const phoneNumber = values.phone_number.replace(/\D/g, '');
      if (phoneNumber.length !== 10) {
        setRegisterError("Please enter a valid 10-digit phone number");
        return;
      }

      // Check if email already exists
      const emailExists = await checkEmailExists(values.email);
      if (emailExists) {
        setRegisterError(`Email ${values.email} is already registered`);
        return;
      }

      // Format phone number
      const formattedValues = {
        ...values,
        phone_number: `+63${phoneNumber}`,
        role: 'admin'
      };

      const response = await axios.post(
        '/api/users/add-user',
        formattedValues,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );

      if (response.data) {
        message.success("Admin account created successfully!");
        setShowAddAdmin(false);
        adminForm.resetFields();
        setRegisterError(null);
        fetchUsers();
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setRegisterError(error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        setRegisterError("Unable to connect to server. Please check your internet connection.");
      } else {
        setRegisterError("Registration failed. Please try again later.");
      }
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 10) {
      adminForm.setFieldValue('phone_number', numericValue);
    }
  };

  const userColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text: number) => <Text style={{ color: '#2C1810' }}>{text}</Text>
    },
    {
      title: 'Name',
      dataIndex: 'fullname',
      key: 'fullname',
      render: (text: string) => <Text style={{ color: '#2C1810' }}>{text}</Text>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <Text style={{ color: '#2C1810' }}>{text}</Text>
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (text: string) => (
        <Text style={{ color: '#2C1810', textTransform: 'capitalize' }}>{text}</Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (text: string) => (
        <Text 
          style={{ 
            color: text.toLowerCase() === 'active' ? '#52c41a' : '#ff4d4f', 
            textTransform: 'capitalize' 
          }}
        >
          {text}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#D4AF37' }} />}
            onClick={() => {
              // TODO: Implement edit user functionality
              message.info(`Edit user functionality coming soon for ${record.fullname}`);
            }}
          />
          {record.status.toLowerCase() === 'active' ? (
            <Button
              type="text"
              icon={<LockOutlined style={{ color: '#B22222' }} />}
              onClick={() => handleDeactivateUser(record.id)}
              title="Deactivate User"
            />
          ) : (
            <Button
              type="text"
              icon={<UnlockOutlined style={{ color: '#52c41a' }} />}
              onClick={() => handleActivateUser(record.id)}
              title="Activate User"
            />
          )}
        </Space>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="admin" userName={currentUser?.fullname} />
      <Layout>
        <PageTransition>
          <Header className="bg-white px-6 flex items-center justify-between">
            <Title level={4} style={{ margin: 0, color: "#2C1810" }}>
              User Management
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddAdmin(true)}
              className="bg-[#2C1810] hover:bg-[#3D2317]"
            >
              Add Admin
            </Button>
          </Header>
          <Content className="p-6 bg-[#F5F5F5]">
            <div className="max-w-6xl mx-auto">
              <Card className="shadow-md border-[#D4AF37] hover:shadow-lg transition-shadow">
                <Tabs defaultActiveKey="1" type="card">
                  <TabPane tab="All Users" key="1">
                    <Table 
                      dataSource={users} 
                      columns={userColumns} 
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      className="custom-table"
                    />
                  </TabPane>
                  <TabPane tab="Admin Users" key="2">
                    <Table 
                      dataSource={adminUsers} 
                      columns={userColumns} 
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      className="custom-table"
                    />
                  </TabPane>
                  <TabPane tab="Guest Users" key="3">
                    <Table 
                      dataSource={guestUsers} 
                      columns={userColumns} 
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      className="custom-table"
                    />
                  </TabPane>
                </Tabs>
              </Card>
            </div>
          </Content>
        </PageTransition>
      </Layout>

      {/* Add Admin Modal */}
      <Modal
        title={<Title level={4} style={{ color: '#2C1810', marginBottom: '24px' }}>Create Admin Account</Title>}
        open={showAddAdmin}
        onCancel={() => {
          setShowAddAdmin(false);
          setRegisterError(null);
          adminForm.resetFields();
        }}
        footer={null}
        width={400}
        centered
      >
        <Form
          form={adminForm}
          layout="vertical"
          onFinish={handleAddAdmin}
          initialValues={{
            role: "admin",
            access_level: "2"
          }}
        >
          {registerError && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 border border-red-200 rounded">
              {registerError}
            </div>
          )}

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Please input email!' }]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>
          
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input password!' }]}
          >
            <Password placeholder="Enter password" />
          </Form.Item>
          
          <div className="text-xs text-gray-500 space-y-1 mb-4 bg-gray-50 p-3 rounded">
            <p className="font-medium">Password requirements:</p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>Minimum 8 characters</li>
              <li>At least one number</li>
              <li>At least one uppercase letter</li>
            </ul>
          </div>
          
          <Form.Item
            label="Full Name"
            name="fullname"
            rules={[{ required: true, message: 'Please input full name!' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>
          
          <Form.Item
            label="Phone Number"
            name="phone_number"
            rules={[
              { required: true, message: 'Please input phone number!' },
              { min: 10, message: 'Phone number must be 10 digits!' }
            ]}
          >
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-gray-100 text-gray-600 w-12 border-r rounded-l">
                +63
              </div>
              <Input
                placeholder="9123456789"
                onChange={handlePhoneNumberChange}
                className="pl-12"
                maxLength={10}
                onKeyPress={(e) => {
                  // Allow only number inputs
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </Form.Item>
          
          <Form.Item
            label="Access Level"
            name="access_level"
            rules={[{ required: true, message: 'Please select access level!' }]}
          >
            <Select>
              <Option value="1">Regular Admin</Option>
              <Option value="2">Super Admin</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="role" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-[#2C1810] hover:bg-[#3D2317]"
              loading={addAdminLoading}
            >
              {addAdminLoading ? "Creating Admin..." : "Create Admin Account"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default UserManagement;