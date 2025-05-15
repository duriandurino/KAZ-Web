import { useState, useEffect } from 'react';
import { Layout, Card, Tag, Typography, Button, Modal, Descriptions, Timeline, Empty, Spin, message, Select, DatePicker, Space, Table } from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  CreditCardOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  FilterOutlined,
  UserOutlined,
  SearchOutlined
} from '@ant-design/icons';
import AppLayout from '../components/AppLayout';
import dayjs from 'dayjs';
import { getGuestBookings, getAllBookings, cancelBooking } from '../lib/bookingService';
import { getBookingPayments, recordPayment } from '../lib/paymentService';
import { getRoomThumbnail } from '../lib/cloudinaryService';
import { BookingStatus, Payment, PaymentMethod } from '../utils/types';
import { useLocation } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Types
interface Booking {
  booking_id: number;
  guest_id: number;
  room_id: number;
  room_name: string;
  room_type: string;
  room_image?: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  total_price: number;
  created_at: string;
  payments: Payment[];
  guest_fullname?: string;
  guest_email?: string;
}

const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1590490360182-c33d57733427';

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const location = useLocation();
  const [roomImages, setRoomImages] = useState<{[key: string]: string}>({});
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  // Determine userRole based on the current path
  const userRole = location.pathname.includes('/admin/') ? 'admin' : 'guest';

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateRange]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login if no token
        window.location.href = '/';
        return;
      }

      // Prepare options based on filters
      const options: any = {
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        options.status = statusFilter;
      }

      // Add date range filter if set
      if (dateRange && dateRange[0] && dateRange[1]) {
        options.start_date = dateRange[0].format('YYYY-MM-DD');
        options.end_date = dateRange[1].format('YYYY-MM-DD');
      }

      // Fetch appropriate bookings based on user role
      let response;
      if (userRole === 'admin') {
        response = await getAllBookings(token, options);
      } else {
        response = await getGuestBookings(token, options);
      }
      
      console.log(`Fetched ${userRole} bookings:`, response);
      
      // Fetch room images for each booking
      const processedBookings = response.bookings.map(booking => ({
        ...booking,
        payments: booking.payments || []
      }));
      
      setBookings(processedBookings);
      
      // Fetch images for each booking
      processedBookings.forEach(booking => {
        if (booking.room_id) {
          fetchRoomImage(booking.room_id.toString(), token);
        }
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      message.error('Failed to load bookings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomImage = async (roomId: string, token: string) => {
    try {
      const thumbnailData = await getRoomThumbnail(roomId, token);
      
      if (thumbnailData.imageUrl) {
        setRoomImages(prev => ({
          ...prev,
          [roomId]: thumbnailData.imageUrl || DEFAULT_ROOM_IMAGE
        }));
      }
    } catch (error) {
      console.error(`Error fetching image for room ${roomId}:`, error);
      // Don't show error to user
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
        payments: response.payments
      });
    } catch (error) {
      console.error('Error fetching booking payments:', error);
      message.error('Failed to load payment details.');
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    const colors = {
      Pending: 'orange',
      Confirmed: 'green',
      Completed: 'blue',
      Cancelled: 'red',
      'Checked-in': 'cyan',
      'Checked-out': 'purple'
    };
    return colors[status] || 'default';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  const showBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalVisible(true);
    fetchBookingPayments(booking);
  };

  const getRemainingBalance = (booking: Booking) => {
    const totalPaid = booking.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    return booking.total_price - totalPaid;
  };

  const showCancelConfirmation = () => {
    setIsModalVisible(false);
    setIsCancelModalVisible(true);
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
          ? { ...booking, status: 'Cancelled' as const } 
          : booking
      );
      
      setBookings(updatedBookings);
      setIsCancelModalVisible(false);
      message.success('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      message.error('Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Add function to handle booking confirmation by admin
  const handleConfirmBooking = async () => {
    if (!selectedBooking) return;
    
    setConfirmLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // For demonstration purposes, record a payment to trigger status change
      await recordPayment({
        booking_id: selectedBooking.booking_id,
        amount: selectedBooking.total_price, // Pay full amount
        method: PaymentMethod.CASH, // Default to cash payment for demo
        notes: 'Payment recorded by admin for demonstration'
      }, token);
      
      // Update local state
      const updatedBookings = bookings.map(booking => 
        booking.booking_id === selectedBooking.booking_id 
          ? { ...booking, status: 'Confirmed' as BookingStatus } 
          : booking
      );
      
      setBookings(updatedBookings);
      
      // Update selected booking state
      setSelectedBooking({
        ...selectedBooking,
        status: 'Confirmed' as BookingStatus
      });
      
      message.success('Booking confirmed successfully');
    } catch (error) {
      console.error('Error confirming booking:', error);
      message.error('Failed to confirm booking. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Add function to handle payment by guest
  const showPaymentModal = () => {
    setIsModalVisible(false);
    setIsPaymentModalVisible(true);
  };

  // Handle payment submission
  const handlePaymentSubmit = async (paymentData: any) => {
    if (!selectedBooking) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Record payment using the form data
      await recordPayment({
        booking_id: selectedBooking.booking_id,
        amount: paymentData.amount,
        method: paymentData.method,
        notes: paymentData.notes || 'Payment made by guest'
      }, token);
      
      // Update local state
      const updatedBookings = bookings.map(booking => 
        booking.booking_id === selectedBooking.booking_id 
          ? { ...booking, status: 'Confirmed' as BookingStatus } 
          : booking
      );
      
      setBookings(updatedBookings);
      setIsPaymentModalVisible(false);
      
      // Refresh the booking details to show updated status and payments
      fetchBookings();
      
      message.success('Payment recorded successfully');
    } catch (error) {
      console.error('Error recording payment:', error);
      message.error('Failed to process payment. Please try again.');
    }
  };

  // Admin-specific table columns
  const adminColumns = [
    {
      title: 'Guest',
      dataIndex: 'guest_fullname',
      key: 'guest',
      render: (text: string, record: Booking) => (
        <div>
          <div>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.guest_email}</Text>
        </div>
      ),
    },
    {
      title: 'Room',
      dataIndex: 'room_name',
      key: 'room',
      render: (text: string, record: Booking) => (
        <div>
          <div>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.room_type}</Text>
        </div>
      ),
    },
    {
      title: 'Check-in / Check-out',
      key: 'dates',
      render: (text: string, record: Booking) => (
        <div>
          <div>{dayjs(record.check_in).format('MMM D, YYYY')}</div>
          <div>{dayjs(record.check_out).format('MMM D, YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status as BookingStatus)}>{status}</Tag>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'total_price',
      key: 'price',
      render: (price: number) => formatPrice(price),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: Booking) => (
        <Button type="primary" onClick={() => showBookingDetails(record)} style={{ color: 'white' }} className="text-white !text-white">
          View Details
        </Button>
      ),
    },
  ];

  return (
    <AppLayout userRole={userRole}>
      <Content className="p-6 bg-[#F5F5F5]">
        <div className="max-w-7xl mx-auto">
          <Title level={2} className="mb-6">
            {userRole === 'admin' ? 'Booking Management' : 'My Bookings'}
          </Title>

          {/* Filters for both user roles, but admin gets more options */}
          <Card className="mb-6 shadow-sm">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <Text strong className="mr-2">Status:</Text>
                <Select 
                  value={statusFilter} 
                  onChange={setStatusFilter} 
                  style={{ width: 150 }}
                  placeholder="Filter by status"
                >
                  <Option value="all">All Statuses</Option>
                  <Option value="Pending">Pending</Option>
                  <Option value="Confirmed">Confirmed</Option>
                  <Option value="Checked-in">Checked-in</Option>
                  <Option value="Checked-out">Checked-out</Option>
                  <Option value="Cancelled">Cancelled</Option>
                </Select>
              </div>
              <div>
                <Text strong className="mr-2">Date Range:</Text>
                <RangePicker 
                  onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
                  className="w-auto"
                />
              </div>
              <Button 
                type="primary" 
                icon={<FilterOutlined />} 
                onClick={fetchBookings}
                className="ml-auto text-white !text-white"
                style={{ color: 'white' }}
              >
                Apply Filters
              </Button>
            </div>
          </Card>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : bookings.length === 0 ? (
            <Empty
              description="No bookings found"
              className="bg-white p-8 rounded-lg shadow"
            />
          ) : userRole === 'admin' ? (
            // Admin view - table format
            <Card className="shadow-sm">
              <Table 
                dataSource={bookings} 
                columns={adminColumns} 
                rowKey="booking_id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          ) : (
            // Guest view - card format
            <div className="space-y-4">
              {bookings.map(booking => (
                <Card
                  key={booking.booking_id}
                  className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => showBookingDetails(booking)}
                >
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <Title level={4} className="m-0">{booking.room_name}</Title>
                        <Tag color={getStatusColor(booking.status)}>{booking.status}</Tag>
                      </div>
                      <Text type="secondary" className="block mb-2">{booking.room_type}</Text>
                      <div className="flex gap-6 mb-3">
                        <div className="flex items-center gap-2">
                          <CalendarOutlined />
                          <Text>{dayjs(booking.check_in).format('MMM D')} - {dayjs(booking.check_out).format('MMM D, YYYY')}</Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockCircleOutlined />
                          <Text>{dayjs(booking.created_at).format('MMM D, YYYY')}</Text>
                        </div>
                      </div>
                    </div>
                    <div className="md:text-right mt-4 md:mt-0">
                      <Title level={4} className="m-0 text-[#2C1810]">{formatPrice(booking.total_price)}</Title>
                      <Text type="secondary">Total Price</Text>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

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
              <Card className="shadow">
                <Descriptions column={1} bordered>
                  {userRole === 'admin' && (
                    <>
                      <Descriptions.Item label="Guest Name">{selectedBooking.guest_fullname}</Descriptions.Item>
                      <Descriptions.Item label="Guest Email">{selectedBooking.guest_email}</Descriptions.Item>
                    </>
                  )}
                  <Descriptions.Item label="Room Name">{selectedBooking.room_name}</Descriptions.Item>
                  <Descriptions.Item label="Room Type">{selectedBooking.room_type}</Descriptions.Item>
                  <Descriptions.Item label="Check-in">{dayjs(selectedBooking.check_in).format('MMMM D, YYYY')}</Descriptions.Item>
                  <Descriptions.Item label="Check-out">{dayjs(selectedBooking.check_out).format('MMMM D, YYYY')}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={getStatusColor(selectedBooking.status)}>{selectedBooking.status}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Price">{formatPrice(selectedBooking.total_price)}</Descriptions.Item>
                  <Descriptions.Item label="Remaining Balance">{formatPrice(getRemainingBalance(selectedBooking))}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="Payment History" className="shadow">
                {selectedBooking.payments && selectedBooking.payments.length > 0 ? (
                  <Timeline
                    items={selectedBooking.payments.map(payment => ({
                      dot: <CreditCardOutlined className="text-[#2C1810]" />,
                      children: (
                        <div>
                          <div className="font-semibold">{formatPrice(payment.amount)} paid via {payment.method}</div>
                          <div className="text-gray-500">{dayjs(payment.payment_date).format('MMMM D, YYYY h:mm A')}</div>
                        </div>
                      )
                    }))}
                  />
                ) : (
                  <Empty description="No payments recorded" />
                )}
              </Card>

              <div className="flex justify-end gap-4">
                {userRole === 'admin' && selectedBooking.status !== 'Cancelled' && (
                  <Button danger onClick={showCancelConfirmation}>Cancel Booking</Button>
                )}
                
                {userRole === 'guest' && (selectedBooking.status === 'Pending' || selectedBooking.status === 'Confirmed') && (
                  <Button danger onClick={showCancelConfirmation}>Cancel Booking</Button>
                )}
                
                {userRole === 'admin' && selectedBooking.status === 'Pending' && (
                  <Button 
                    type="primary" 
                    className="bg-[#2C1810] hover:bg-[#3D2317] text-white"
                    onClick={handleConfirmBooking}
                    loading={confirmLoading}
                  >
                    Confirm Booking
                  </Button>
                )}
                
                {userRole === 'guest' && (selectedBooking.status === 'Pending' || selectedBooking.status === 'Confirmed') && getRemainingBalance(selectedBooking) > 0 && (
                  <Button 
                    type="primary" 
                    className="bg-[#2C1810] hover:bg-[#3D2317] text-white"
                    onClick={showPaymentModal}
                  >
                    Make Payment
                  </Button>
                )}
                
                <Button onClick={() => setIsModalVisible(false)} className="text-black">Close</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Cancel Confirmation Modal */}
        <Modal
          title={<div className="flex items-center text-red-500"><ExclamationCircleOutlined className="mr-2" /> Cancel Booking</div>}
          open={isCancelModalVisible}
          onCancel={() => setIsCancelModalVisible(false)}
          footer={[
            <Button key="back" onClick={() => setIsCancelModalVisible(false)} className="text-black">
              No, Keep This Booking
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              danger 
              loading={cancelLoading} 
              onClick={handleCancelBooking}
              className="text-white"
            >
              Yes, Cancel Booking
            </Button>
          ]}
        >
          <p>Are you sure you want to cancel this booking?</p>
          <p>This action cannot be undone.</p>
        </Modal>

        {/* Add Payment Modal */}
        <Modal
          title={<Title level={4} className="m-0">Make Payment</Title>}
          open={isPaymentModalVisible}
          onCancel={() => setIsPaymentModalVisible(false)}
          footer={null}
          width={600}
          centered
        >
          {selectedBooking && (
            <PaymentForm 
              bookingId={selectedBooking.booking_id}
              totalPrice={selectedBooking.total_price}
              remainingBalance={getRemainingBalance(selectedBooking)}
              onSuccess={() => {
                setIsPaymentModalVisible(false);
                fetchBookings();
              }}
              onCancel={() => setIsPaymentModalVisible(false)}
            />
          )}
        </Modal>
      </Content>
    </AppLayout>
  );
};

export default Bookings; 