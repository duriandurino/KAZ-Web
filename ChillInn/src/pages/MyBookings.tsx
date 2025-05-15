import { useState, useEffect } from 'react';
import { Layout, Typography, Tabs, Card, Tag, Button, Row, Col, Empty, Divider, Modal, List, message, Descriptions } from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  StarOutlined,
  EditOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AppLayout from '../components/AppLayout';
import ReviewForm from '../components/ReviewForm';
import { getGuestBookings, cancelBooking } from '../lib/bookingService';
import { getBookingPayments } from '../lib/paymentService';
import { getRoomThumbnail, getRoomPreviewImages } from '../lib/cloudinaryService';
import CachedImage from '../components/CachedImage';
import { BookingStatus, Payment } from '../utils/types';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Booking {
  booking_id: number;
  guest_id: number;
  room_id: number;
  room_name: string;
  room_type: string;
  room_image: string;
  images?: string[];
  check_in: string;
  check_out: string;
  guests: number;
  status: BookingStatus;
  total_price: number;
  created_at: string;
  payments: Payment[];
  has_review?: boolean;
}

const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1590490360182-c33d57733427';

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [roomImages, setRoomImages] = useState<{[key: string]: {thumbnail: string | null, previews: string[]}}>({}); 

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login if no token
        window.location.href = '/';
        return;
      }

      const response = await getGuestBookings(token);
      console.log('Fetched bookings:', response);
      
      // Ensure all bookings have an empty payments array initially
      const processedBookings = response.bookings.map(booking => ({
        ...booking,
        payments: booking.payments || [],
        room_image: booking.room_image || (booking.images && booking.images.length > 0 
          ? booking.images[0] 
          : DEFAULT_ROOM_IMAGE)
      }));
      
      setBookings(processedBookings);
      
      // Fetch images for each booking
      processedBookings.forEach(booking => {
        fetchRoomImages(booking.room_id, token);
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      message.error('Failed to load bookings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomImages = async (roomId: number, token: string) => {
    try {
      // Get room thumbnail and preview images in parallel
      const [thumbnailData, previewData] = await Promise.all([
        getRoomThumbnail(roomId.toString(), token),
        getRoomPreviewImages(roomId.toString(), token)
      ]);
      
      // Set the images for this room
      setRoomImages(prev => ({
        ...prev,
        [roomId]: {
          thumbnail: thumbnailData.imageUrl,
          previews: previewData.map(image => image.imageUrl).filter(Boolean) as string[]
        }
      }));
      
      // Update bookings with actual images
      setBookings(prevBookings => prevBookings.map(booking => {
        if (booking.room_id === roomId) {
          return {
            ...booking,
            room_image: thumbnailData.imageUrl || (previewData.length > 0 ? previewData[0].imageUrl : booking.room_image)
          };
        }
        return booking;
      }));
    } catch (error) {
      console.error(`Error fetching images for room ${roomId}:`, error);
      // Don't show error to user to avoid cluttering the UI
    }
  };

  const fetchBookingPayments = async (booking: Booking) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await getBookingPayments(booking.booking_id, token);
      
      // Update the selected booking with payment data
      setSelectedBooking({
        ...booking,
        payments: response.payments || []
      });
    } catch (error) {
      console.error('Error fetching booking payments:', error);
      message.error('Failed to load payment details.');
    }
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM D, YYYY');
  };

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString()}`;
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed':
        return 'green';
      case 'Pending':
        return 'orange';
      case 'Checked-in':
        return 'blue';
      case 'Checked-out':
        return 'purple';
      case 'Cancelled':
        return 'red';
      default:
        return 'default';
    }
  };

  const showBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalVisible(true);
    fetchBookingPayments(booking);
  };

  const confirmCancellation = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCancelModalVisible(true);
    setIsModalVisible(false);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await cancelBooking(selectedBooking.booking_id, token);
      
      // Update local state
      const updatedBookings = bookings.map(booking => 
        booking.booking_id === selectedBooking.booking_id 
          ? { ...booking, status: 'Cancelled' as BookingStatus } 
          : booking
      );
      
      setBookings(updatedBookings);
      setSelectedBooking({ ...selectedBooking, status: 'Cancelled' });
      setIsCancelModalVisible(false);
      message.success('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      message.error('Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const getRemainingBalance = (booking: Booking) => {
    const totalPaid = booking.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    return booking.total_price - totalPaid;
  };

  const getNights = (checkIn: string, checkOut: string) => {
    return dayjs(checkOut).diff(dayjs(checkIn), 'day');
  };

  const handleOpenReviewModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsReviewModalVisible(true);
    setIsModalVisible(false); // Close the details modal
  };

  const handleReviewSuccess = () => {
    if (selectedBooking) {
      // Update local state to mark this booking as having a review
      const updatedBookings = bookings.map(booking => 
        booking.booking_id === selectedBooking.booking_id 
          ? { ...booking, has_review: true } 
          : booking
      );
      
      setBookings(updatedBookings);
      setIsReviewModalVisible(false);
      message.success('Thank you for your review!');
    }
  };

  // Filter bookings by tab
  const filteredBookings = bookings.filter(booking => {
    const now = dayjs();
    const checkIn = dayjs(booking.check_in);
    const checkOut = dayjs(booking.check_out);
    
    if (activeTab === 'upcoming') {
      return (checkIn.isAfter(now) || checkIn.isSame(now, 'day')) && booking.status !== 'Cancelled';
    } else if (activeTab === 'past') {
      return checkOut.isBefore(now) || booking.status === 'Checked-out' || booking.status === 'Cancelled';
    }
    return true; // All bookings tab
  });

  return (
    <AppLayout userRole="guest">
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <Title level={3} className="mb-6">My Bookings</Title>
          
          <Tabs defaultActiveKey="upcoming" onChange={setActiveTab} className="mb-6">
            <TabPane tab="Upcoming Bookings" key="upcoming" />
            <TabPane tab="Past Bookings" key="past" />
            <TabPane tab="All Bookings" key="all" />
          </Tabs>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
              <Text className="block mt-2">Loading your bookings...</Text>
            </div>
          ) : filteredBookings.length === 0 ? (
            <Empty description="No bookings found" />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredBookings.map(booking => (
                <Col xs={24} md={12} xl={8} key={booking.booking_id}>
                  <Card 
                    hoverable 
                    className="booking-card shadow-sm hover:shadow-md transition-shadow"
                    cover={
                      <div className="h-48 overflow-hidden">
                        <CachedImage
                          alt={booking.room_name}
                          src={booking.room_image || DEFAULT_ROOM_IMAGE}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          fallback={DEFAULT_ROOM_IMAGE}
                        />
                      </div>
                    }
                  >
                    <div className="mb-3 flex justify-between items-center">
                      <Title level={5} className="mb-0">{booking.room_name}</Title>
                      <Tag color={getStatusColor(booking.status)}>{booking.status}</Tag>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center mb-1">
                        <CalendarOutlined className="mr-2 text-[#D4AF37]" />
                        <Text>{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</Text>
                      </div>
                      <div className="flex items-center">
                        <DollarOutlined className="mr-2 text-[#D4AF37]" />
                        <Text>{formatPrice(booking.total_price)}</Text>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Text type="secondary" className="text-sm">
                        <ClockCircleOutlined className="mr-1" /> 
                        Booked on {dayjs(booking.created_at).format('MMM D, YYYY')}
                      </Text>
                      
                      <Button type="link" onClick={() => showBookingDetails(booking)}>
                        View Details
                      </Button>
                    </div>
                    
                    {booking.status === 'Checked-out' && !booking.has_review && (
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          icon={<StarOutlined />} 
                          type="primary" 
                          className="w-full bg-[#D4AF37]" 
                          onClick={() => handleOpenReviewModal(booking)}
                        >
                          Leave a Review
                        </Button>
                      </div>
                    )}
                    
                    {booking.status === 'Checked-out' && booking.has_review && (
                      <div className="mt-3 pt-3 border-t">
                        <Tag color="success" className="w-full text-center py-1">
                          <CheckCircleOutlined className="mr-1" /> 
                          Review Submitted
                        </Tag>
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      <Modal
        title={<div className="flex items-center gap-2"><CalendarOutlined /> Booking Details</div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedBooking && (
          <div className="booking-details">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <CachedImage
                  src={selectedBooking.room_image || DEFAULT_ROOM_IMAGE}
                  alt={selectedBooking.room_name}
                  style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                  fallback={DEFAULT_ROOM_IMAGE}
                />
                {roomImages[selectedBooking.room_id]?.previews?.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {roomImages[selectedBooking.room_id].previews.slice(0, 3).map((previewUrl, index) => (
                      <CachedImage
                        key={index}
                        src={previewUrl}
                        alt={`${selectedBooking.room_name} preview ${index + 1}`}
                        style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                        fallback={DEFAULT_ROOM_IMAGE}
                      />
                    ))}
                    {roomImages[selectedBooking.room_id].previews.length > 3 && (
                      <div className="relative w-[80px] h-[60px] bg-gray-800 rounded flex items-center justify-center">
                        <Text className="text-white">+{roomImages[selectedBooking.room_id].previews.length - 3}</Text>
                      </div>
                    )}
                  </div>
                )}
              </Col>
              <Col xs={24} md={12}>
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <Title level={4} className="mb-1">{selectedBooking.room_name}</Title>
                    <Tag color={getStatusColor(selectedBooking.status)}>
                      {selectedBooking.status}
                    </Tag>
                  </div>
                  <Text type="secondary">{selectedBooking.room_type}</Text>
                </div>

                <Card className="shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CalendarOutlined className="mr-2 text-[#D4AF37]" />
                      <Text strong>Check-in:</Text>
                      <Text className="ml-2">{formatDate(selectedBooking.check_in)}</Text>
                    </div>
                    <div className="flex items-center">
                      <CalendarOutlined className="mr-2 text-[#D4AF37]" />
                      <Text strong>Check-out:</Text>
                      <Text className="ml-2">{formatDate(selectedBooking.check_out)}</Text>
                    </div>
                    <div className="flex items-center">
                      <UserOutlined className="mr-2 text-[#D4AF37]" />
                      <Text strong>Guests:</Text>
                      <Text className="ml-2">{selectedBooking.guests}</Text>
                    </div>
                    <div className="flex items-center">
                      <ClockCircleOutlined className="mr-2 text-[#D4AF37]" />
                      <Text strong>Booked on:</Text>
                      <Text className="ml-2">{dayjs(selectedBooking.created_at).format('MMMM D, YYYY, h:mm A')}</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Divider />

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
                  <Text strong>{formatPrice(selectedBooking.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0)}</Text>
                </div>
                
                <div className="flex justify-between">
                  <Text strong>Remaining</Text>
                  <Text strong type={getRemainingBalance(selectedBooking) > 0 ? "danger" : "success"}>
                    {formatPrice(getRemainingBalance(selectedBooking))}
                  </Text>
                </div>
              </div>
              
              {selectedBooking.payments && selectedBooking.payments.length > 0 && (
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

            <div className="flex justify-end gap-3 mt-4">
              {selectedBooking.status === 'Checked-out' && !selectedBooking.has_review && (
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={() => handleOpenReviewModal(selectedBooking)}
                  className="bg-[#D4AF37]"
                >
                  Leave a Review
                </Button>
              )}
              
              {(selectedBooking.status === 'Pending' || selectedBooking.status === 'Confirmed') && (
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
        okButtonProps={{ danger: true, loading: cancelLoading }}
        cancelText="No, Keep Booking"
      >
        <p>Are you sure you want to cancel this booking?</p>
        <p>This action cannot be undone.</p>
      </Modal>
      
      {/* Review Modal */}
      <Modal
        title={<div className="flex items-center gap-2"><StarOutlined /> Rate Your Stay</div>}
        open={isReviewModalVisible}
        onCancel={() => setIsReviewModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        {selectedBooking && (
          <ReviewForm 
            bookingId={selectedBooking.booking_id} 
            onSuccess={handleReviewSuccess}
            onCancel={() => setIsReviewModalVisible(false)}
          />
        )}
      </Modal>
    </AppLayout>
  );
};

export default MyBookings; 