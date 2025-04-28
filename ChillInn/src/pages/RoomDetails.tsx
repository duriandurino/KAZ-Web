import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Card, Typography, Button, Descriptions, Tag, Carousel, Row, Col, Divider, List, message, Modal } from 'antd';
import { 
  WifiOutlined, 
  CoffeeOutlined, 
  DesktopOutlined, 
  ThunderboltOutlined,
  CarOutlined,
  SafetyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  HeartOutlined
} from '@ant-design/icons';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import BookingForm from '../components/BookingForm';
import CachedImage from '../components/CachedImage';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

interface Amenity {
  amenity_id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface RoomType {
  room_type_id: number;
  name: string;
  price: number;
  capacity: number;
  amenities: Amenity[];
}

interface Room {
  room_id: number;
  room_type_id: number;
  room_number: string;
  status: 'Available' | 'Occupied' | 'Maintenance';
  room_type: RoomType;
  images: string[];
  description: string;
}

const RoomDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Simulate API call to fetch room details
    setTimeout(() => {
      setRoom({
        room_id: parseInt(id || '1'),
        room_type_id: 1,
        room_number: "301",
        status: "Available",
        description: "Experience luxury and comfort in our Premium Suite. This spacious room offers breathtaking views of the city skyline and modern amenities for an unforgettable stay.",
        images: [
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070",
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070",
          "https://images.unsplash.com/photo-1614518921956-0d7c71b7999d?q=80&w=2070",
          "https://images.unsplash.com/photo-1615874959474-d609969a20ed?q=80&w=2070"
        ],
        room_type: {
          room_type_id: 1,
          name: "Premium Suite",
          price: 12000,
          capacity: 4,
          amenities: [
            { amenity_id: 1, name: "High-speed WiFi", description: "Complimentary high-speed internet access", icon: <WifiOutlined /> },
            { amenity_id: 2, name: "Mini Bar", description: "Fully stocked mini bar with premium selections", icon: <CoffeeOutlined /> },
            { amenity_id: 3, name: "Smart TV", description: "55-inch 4K Smart TV with Netflix access", icon: <DesktopOutlined /> },
            { amenity_id: 4, name: "Rain Shower", description: "Luxury rain shower with hot/cold water", icon: <ThunderboltOutlined /> },
            { amenity_id: 5, name: "Parking", description: "Free covered parking", icon: <CarOutlined /> },
            { amenity_id: 6, name: "In-room Safe", description: "Electronic in-room safe", icon: <SafetyOutlined /> }
          ]
        }
      });
      setLoading(false);
    }, 1000);
  }, [id]);

  const handleBookNow = () => {
    setIsBookingModalVisible(true);
  };

  const handleSaveRoom = () => {
    setSaved(!saved);
    message.success(saved ? 'Removed from saved rooms' : 'Added to saved rooms');
  };

  const handleBookingSuccess = () => {
    setIsBookingModalVisible(false);
    // Any additional actions after successful booking
  };

  if (loading || !room) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="guest" />
      <Layout className="bg-[#F5F5F5]">
        <PageTransition>
          <Content className="p-6">
            <div className="max-w-6xl mx-auto">
              <Card className="shadow-lg">
                {/* Image Carousel */}
                <Carousel autoplay className="mb-8">
                  {room.images.map((image, index) => (
                    <div key={index} className="h-[400px]">
                      <CachedImage
                        src={image}
                        alt={`Room Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                        lazy={true}
                        preload={index < 2} // Preload first two images
                      />
                    </div>
                  ))}
                </Carousel>

                <Row gutter={[32, 32]}>
                  {/* Room Details */}
                  <Col xs={24} lg={16}>
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <Title level={2}>{room.room_type.name}</Title>
                          <div className="flex items-center gap-4 mb-4">
                            <Tag color="green">{room.status}</Tag>
                            <Text type="secondary">
                              <UserOutlined /> Up to {room.room_type.capacity} guests
                            </Text>
                            <Text type="secondary">Room {room.room_number}</Text>
                          </div>
                        </div>
                        <Button 
                          icon={saved ? <HeartOutlined style={{ color: '#D4AF37' }} /> : <HeartOutlined />} 
                          size="large"
                          onClick={handleSaveRoom}
                          className={saved ? "border-[#D4AF37] text-[#D4AF37]" : ""}
                        >
                          {saved ? "Saved" : "Save"}
                        </Button>
                      </div>
                      
                      <Paragraph>{room.description}</Paragraph>

                      <Divider />

                      {/* Amenities */}
                      <div>
                        <Title level={4}>Room Amenities</Title>
                        <Row gutter={[16, 16]}>
                          {room.room_type.amenities.map(amenity => (
                            <Col xs={24} sm={12} key={amenity.amenity_id}>
                              <Card className="h-full">
                                <div className="flex items-start gap-3">
                                  <div className="text-xl text-[#D4AF37]">
                                    {amenity.icon}
                                  </div>
                                  <div>
                                    <Text strong className="block">{amenity.name}</Text>
                                    <Text type="secondary">{amenity.description}</Text>
                                  </div>
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>

                      <Divider />

                      {/* Policies */}
                      <div>
                        <Title level={4}>Room Policies</Title>
                        <List
                          size="small"
                          dataSource={[
                            'Check-in time: 2:00 PM',
                            'Check-out time: 12:00 PM',
                            'No smoking allowed',
                            'Pets not allowed',
                            'Extra bed available upon request'
                          ]}
                          renderItem={item => (
                            <List.Item>
                              <div className="flex items-center gap-2">
                                <CheckCircleOutlined className="text-[#D4AF37]" />
                                <Text>{item}</Text>
                              </div>
                            </List.Item>
                          )}
                        />
                      </div>
                    </div>
                  </Col>

                  {/* Booking Card */}
                  <Col xs={24} lg={8}>
                    <Card className="sticky top-6">
                      <div className="space-y-4">
                        <div>
                          <Title level={3} className="text-[#2C1810] mb-1">
                            ₱{room.room_type.price.toLocaleString()}
                          </Title>
                          <Text type="secondary">per night</Text>
                        </div>

                        <Divider />

                        <div className="mt-4">
                          <Text>
                            <UserOutlined className="mr-2" />
                            Up to {room.room_type.capacity} guests
                          </Text>
                        </div>

                        <Button
                          type="primary"
                          size="large"
                          className="w-full bg-[#2C1810] hover:bg-[#3D2317]"
                          onClick={handleBookNow}
                        >
                          Book Now
                        </Button>

                        <div className="text-center">
                          <Text type="secondary">
                            You won't be charged yet
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </div>
          </Content>
        </PageTransition>
      </Layout>

      {/* Booking Modal */}
      <Modal
        title={<Title level={4} className="m-0">Book Your Stay</Title>}
        open={isBookingModalVisible}
        onCancel={() => setIsBookingModalVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <BookingForm
          roomId={room.room_id}
          roomName={room.room_type.name}
          roomType={room.room_type.name}
          pricePerNight={room.room_type.price}
          maxGuests={room.room_type.capacity}
          onSuccess={handleBookingSuccess}
          onCancel={() => setIsBookingModalVisible(false)}
        />
      </Modal>
    </Layout>
  );
};

export default RoomDetails; 