import { useState, useEffect } from 'react';
import { Layout, Typography, Tabs, Card, Tag, Button, Row, Col, Empty, Divider, Modal, List, message, Descriptions } from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AppLayout from '../components/AppLayout';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Payment {
  payment_id: number;
  booking_id: number;
  amount: number;
  method: string;
  payment_date: string;
}

interface Booking {
  booking_id: number;
  guest_id: number;
  room_id: number;
  room_name: string;
  room_type: string;
  room_image: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  total_price: number;
  created_at: string;
  payments: Payment[];
}

// Dummy data
const dummyBookings: Booking[] = [
  {
    booking_id: 1,
    guest_id: 1,
    room_id: 101,
    room_name: "Deluxe Ocean View",
    room_type: "Deluxe Suite",
    room_image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070",
    check_in: "2024-06-15",
    check_out: "2024-06-20",
    guests: 2,
    status: "Confirmed",
    total_price: 25000,
    created_at: "2024-04-01T10:30:00",
    payments: [
      {
        payment_id: 1,
        booking_id: 1,
        amount: 12500,
        method: "Credit Card",
        payment_date: "2024-04-01T10:35:00"
      }
    ]
  },
  {
    booking_id: 2,
    guest_id: 1,
    room_id: 102,
    room_name: "Premium Mountain View",
    room_type: "Premium Suite",
    room_image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070",
    check_in: "2024-06-25",
    check_out: "2024-06-28",
    guests: 3,
    status: "Pending",
    total_price: 15000,
    created_at: "2024-04-02T14:20:00",
    payments: []
  },
  {
    booking_id: 3,
    guest_id: 1,
    room_id: 103,
    room_name: "Standard City View",
    room_type: "Standard Room",
    room_image: "https://images.unsplash.com/photo-1614518921956-0d7c71b7999d?q=80&w=2070",
    check_in: "2024-05-10",
    check_out: "2024-05-15",
    guests: 1,
    status: "Completed",
    total_price: 18000,
    created_at: "2024-03-01T09:15:00",
    payments: [
      {
        payment_id: 2,
        booking_id: 3,
        amount: 18000,
        method: "Bank Transfer",
        payment_date: "2024-03-01T09:20:00"
      }
    ]
  },
  {
    booking_id: 4,
    guest_id: 1,
    room_id: 104,
    room_name: "Executive Garden Suite",
    room_type: "Executive Suite",
    room_image: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?q=80&w=2070",
    check_in: "2024-07-05",
    check_out: "2024-07-10",
    guests: 2,
    status: "Confirmed",
    total_price: 30000,
    created_at: "2024-04-15T16:45:00",
    payments: [
      {
        payment_id: 3,
        booking_id: 4,
        amount: 15000,
        method: "Credit Card",
        payment_date: "2024-04-15T16:50:00"
      }
    ]
  }
];

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);

  useEffect(() => {
    // Simulate API call to fetch bookings
    setTimeout(() => {
      setBookings(dummyBookings);
      setLoading(false);
    }, 1000);
  }, []);

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM D, YYYY');
  };

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'green';
      case 'Pending':
        return 'orange';
      case 'Completed':
        return 'blue';
      case 'Cancelled':
        return 'red';
      default:
        return 'default';
    }
  };

  const showBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalVisible(true);
  };

  const handleCancelBooking = () => {
    if (selectedBooking) {
      // In a real app, you would make an API call here
      const updatedBookings = bookings.map(booking => 
        booking.booking_id === selectedBooking.booking_id 
          ? { ...booking, status: 'Cancelled' as const } 
          : booking
      );
      
      setBookings(updatedBookings);
      setSelectedBooking({ ...selectedBooking, status: 'Cancelled' });
      setIsCancelModalVisible(false);
      message.success('Booking cancelled successfully');
    }
  };

  const confirmCancellation = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCancelModalVisible(true);
  };

  const getRemainingBalance = (booking: Booking) => {
    const totalPaid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return booking.total_price - totalPaid;
  };

  const getNights = (checkIn: string, checkOut: string) => {
    return dayjs(checkOut).diff(dayjs(checkIn), 'day');
  };

  const upcomingBookings = bookings.filter(
    booking => dayjs(booking.check_in).isAfter(dayjs()) && booking.status !== 'Cancelled'
  );
  
  const historyBookings = bookings.filter(
    booking => dayjs(booking.check_in).isBefore(dayjs()) || booking.status === 'Cancelled'
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <AppLayout userRole="guest" userName="John Doe">
      <div className="p-6 bg-[#F5F5F5] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <Title level={2} className="mb-6">My Bookings</Title>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            className="bg-white p-4 rounded shadow-sm"
          >
            <TabPane tab="Upcoming" key="upcoming">
              {upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map(booking => (
                    <Card key={booking.booking_id} className="hover:shadow-md transition-shadow">
                      <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={6}>
                          <div className="aspect-video rounded overflow-hidden">
                            <img src={booking.room_image} alt={booking.room_name} className="w-full h-full object-cover" />
                          </div>
                        </Col>
                        
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <Title level={4} className="mb-0">{booking.room_name}</Title>
                            <Text type="secondary">{booking.room_type}</Text>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <Tag color={getStatusColor(booking.status)}>{booking.status}</Tag>
                              <Text type="secondary">Booking #{booking.booking_id}</Text>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 mt-2">
                              <div className="flex items-center">
                                <CalendarOutlined className="mr-2 text-[#D4AF37]" />
                                <Text>{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</Text>
                              </div>
                              <div className="flex items-center">
                                <ClockCircleOutlined className="mr-2 text-[#D4AF37]" />
                                <Text>{getNights(booking.check_in, booking.check_out)} Nights</Text>
                              </div>
                            </div>
                          </div>
                        </Col>
                        
                        <Col xs={24} md={6} className="flex flex-col items-end justify-between h-full">
                          <div className="text-right">
                            <Title level={5} className="mb-0">{formatPrice(booking.total_price)}</Title>
                            <Text type="secondary">Total</Text>
                          </div>
                          
                          <div className="mt-4 space-y-2 w-full sm:text-right">
                            <Button type="primary" className="w-full sm:w-auto bg-[#2C1810] hover:bg-[#3D2317]" onClick={() => showBookingDetails(booking)}>
                              View Details
                            </Button>
                            
                            {booking.status !== 'Cancelled' && (
                              <Button danger className="w-full sm:w-auto" onClick={() => confirmCancellation(booking)}>
                                Cancel Booking
                              </Button>
                            )}
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty
                  description="You don't have any upcoming bookings"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </TabPane>
            
            <TabPane tab="History" key="history">
              {historyBookings.length > 0 ? (
                <div className="space-y-4">
                  {historyBookings.map(booking => (
                    <Card key={booking.booking_id} className="hover:shadow-md transition-shadow">
                      <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={6}>
                          <div className="aspect-video rounded overflow-hidden">
                            <img src={booking.room_image} alt={booking.room_name} className="w-full h-full object-cover" />
                          </div>
                        </Col>
                        
                        <Col xs={24} md={12}>
                          <div className="space-y-2">
                            <Title level={4} className="mb-0">{booking.room_name}</Title>
                            <Text type="secondary">{booking.room_type}</Text>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <Tag color={getStatusColor(booking.status)}>{booking.status}</Tag>
                              <Text type="secondary">Booking #{booking.booking_id}</Text>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 mt-2">
                              <div className="flex items-center">
                                <CalendarOutlined className="mr-2 text-[#D4AF37]" />
                                <Text>{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</Text>
                              </div>
                              <div className="flex items-center">
                                <ClockCircleOutlined className="mr-2 text-[#D4AF37]" />
                                <Text>{getNights(booking.check_in, booking.check_out)} Nights</Text>
                              </div>
                            </div>
                          </div>
                        </Col>
                        
                        <Col xs={24} md={6} className="flex flex-col items-end justify-between h-full">
                          <div className="text-right">
                            <Title level={5} className="mb-0">{formatPrice(booking.total_price)}</Title>
                            <Text type="secondary">Total</Text>
                          </div>
                          
                          <div className="mt-4 w-full sm:text-right">
                            <Button type="primary" className="w-full sm:w-auto bg-[#2C1810] hover:bg-[#3D2317]" onClick={() => showBookingDetails(booking)}>
                              View Details
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty
                  description="You don't have any booking history"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </TabPane>
          </Tabs>
        </div>
      </div>

      {/* Booking Details Modal */}
      <Modal
        title={<Title level={3} className="m-0">Booking Details</Title>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
        centered
      >
        {selectedBooking && (
          <div className="space-y-6">
            <Card className="shadow-sm">
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <div className="aspect-square rounded overflow-hidden">
                    <img src={selectedBooking.room_image} alt={selectedBooking.room_name} className="w-full h-full object-cover" />
                  </div>
                </Col>
                <Col xs={24} md={16}>
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="Room Name">{selectedBooking.room_name}</Descriptions.Item>
                    <Descriptions.Item label="Room Type">{selectedBooking.room_type}</Descriptions.Item>
                    <Descriptions.Item label="Check-in">{formatDate(selectedBooking.check_in)}</Descriptions.Item>
                    <Descriptions.Item label="Check-out">{formatDate(selectedBooking.check_out)}</Descriptions.Item>
                    <Descriptions.Item label="Guests">{selectedBooking.guests}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={getStatusColor(selectedBooking.status)}>{selectedBooking.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Booking Date">{dayjs(selectedBooking.created_at).format('MMMM D, YYYY, h:mm A')}</Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
            </Card>

            <Card className="shadow-sm">
              <Title level={4} className="mb-4">Payment Details</Title>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Text>{getNights(selectedBooking.check_in, selectedBooking.check_out)} nights</Text>
                  <Text>{formatPrice(selectedBooking.total_price)}</Text>
                </div>
                
                <Divider className="my-2" />
                
                <div className="flex justify-between">
                  <Text strong>Total</Text>
                  <Text strong>{formatPrice(selectedBooking.total_price)}</Text>
                </div>
                
                <div className="flex justify-between">
                  <Text strong>Paid</Text>
                  <Text strong>{formatPrice(selectedBooking.payments.reduce((sum, payment) => sum + payment.amount, 0))}</Text>
                </div>
                
                <div className="flex justify-between">
                  <Text strong>Remaining</Text>
                  <Text strong type={getRemainingBalance(selectedBooking) > 0 ? "danger" : "success"}>
                    {formatPrice(getRemainingBalance(selectedBooking))}
                  </Text>
                </div>
              </div>
              
              {selectedBooking.payments.length > 0 && (
                <div className="mt-6">
                  <Title level={5} className="mb-3">Payment History</Title>
                  <List
                    dataSource={selectedBooking.payments}
                    renderItem={payment => (
                      <List.Item>
                        <div className="flex justify-between w-full">
                          <div>
                            <Text strong>{payment.method}</Text>
                            <div>
                              <Text type="secondary">{dayjs(payment.payment_date).format('MMMM D, YYYY, h:mm A')}</Text>
                            </div>
                          </div>
                          <Text>{formatPrice(payment.amount)}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </Card>

            <div className="flex justify-end gap-3">
              {selectedBooking.status !== 'Cancelled' && selectedBooking.status !== 'Completed' && (
                <Button danger onClick={() => confirmCancellation(selectedBooking)}>
                  Cancel Booking
                </Button>
              )}
              <Button onClick={() => setIsModalVisible(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        title={<div className="flex items-center gap-2 text-red-500"><ExclamationCircleOutlined /> Cancel Booking</div>}
        open={isCancelModalVisible}
        onCancel={() => setIsCancelModalVisible(false)}
        onOk={handleCancelBooking}
        okText="Yes, Cancel Booking"
        okButtonProps={{ danger: true }}
        cancelText="No, Keep Booking"
      >
        <p>Are you sure you want to cancel this booking?</p>
        <p>This action cannot be undone.</p>
      </Modal>
    </AppLayout>
  );
};

export default MyBookings; 