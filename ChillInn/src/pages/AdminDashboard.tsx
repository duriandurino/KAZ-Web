import { useState, useEffect } from "react";
import { Layout, Card, Typography, message, theme } from "antd";
import { useNavigate } from "react-router-dom";
import { UserOutlined, HomeOutlined } from "@ant-design/icons";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;

interface User {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

interface Statistics {
  userCount: number;
  roomCount: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Statistics>({ userCount: 0, roomCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { token } = theme.useToken();

  useEffect(() => {
    fetchAdminProfile();
    fetchStatistics();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await axios.get<User>("/api/users/userinfobyid", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });

      if (response.data.role.toLowerCase() !== "admin") {
        message.error("Unauthorized access");
        navigate("/");
        return;
      }

      setUser(response.data);
    } catch (error) {
      message.error("Error fetching admin profile");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const [usersResponse, roomsResponse] = await Promise.all([
        axios.get("/api/users/getallusers", {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }),
        axios.get("/api/room/getallrooms", {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }),
      ]);

      setStats({
        userCount: usersResponse.data.length,
        roomCount: roomsResponse.data.length,
      });
    } catch (error) {
      message.error("Error fetching statistics");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: token.colorBgContainer }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: token.colorPrimary }}></div>
      </div>
    );
  }

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="admin" userName={user?.fullname} />
      <Layout>
        <PageTransition>
          <Header className="px-6 flex items-center justify-between bg-white">
            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
              Admin Dashboard
            </Title>
          </Header>
          <Content className="p-6" style={{ background: token.colorBgContainer }}>
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card 
                  className="shadow-md hover:shadow-lg transition-shadow"
                  style={{ 
                    background: token.colorBgContainer,
                    borderColor: token.colorPrimary,
                  }}
                  headStyle={{ borderColor: token.colorBorderSecondary }}
                  bodyStyle={{ background: token.colorBgContainer }}
                >
                  <Title level={5} style={{ color: token.colorPrimary, marginBottom: token.marginMD }}>
                    Statistics Overview
                  </Title>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg" style={{ border: `1px solid ${token.colorBorder}` }}>
                      <UserOutlined style={{ fontSize: '24px', color: token.colorPrimary, marginBottom: '8px' }} />
                      <Paragraph style={{ color: token.colorText, margin: 0 }}>Total Users</Paragraph>
                      <Title level={3} style={{ color: token.colorPrimary, margin: '8px 0 0 0' }}>
                        {stats.userCount}
                      </Title>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ border: `1px solid ${token.colorBorder}` }}>
                      <HomeOutlined style={{ fontSize: '24px', color: token.colorPrimary, marginBottom: '8px' }} />
                      <Paragraph style={{ color: token.colorText, margin: 0 }}>Total Rooms</Paragraph>
                      <Title level={3} style={{ color: token.colorPrimary, margin: '8px 0 0 0' }}>
                        {stats.roomCount}
                      </Title>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="shadow-md hover:shadow-lg transition-shadow"
                  style={{ 
                    background: token.colorBgContainer,
                    borderColor: token.colorPrimary,
                  }}
                  headStyle={{ borderColor: token.colorBorderSecondary }}
                  bodyStyle={{ background: token.colorBgContainer }}
                >
                  <Title level={5} style={{ color: token.colorPrimary, marginBottom: token.marginMD }}>
                    System Overview
                  </Title>
                  <div className="space-y-2">
                    <div>
                      <Text style={{ color: token.colorTextSecondary }}>User Role:</Text>
                      <Text style={{ marginLeft: 8, color: token.colorText, textTransform: 'capitalize' }}>
                        {user?.role}
                      </Text>
                    </div>
                    <div>
                      <Text style={{ color: token.colorTextSecondary }}>Access Level:</Text>
                      <Text style={{ marginLeft: 8, color: token.colorText }}>
                        Administrator
                      </Text>
                    </div>
                    <div>
                      <Text style={{ color: token.colorTextSecondary }}>Last Login:</Text>
                      <Text style={{ marginLeft: 8, color: token.colorText }}>
                        {new Date().toLocaleString()}
                      </Text>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Content>
        </PageTransition>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;
