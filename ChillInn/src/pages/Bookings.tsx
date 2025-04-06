import { useState, useEffect } from 'react';
import { Layout, Card, Tag, Typography, Button, Modal, Descriptions, Timeline, Empty, Spin } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, CreditCardOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text } = Typography;

// Types
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
  check_in: string;
  check_out: string;
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
    check_in: "2024-04-15",
    check_out: "2024-04-20",
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
    check_in: "2024-05-01",
    check_out: "2024-05-03",
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
    check_in: "2024-03-10",
    check_out: "2024-03-15",
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
  }
];

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setBookings(dummyBookings);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: Booking['status']) => {
    const colors = {
      Pending: 'orange',
      Confirmed: 'green',
      Completed: 'blue',
      Cancelled: 'red'
    };
    return colors[status];
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
  };

  const getRemainingBalance = (booking: Booking) => {
    const totalPaid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return booking.total_price - totalPaid;
  };

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="guest" />
      <Layout className="bg-[#F5F5F5]">
        <PageTransition>
          <Content className="p-6">
            <div className="max-w-5xl mx-auto">
              <Title level={2} className="mb-6">My Bookings</Title>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Spin size="large" />
                </div>
              ) : bookings.length === 0 ? (
                <Empty
                  description="No bookings found"
                  className="bg-white p-8 rounded-lg shadow"
                />
              ) : (
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
                    {selectedBooking.payments.length > 0 ? (
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

                  {selectedBooking.status === 'Pending' && (
                    <div className="flex justify-end gap-4">
                      <Button danger>Cancel Booking</Button>
                      <Button type="primary" className="bg-[#2C1810] hover:bg-[#3D2317]">
                        Make Payment
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Modal>
          </Content>
        </PageTransition>
      </Layout>
    </Layout>
  );
};

export default Bookings; 