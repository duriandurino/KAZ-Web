import { useState, useEffect } from "react";
import { Layout, Card, Typography, message, theme, Spin, Row, Col, Statistic, Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import { UserOutlined, HomeOutlined, CalendarOutlined, AreaChartOutlined, LineChartOutlined } from "@ant-design/icons";
import { Line, Bar } from '@ant-design/plots';
import AppLayout from "../components/AppLayout";
import { getUserProfile, getAllUsers } from "../lib/userService";
import { getAllRooms } from "../lib/roomService";
import { getAllBookings } from "../lib/bookingService";

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface User {
  user_id: number;
  email: string;
  fullname: string;
  role: string;
  status?: string;
  special_requests?: string;
  profile_image?: string;
}

interface Statistics {
  userCount: number;
  roomCount: number;
  bookingCount: number;
  activeBookingCount: number;
}

interface BookingsByDay {
  date: string;
  count: number;
  week: string;
}

interface UsersByDay {
  date: string;
  count: number;
  week: string;
}

interface ChartData {
  week: string;
  count: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Statistics>({ 
    userCount: 0, 
    roomCount: 0,
    bookingCount: 0,
    activeBookingCount: 0
  });
  const [bookingsByDay, setBookingsByDay] = useState<BookingsByDay[]>([]);
  const [usersByDay, setUsersByDay] = useState<UsersByDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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

      const userData = await getUserProfile(token);

      if (userData.role.toLowerCase() !== "admin") {
        message.error("Unauthorized access");
        navigate("/");
        return;
      }

      setUser(userData);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      message.error("Error fetching admin profile");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      // Fetch users, rooms, and bookings in parallel
      const [usersResponse, roomsResponse, bookingsResponse] = await Promise.all([
        getAllUsers(token),
        getAllRooms(token),
        getAllBookings(token, { limit: 1000 }) // Get more data for charts
      ]);

      console.log('Fetched data:', { 
        users: usersResponse, 
        rooms: roomsResponse, 
        bookings: bookingsResponse 
      });

      // Process raw data into statistics - Handle both array and object responses
      const userCount = Array.isArray(usersResponse) ? usersResponse.length : 0;
      
      // Handle both formats of room response
      const roomCount = roomsResponse?.rooms?.length || 
                        (Array.isArray(roomsResponse) ? roomsResponse.length : 0);
      
      // Handle both formats of booking response
      const bookings = bookingsResponse?.bookings || 
                      (Array.isArray(bookingsResponse) ? bookingsResponse : []);
      
      const bookingCount = bookings.length;
      
      // Filter active bookings
      const activeBookingCount = bookings.filter(
        booking => ['Pending', 'Confirmed', 'Checked-in'].includes(booking.status)
      ).length;

      setStats({
        userCount,
        roomCount,
        bookingCount,
        activeBookingCount
      });

      console.log('Statistics:', { userCount, roomCount, bookingCount, activeBookingCount });

      // Process booking data for charts - Only if we have bookings
      if (bookings.length > 0) {
        processBookingsForCharts(bookings);
      } else {
        setIsChartLoading(false);
      }
      
      // Process user data for charts - Only if we have users
      if (Array.isArray(usersResponse) && usersResponse.length > 0) {
        processUsersForCharts(usersResponse);
      }

    } catch (error) {
      console.error("Error fetching statistics:", error);
      message.error("Error fetching statistics. Please check the console for details.");
      setIsChartLoading(false);
    }
  };
  
  // Process booking data into weekly aggregated format for charts
  const processBookingsForCharts = (bookings: any[]) => {
    setIsChartLoading(true);
    try {
      // Group bookings by date (creation date)
      const bookingsByDate: { [key: string]: number } = {};
      
      // Add past 90 days for complete data visualization
      for (let i = 90; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        bookingsByDate[dateString] = 0;
      }
      
      // Count bookings per day
      bookings.forEach((booking: any) => {
        const date = new Date(booking.created_at).toISOString().split('T')[0];
        if (date in bookingsByDate) {
          bookingsByDate[date]++;
        } else {
          bookingsByDate[date] = 1;
        }
      });
      
      // Convert to array and add week information
      const chartData = Object.entries(bookingsByDate).map(([date, count]) => {
        const dateObj = new Date(date);
        const weekStart = new Date(dateObj);
        weekStart.setDate(dateObj.getDate() - dateObj.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        return {
          date,
          count,
          week: weekLabel
        };
      });
      
      // Sort by date
      chartData.sort((a, b) => a.date.localeCompare(b.date));
      
      setBookingsByDay(chartData);
    } catch (error) {
      console.error('Error processing booking data for charts:', error);
    } finally {
      setIsChartLoading(false);
    }
  };
  
  // Process user data into weekly aggregated format for charts
  const processUsersForCharts = (users: any[]) => {
    try {
      // Group users by registration date
      const usersByDate: { [key: string]: number } = {};
      
      // Add past 90 days for complete data visualization
      for (let i = 90; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        usersByDate[dateString] = 0;
      }
      
      // Count users per registration day
      users.forEach((user: any) => {
        if (!user.created_at) return;
        
        const date = new Date(user.created_at).toISOString().split('T')[0];
        if (date in usersByDate) {
          usersByDate[date]++;
        } else {
          usersByDate[date] = 1;
        }
      });
      
      // Convert to array and add week information
      const chartData = Object.entries(usersByDate).map(([date, count]) => {
        const dateObj = new Date(date);
        const weekStart = new Date(dateObj);
        weekStart.setDate(dateObj.getDate() - dateObj.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        return {
          date,
          count,
          week: weekLabel
        };
      });
      
      // Sort by date
      chartData.sort((a, b) => a.date.localeCompare(b.date));
      
      setUsersByDay(chartData);
    } catch (error) {
      console.error('Error processing user data for charts:', error);
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
    <AppLayout userRole="admin" userName={user?.fullname}>
      <Header className="px-6 flex items-center justify-between bg-white">
        <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
          Admin Dashboard
        </Title>
      </Header>
      
      <Content className="p-6" style={{ background: token.colorBgContainer }}>
        <div className="max-w-6xl mx-auto">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            tabBarStyle={{ marginBottom: 24 }}
          >
            <TabPane 
              tab={<span><AreaChartOutlined /> Overview</span>}
              key="overview"
            >
              {/* Statistics Cards */}
              <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={12} md={6}>
                  <Card 
                    className="shadow-md hover:shadow-lg transition-shadow"
                    style={{ borderColor: token.colorPrimaryBorder }}
                  >
                    <Statistic
                      title="Total Users"
                      value={stats.userCount}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: token.colorPrimary }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card 
                    className="shadow-md hover:shadow-lg transition-shadow"
                    style={{ borderColor: token.colorPrimaryBorder }}
                  >
                    <Statistic
                      title="Total Rooms"
                      value={stats.roomCount}
                      prefix={<HomeOutlined />}
                      valueStyle={{ color: token.colorPrimary }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card 
                    className="shadow-md hover:shadow-lg transition-shadow"
                    style={{ borderColor: token.colorPrimaryBorder }}
                  >
                    <Statistic
                      title="Total Bookings"
                      value={stats.bookingCount}
                      prefix={<CalendarOutlined />}
                      valueStyle={{ color: token.colorPrimary }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card 
                    className="shadow-md hover:shadow-lg transition-shadow"
                    style={{ borderColor: token.colorPrimaryBorder }}
                  >
                    <Statistic
                      title="Active Bookings"
                      value={stats.activeBookingCount}
                      prefix={<CalendarOutlined />}
                      valueStyle={{ color: token.colorSuccess }}
                    />
                  </Card>
                </Col>
              </Row>
              
              {/* Chart Cards */}
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card 
                    title="Bookings by Week"
                    className="shadow-md transition-shadow"
                    style={{ borderColor: token.colorBorderSecondary }}
                  >
                    {isChartLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Spin />
                      </div>
                    ) : (
                      <Line
                        data={bookingsByDay}
                        xField="date"
                        yField="count"
                        seriesField="week"
                        xAxis={{
                          type: 'time',
                          tickCount: 5,
                          label: {
                            formatter: (v: string) => {
                              const date = new Date(v);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }
                          }
                        }}
                        tooltip={{
                          formatter: (data: BookingsByDay) => {
                            return {
                              name: 'Bookings',
                              value: data.count,
                              title: new Date(data.date).toLocaleDateString()
                            };
                          }
                        }}
                        smooth={true}
                        height={300}
                        animation={{
                          appear: {
                            animation: 'path-in',
                            duration: 1000,
                          },
                        }}
                      />
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card 
                    title="User Registrations by Week"
                    className="shadow-md transition-shadow"
                    style={{ borderColor: token.colorBorderSecondary }}
                  >
                    {isChartLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Spin />
                      </div>
                    ) : (
                      <Line
                        data={usersByDay}
                        xField="date"
                        yField="count"
                        seriesField="week"
                        xAxis={{
                          type: 'time',
                          tickCount: 5,
                          label: {
                            formatter: (v: string) => {
                              const date = new Date(v);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }
                          }
                        }}
                        tooltip={{
                          formatter: (data: UsersByDay) => {
                            return {
                              name: 'New Users',
                              value: data.count,
                              title: new Date(data.date).toLocaleDateString()
                            };
                          }
                        }}
                        smooth={true}
                        height={300}
                        animation={{
                          appear: {
                            animation: 'path-in',
                            duration: 1000,
                          },
                        }}
                      />
                    )}
                  </Card>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane 
              tab={<span><LineChartOutlined /> Booking Analytics</span>}
              key="booking-analytics"
            >
              <Card>
                <Title level={5}>Weekly Booking Trends</Title>
                <Paragraph type="secondary">
                  Aggregate view of bookings grouped by week (UTC+8 timezone)
                </Paragraph>
                
                {isChartLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <Spin size="large" />
                  </div>
                ) : (
                  <Bar
                    data={
                      // Aggregate by week
                      bookingsByDay.reduce<ChartData[]>((acc, item) => {
                        const weekEntry = acc.find(w => w.week === item.week);
                        if (weekEntry) {
                          weekEntry.count += item.count;
                        } else {
                          acc.push({ week: item.week, count: item.count });
                        }
                        return acc;
                      }, [])
                    }
                    xField="week"
                    yField="count"
                    label={{
                      position: 'middle',
                      style: {
                        fill: '#FFFFFF',
                        opacity: 0.6,
                      },
                    }}
                    xAxis={{
                      label: {
                        autoHide: true,
                        autoRotate: true,
                        style: {
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }
                      },
                      tickCount: 6
                    }}
                    meta={{
                      count: {
                        alias: 'Number of Bookings',
                      },
                    }}
                    height={400}
                    color={token.colorPrimary}
                    autoFit={true}
                    scrollbar={{
                      type: 'horizontal'
                    }}
                  />
                )}
              </Card>
            </TabPane>
            
            <TabPane 
              tab={<span><UserOutlined /> User Analytics</span>}
              key="user-analytics"
            >
              <Card>
                <Title level={5}>Weekly User Registration Trends</Title>
                <Paragraph type="secondary">
                  Aggregate view of user registrations grouped by week (UTC+8 timezone)
                </Paragraph>
                
                {isChartLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <Spin size="large" />
                  </div>
                ) : (
                  <Bar
                    data={
                      // Aggregate by week
                      usersByDay.reduce<ChartData[]>((acc, item) => {
                        const weekEntry = acc.find(w => w.week === item.week);
                        if (weekEntry) {
                          weekEntry.count += item.count;
                        } else {
                          acc.push({ week: item.week, count: item.count });
                        }
                        return acc;
                      }, [])
                    }
                    xField="week"
                    yField="count"
                    label={{
                      position: 'middle',
                      style: {
                        fill: '#FFFFFF',
                        opacity: 0.6,
                      },
                    }}
                    xAxis={{
                      label: {
                        autoHide: true,
                        autoRotate: true,
                        style: {
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }
                      },
                      tickCount: 6
                    }}
                    meta={{
                      count: {
                        alias: 'Number of Registrations',
                      },
                    }}
                    height={400}
                    color={token.colorSuccess}
                    autoFit={true}
                    scrollbar={{
                      type: 'horizontal'
                    }}
                  />
                )}
              </Card>
            </TabPane>
          </Tabs>
        </div>
      </Content>
    </AppLayout>
  );
};

export default AdminDashboard;
