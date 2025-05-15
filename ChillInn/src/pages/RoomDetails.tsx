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
  HeartOutlined,
  GiftOutlined,
  DollarOutlined
} from '@ant-design/icons';
import AppLayout from '../components/AppLayout';
import PageTransition from '../components/PageTransition';
import BookingForm from '../components/BookingForm';
import CachedImage from '../components/CachedImage';
import ReviewList from '../components/ReviewList';
import { getRoomById, checkRoomAvailability } from '../lib/roomService';
import { saveRoom, unsaveRoom, checkRoomSaved } from '../lib/userService';
import { Room } from '../utils/types';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// Map of amenity names to icons
const amenityIcons: Record<string, React.ReactNode> = {
  'WiFi': <WifiOutlined />,
  'Mini Bar': <CoffeeOutlined />,
  'TV': <DesktopOutlined />,
  'Smart TV': <DesktopOutlined />,
  'Rain Shower': <ThunderboltOutlined />,
  'Shower': <ThunderboltOutlined />,
  'Parking': <CarOutlined />,
  'Safe': <SafetyOutlined />,
  'In-room Safe': <SafetyOutlined />
};

const RoomDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    conflicting_bookings?: any[];
  } | null>(null);

  useEffect(() => {
    fetchRoomDetails();
    // Log for debugging route issues
    console.log('RoomDetails component mounted with ID:', id);
  }, [id]);

  useEffect(() => {
    // Check if room is saved when room data is loaded
    if (room && room.room_id) {
      checkIfRoomIsSaved();
    }
  }, [room]);

  const fetchRoomDetails = async () => {
    setLoading(true);
    try {
      if (!id) {
        console.error('No room ID provided in URL');
        message.error('No room ID provided');
        return;
      }
      
      console.log('Fetching room details for ID:', id);
      const roomData = await getRoomById(id);
      console.log('Received room data:', roomData);
      
      if (!roomData) {
        console.error('Room not found with ID:', id);
        message.error('Room not found');
        return;
      }
      
      setRoom(roomData);
      
      // Also check current availability
      checkAvailability();
    } catch (error) {
      console.error('Error fetching room details:', error);
      message.error('Failed to load room details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkIfRoomIsSaved = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !room) return;
      
      const result = await checkRoomSaved(room.room_id, token);
      setSaved(result.saved);
    } catch (error) {
      console.error('Error checking if room is saved:', error);
    }
  };

  const checkAvailability = async (checkIn?: string, checkOut?: string) => {
    try {
      if (!id) return;
      
      // Default to checking availability for next 5 days if dates not provided
      const today = new Date();
      const inFiveDays = new Date();
      inFiveDays.setDate(today.getDate() + 5);
      
      const startDate = checkIn || today.toISOString().split('T')[0];
      const endDate = checkOut || inFiveDays.toISOString().split('T')[0];
      
      console.log('Checking availability from', startDate, 'to', endDate);
      const availabilityData = await checkRoomAvailability(id, startDate, endDate);
      console.log('Availability response:', availabilityData);
      setAvailability(availabilityData);
      
      // Update room status accordingly
      if (room) {
        setRoom({
          ...room,
          status: availabilityData.available ? 'Available' : 'Occupied'
        });
      }
    } catch (error) {
      console.error('Error checking room availability:', error);
    }
  };

  const handleBookNow = () => {
    setIsBookingModalVisible(true);
  };

  const handleSaveRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !room) {
        message.error('Please login to save rooms');
        return;
      }
      
      setIsSavingRoom(true);
      
      if (saved) {
        // Remove from saved rooms
        await unsaveRoom(room.room_id, token);
        message.success('Removed from saved rooms');
      } else {
        // Add to saved rooms
        await saveRoom(room.room_id, token);
        message.success('Added to saved rooms');
      }
      
      setSaved(!saved);
    } catch (error) {
      console.error('Error saving/unsaving room:', error);
      message.error('Failed to update saved rooms');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleBookingSuccess = () => {
    setIsBookingModalVisible(false);
    message.success('Room booked successfully!');
    // Refresh availability after booking
    checkAvailability();
  };

  if (loading || !room) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  // Get icon for amenity or default to CheckCircleOutlined
  const getAmenityIcon = (amenityName: string) => {
    const normalizedName = Object.keys(amenityIcons).find(key => 
      amenityName.toLowerCase().includes(key.toLowerCase())
    );
    
    return normalizedName ? amenityIcons[normalizedName] : <CheckCircleOutlined />;
  };

  return (
    <AppLayout userRole="guest">
      <PageTransition>
        <Content className="p-6">
          <div className="max-w-6xl mx-auto">
            <Card className="shadow-lg">
              {/* Image Carousel */}
              <Carousel autoplay className="mb-8">
                {room.images && room.images.length > 0 ? room.images.map((image, index) => (
                  <div key={index} className="h-[400px]">
                    <CachedImage
                      src={image}
                      alt={`Room Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                      lazy={true}
                      preload={index < 2} // Preload first two images
                    />
                  </div>
                )) : (
                  <div className="h-[400px] bg-gray-200 flex items-center justify-center">
                    <Text type="secondary">No images available</Text>
                  </div>
                )}
              </Carousel>

              <Row gutter={[32, 32]}>
                {/* Room Details */}
                <Col xs={24} lg={16}>
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <Title level={2}>{room.room_type.name}</Title>
                        <div className="flex items-center gap-4 mb-4">
                          <Tag color={room.status === 'Available' ? 'green' : 'red'}>{room.status}</Tag>
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
                        {room.room_type.amenities && room.room_type.amenities.map(amenity => (
                          <Col xs={24} sm={12} key={amenity.amenity_id}>
                            <Card className="h-full">
                              <div className="flex items-start gap-3">
                                <div className="text-xl text-[#D4AF37]">
                                  {getAmenityIcon(amenity.name)}
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

                    {/* Services */}
                    <div>
                      <Title level={4}>Available Services</Title>
                      {room.services && room.services.length > 0 ? (
                        <Row gutter={[16, 16]}>
                          {room.services.map((serviceInfo, index) => (
                            <Col xs={24} sm={12} key={index}>
                              <Card className="h-full">
                                <div className="flex items-start gap-3">
                                  <div className="text-xl text-[#D4AF37]">
                                    {serviceInfo.included ? <GiftOutlined /> : <DollarOutlined />}
                                  </div>
                                  <div>
                                    <Text strong className="block">{serviceInfo.service.name}</Text>
                                    <Text type="secondary">{serviceInfo.service.description}</Text>
                                    {serviceInfo.included ? (
                                      <Tag color="green" className="mt-2">Included</Tag>
                                    ) : serviceInfo.discount_percentage > 0 ? (
                                      <div className="mt-2">
                                        <Tag color="orange">{serviceInfo.discount_percentage}% Discount</Tag>
                                        <Text type="secondary" className="ml-2 line-through">
                                          ₱{serviceInfo.service.price.toFixed(2)}
                                        </Text>
                                        <Text strong className="ml-2 text-[#D4AF37]">
                                          ₱{(serviceInfo.service.price * (1 - serviceInfo.discount_percentage / 100)).toFixed(2)}
                                        </Text>
                                      </div>
                                    ) : (
                                      <Text className="mt-2">₱{serviceInfo.service.price.toFixed(2)}</Text>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      ) : (
                        <Card className="text-center py-4">
                          <Text type="secondary">No special services available for this room type</Text>
                        </Card>
                      )}
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
                            <CheckCircleOutlined className="mr-2 text-[#D4AF37]" /> {item}
                          </List.Item>
                        )}
                      />
                    </div>
                    
                    <Divider />
                    
                    {/* Guest Reviews Section */}
                    <div className="guest-reviews">
                      <ReviewList roomId={room.room_id} limit={5} />
                    </div>
                  </div>
                </Col>

                {/* Booking Card */}
                <Col xs={24} lg={8}>
                  <Card className="shadow booking-card sticky top-6">
                    <div className="text-center mb-4">
                      <Title level={3} className="text-[#2C1810] mb-0">
                        ₱{room.room_type.price.toLocaleString()}
                      </Title>
                      <Text type="secondary">per night</Text>
                    </div>

                    <Descriptions column={1} className="mb-6">
                      <Descriptions.Item label="Room Type">{room.room_type.name}</Descriptions.Item>
                      <Descriptions.Item label="Room Number">{room.room_number}</Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={room.status === 'Available' ? 'green' : 'red'}>
                          {room.status}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Capacity">
                        {room.room_type.capacity} Person{room.room_type.capacity > 1 ? 's' : ''}
                      </Descriptions.Item>
                    </Descriptions>

                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={handleBookNow}
                      disabled={room.status !== 'Available'}
                      style={{ marginTop: '1em' }}
                      className="bg-[#2C1810] hover:bg-[#3D2317] mt-5"
                    >
                      Book Now
                    </Button>
                  </Card>
                </Col>
              </Row>
            </Card>
          </div>
        </Content>
      </PageTransition>

      {/* Booking Modal */}
      <Modal
        title={<Title level={4}>Book Room {room.room_number}</Title>}
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
    </AppLayout>
  );
};

export default RoomDetails; 