import { useState, useEffect } from "react";
import { Layout, Card, Typography, Button, message, Input, DatePicker, Select, Row, Col, Divider, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { SearchOutlined, CalendarOutlined, UserOutlined, HomeOutlined, HeartOutlined, EnvironmentOutlined } from "@ant-design/icons";
import type { Dayjs } from 'dayjs';
import axios from "axios";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface User {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

interface Room {
  id: number;
  room_type_id: number;
  room_number: string;
  name: string;
  type: string;
  price: number;
  capacity: number;
  description: string;
  status: string;
  image_url: string;
  amenities: string[];
}

interface SearchParams {
  location: string;
  dates: [Dayjs | null, Dayjs | null] | null;
  guests: number;
  roomType: string;
}

// Add dummy room data
const dummyRooms: Room[] = [
  {
    id: 1,
    room_type_id: 1,
    room_number: "301",
    name: "Premium Ocean Suite",
    type: "Premium Suite",
    price: 12000,
    capacity: 4,
    description: "Luxurious suite with breathtaking ocean views",
    status: "Available",
    image_url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070",
    amenities: ["WiFi", "Mini Bar", "Ocean View", "King Bed"]
  },
  {
    id: 2,
    room_type_id: 2,
    room_number: "201",
    name: "Deluxe City View",
    type: "Deluxe Room",
    price: 8000,
    capacity: 2,
    description: "Comfortable room with modern amenities",
    status: "Available",
    image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070",
    amenities: ["WiFi", "City View", "Queen Bed"]
  },
  {
    id: 3,
    room_type_id: 3,
    room_number: "101",
    name: "Family Suite",
    type: "Family Suite",
    price: 15000,
    capacity: 6,
    description: "Spacious suite perfect for families",
    status: "Available",
    image_url: "https://images.unsplash.com/photo-1614518921956-0d7c71b7999d?q=80&w=2070",
    amenities: ["WiFi", "Kitchen", "2 Bathrooms", "Living Room"]
  },
  {
    id: 4,
    room_type_id: 4,
    room_number: "401",
    name: "Executive Suite",
    type: "Executive Suite",
    price: 18000,
    capacity: 2,
    description: "Luxury suite with premium amenities",
    status: "Available",
    image_url: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?q=80&w=2070",
    amenities: ["WiFi", "Mini Bar", "Jacuzzi", "King Bed", "City View"]
  },
  {
    id: 5,
    room_type_id: 5,
    room_number: "501",
    name: "Standard Twin",
    type: "Standard Room",
    price: 6000,
    capacity: 2,
    description: "Cozy room with twin beds",
    status: "Available",
    image_url: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=2074",
    amenities: ["WiFi", "Twin Beds", "Work Desk"]
  },
  {
    id: 6,
    room_type_id: 6,
    room_number: "601",
    name: "Honeymoon Suite",
    type: "Specialty Suite",
    price: 20000,
    capacity: 2,
    description: "Romantic suite with special amenities",
    status: "Available",
    image_url: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?q=80&w=2074",
    amenities: ["WiFi", "King Bed", "Jacuzzi", "Ocean View", "Mini Bar"]
  }
];

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    location: "",
    dates: null,
    guests: 2,
    roomType: "all"
  });

  useEffect(() => {
    fetchUserProfile();
    // Replace fetchRooms with dummy data
    setRooms(dummyRooms);
  }, []);

  const fetchUserProfile = async () => {
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

      setUser(response.data);
    } catch (error) {
      message.error("Error fetching user profile");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    // Implement search functionality
    message.info("Searching for available rooms...");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="guest" userName={user?.fullname} />
      <Layout>
        <PageTransition>
          {/* Hero Section with Search */}
          <div className="relative h-[400px] bg-[#2C1810] w-full overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-50"></div>
            <div className="relative z-10 px-6 py-12 max-w-6xl mx-auto text-center">
              <Title className="text-white mb-6">Find your perfect stay</Title>
              <Card className="p-6 shadow-lg max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <Input
                      prefix={<EnvironmentOutlined className="text-[#D4AF37]" />}
                      placeholder="Where are you going?"
                      className="h-12"
                      value={searchParams.location}
                      onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
                    <RangePicker
                      className="w-full h-12"
                      placeholder={["Check-in", "Check-out"]}
                      onChange={(dates) => setSearchParams({ ...searchParams, dates })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Select
                      className="w-full h-12"
                      placeholder="Guests"
                      value={searchParams.guests}
                      onChange={(value) => setSearchParams({ ...searchParams, guests: value })}
                    >
                      {[1, 2, 3, 4, 5].map(num => (
                        <Option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</Option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      className="w-full h-12 bg-[#D4AF37] hover:bg-[#B08F2D]"
                      onClick={handleSearch}
                    >
                      Search
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Content className="p-6 bg-[#F5F5F5]">
            {/* Filters */}
            <div className="mb-6 max-w-6xl mx-auto">
              <Card className="shadow-sm">
                <div className="flex flex-wrap gap-4">
                  <Select
                    className="w-48"
                    placeholder="Room Type"
                    value={searchParams.roomType}
                    onChange={(value) => setSearchParams({ ...searchParams, roomType: value })}
                  >
                    <Option value="all">All Types</Option>
                    <Option value="standard">Standard</Option>
                    <Option value="deluxe">Deluxe</Option>
                    <Option value="suite">Suite</Option>
                  </Select>
                  <Select className="w-48" placeholder="Price Range">
                    <Option value="all">All Prices</Option>
                    <Option value="budget">Budget</Option>
                    <Option value="mid">Mid-range</Option>
                    <Option value="luxury">Luxury</Option>
                  </Select>
                  <Select className="w-48" placeholder="Amenities">
                    <Option value="all">All Amenities</Option>
                    <Option value="wifi">WiFi</Option>
                    <Option value="pool">Pool</Option>
                    <Option value="spa">Spa</Option>
                  </Select>
                </div>
              </Card>
            </div>

            {/* Room Listings */}
            <div className="max-w-6xl mx-auto">
              <Row gutter={[16, 16]}>
                {rooms.map((room) => (
                  <Col xs={24} sm={12} lg={8} key={room.id}>
                    <Card
                      hoverable
                      className="h-full"
                      cover={
                        <div className="relative h-48 overflow-hidden group">
                          <img
                            alt={room.name}
                            src={room.image_url}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute top-2 right-2">
                            <Tag color="green">{room.status}</Tag>
                          </div>
                        </div>
                      }
                      actions={[
                        <Button type="link" icon={<HeartOutlined />}>Save</Button>,
                        <Button
                          type="primary"
                          className="bg-[#D4AF37] hover:bg-[#B08F2D]"
                          onClick={() => navigate(`/room/${room.id}`)}
                        >
                          View Details
                        </Button>
                      ]}
                    >
                      <div className="space-y-2">
                        <Title level={5} className="text-[#2C1810] mb-1">{room.name}</Title>
                        <Text type="secondary" className="block">{room.type}</Text>
                        <div className="flex items-center gap-2">
                          <UserOutlined />
                          <Text type="secondary">Up to {room.capacity} guests</Text>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.slice(0, 3).map((amenity, index) => (
                            <Tag key={index} className="m-0">{amenity}</Tag>
                          ))}
                          {room.amenities.length > 3 && (
                            <Tag className="m-0">+{room.amenities.length - 3} more</Tag>
                          )}
                        </div>
                        <Paragraph className="text-[#2C1810] font-semibold mt-2">
                          ₱{room.price.toLocaleString()} / night
                        </Paragraph>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </Content>
        </PageTransition>
      </Layout>
    </Layout>
  );
};

export default UserDashboard; 