import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Table, Typography, message, Space, Layout } from "antd";
import { UserOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import { removeToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";

const { Title, Text, Paragraph } = Typography;
const { Header, Content } = Layout;

interface User {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
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
      render: (text: string) => (
        <Text style={{ color: '#2C1810', textTransform: 'capitalize' }}>{text}</Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => (
        <Text style={{ color: '#2C1810', textTransform: 'capitalize' }}>{text}</Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#D4AF37' }} />}
            onClick={() => {
              // TODO: Implement edit user functionality
            }}
          />
          <Button
            type="text"
            icon={<DeleteOutlined style={{ color: '#B22222' }} />}
            onClick={() => handleDeactivateUser(record.id)}
          />
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
      <Sidebar userRole="admin" userName={user?.fullname} />
      <Layout>
        <PageTransition>
          <Header className="bg-white px-6 flex items-center justify-between">
            <Title level={4} style={{ margin: 0, color: "#2C1810" }}>
              User Management
            </Title>
          </Header>
          <Content className="p-6 bg-[#F5F5F5]">
            <div className="max-w-6xl mx-auto">
              <Card className="shadow-md border-[#D4AF37] hover:shadow-lg transition-shadow">
                <Table 
                  dataSource={users} 
                  columns={columns} 
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  className="custom-table"
                />
              </Card>
            </div>
          </Content>
        </PageTransition>
      </Layout>
    </Layout>
  );
};

export default UserManagement;