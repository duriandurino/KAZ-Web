import { useState } from 'react';
import { Form, DatePicker, InputNumber, Button, Divider, Row, Col, Card, Typography, message, Steps, Result } from 'antd';
import { CheckCircleOutlined, CreditCardOutlined, UserOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { createBooking } from '../lib/bookingService';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Step } = Steps;

interface BookingFormProps {
  roomId: number | string;
  roomName: string;
  roomType: string;
  pricePerNight: number;
  maxGuests: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface BookingDetails {
  checkIn: Dayjs | null;
  checkOut: Dayjs | null;
  guests: number;
  totalNights: number;
  totalPrice: number;
}

const BookingForm: React.FC<BookingFormProps> = ({
  roomId,
  roomName,
  roomType,
  pricePerNight,
  maxGuests,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    checkIn: null,
    checkOut: null,
    guests: 1,
    totalNights: 0,
    totalPrice: 0
  });
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      setBookingDetails(prev => ({
        ...prev,
        checkIn: null,
        checkOut: null,
        totalNights: 0,
        totalPrice: 0
      }));
      return;
    }

    const [checkIn, checkOut] = dates;
    const totalNights = checkOut.diff(checkIn, 'day');
    const totalPrice = totalNights * pricePerNight;

    setBookingDetails(prev => ({
      ...prev,
      checkIn,
      checkOut,
      totalNights,
      totalPrice
    }));
  };

  const handleGuestsChange = (guests: number | null) => {
    setBookingDetails(prev => ({
      ...prev,
      guests: guests || 1
    }));
  };

  const handleDetailsSubmit = () => {
    form.validateFields().then(() => {
      setCurrentStep(1);
    });
  };

  const handlePaymentSubmit = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required. Please login again.');
        return;
      }
      
      if (!bookingDetails.checkIn || !bookingDetails.checkOut) {
        message.error('Please select valid dates');
        setLoading(false);
        return;
      }
      
      // Display loading message
      message.loading({ content: 'Creating your booking...', key: 'bookingMessage' });
      
      // Prepare booking data
      const bookingData = {
        room_id: roomId,
        check_in: bookingDetails.checkIn.format('YYYY-MM-DD'),
        check_out: bookingDetails.checkOut.format('YYYY-MM-DD'),
        guests: bookingDetails.guests,
        total_price: bookingDetails.totalPrice,
        payment_method: 'Pay on Arrival',
        special_requests: ''
      };
      
      console.log('Sending booking data:', bookingData);
      
      // Call the API to create the booking
      const response = await createBooking(bookingData, token);
      console.log('Booking created successfully:', response);
      
      // Success message
      message.success({ content: 'Booking created successfully!', key: 'bookingMessage', duration: 2 });
      
      setBookingId(response.booking_id);
      setCurrentStep(2);
      
      // Notify parent component of success
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      
      // Show a more descriptive error message
      let errorMessage = 'Failed to create booking. Please try again.';
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        
        if (status === 404) {
          errorMessage = 'Booking service is currently unavailable. Please try again later.';
        } else if (status === 400) {
          errorMessage = error.response?.data?.message || 'Invalid booking information. Please check your details.';
        } else if (status === 401 || status === 403) {
          errorMessage = 'Authentication error. Please log in again.';
        } else if (status === 500) {
          errorMessage = 'Server error. Our team has been notified.';
        }
        
        console.error('API Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      
      message.error({ content: errorMessage, key: 'bookingMessage', duration: 4 });
    } finally {
      setLoading(false);
    }
  };

  const renderBookingDetails = () => (
    <Form form={form} layout="vertical" requiredMark={false}>
      <Form.Item
        name="dates"
        label="Check-in and Check-out Dates"
        rules={[{ required: true, message: 'Please select your check-in and check-out dates' }]}
      >
        <RangePicker
          className="w-full"
          format="YYYY-MM-DD"
          disabledDate={date => date.isBefore(dayjs().startOf('day'))}
          onChange={handleDateChange}
        />
      </Form.Item>
      
      <Form.Item
        name="guests"
        label="Number of Guests"
        rules={[{ required: true, message: 'Please enter number of guests' }]}
        initialValue={1}
      >
        <InputNumber
          min={1}
          max={maxGuests}
          className="w-full"
          onChange={handleGuestsChange}
        />
      </Form.Item>
      
      <Divider />
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <Text>Room Type</Text>
          <Text strong>{roomType}</Text>
        </div>
        
        {bookingDetails.totalNights > 0 && (
          <>
            <div className="flex justify-between">
              <Text>Price per Night</Text>
              <Text strong>₱{pricePerNight.toLocaleString()}</Text>
            </div>
            
            <div className="flex justify-between">
              <Text>Duration</Text>
              <Text strong>{bookingDetails.totalNights} night{bookingDetails.totalNights > 1 ? 's' : ''}</Text>
            </div>
            
            <Divider className="my-2" />
            
            <div className="flex justify-between">
              <Text strong>Total Price</Text>
              <Text strong className="text-lg">₱{bookingDetails.totalPrice.toLocaleString()}</Text>
            </div>
          </>
        )}
      </div>
      
      <Button
        type="primary"
        size="large"
        className="w-full mt-6 bg-[#2C1810] hover:bg-[#3D2317]"
        onClick={handleDetailsSubmit}
        style={{ marginTop: '1em' }}
        disabled={!bookingDetails.checkIn || !bookingDetails.checkOut}
      >
        Continue to Payment
      </Button>
      
      <div className="text-center mt-3">
        <Text type="secondary">
          You won't be charged yet
        </Text>
      </div>
    </Form>
  );

  const renderPaymentDetails = () => (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <Title level={5}>Booking Summary</Title>
        <Divider />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Text>Room</Text>
            <Text strong>{roomName}</Text>
          </div>
          <div className="flex justify-between">
            <Text>Check-in</Text>
            <Text strong>{bookingDetails.checkIn?.format('MMMM D, YYYY')}</Text>
          </div>
          <div className="flex justify-between">
            <Text>Check-out</Text>
            <Text strong>{bookingDetails.checkOut?.format('MMMM D, YYYY')}</Text>
          </div>
          <div className="flex justify-between">
            <Text>Guests</Text>
            <Text strong>{bookingDetails.guests}</Text>
          </div>
          <div className="flex justify-between">
            <Text>Total</Text>
            <Text strong className="text-lg">₱{bookingDetails.totalPrice.toLocaleString()}</Text>
          </div>
        </div>
      </Card>
      
      <Card className="shadow-sm">
        <Title level={5}>Payment Method</Title>
        <Divider />
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card className="border-2 border-[#D4AF37]">
              <div className="flex items-center gap-3">
                <CreditCardOutlined className="text-xl text-[#D4AF37]" />
                <div>
                  <Text strong className="block">Pay on Arrival</Text>
                  <Text type="secondary">Secure your booking now and pay when you arrive</Text>
                </div>
                <CheckCircleOutlined className="text-[#D4AF37] ml-auto" />
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
      
      <Row gutter={16} style={{ marginTop: '1em' }}>
        <Col span={12}>
          <Button 
            size="large" 
            block 
            onClick={() => setCurrentStep(0)}
          >
            Back
          </Button>
        </Col>
        <Col span={12}>
          <Button
            type="primary"
            size="large"
            block
            className="bg-[#2C1810] hover:bg-[#3D2317]"
            onClick={handlePaymentSubmit}
            loading={loading}
          >
            Confirm Booking
          </Button>
        </Col>
      </Row>
    </div>
  );

  const renderConfirmation = () => (
    <Result
      status="success"
      title="Booking Confirmed!"
      subTitle={`Booking ID: ${bookingId}. Your reservation has been successfully confirmed.`}
      extra={[
        <Button 
          type="primary" 
          key="view-booking" 
          className="bg-[#2C1810] hover:bg-[#3D2317]"
          onClick={() => window.location.href = '/user/bookings'}
        >
          View My Bookings
        </Button>,
        <Button 
          key="dashboard" 
          onClick={() => window.location.href = '/user/dashboard'}
        >
          Back to Dashboard
        </Button>,
      ]}
    />
  );

  return (
    <div className="space-y-6">
      <Steps
        current={currentStep}
        items={[
          {
            title: 'Details',
            icon: <UserOutlined />
          },
          {
            title: 'Payment',
            icon: <CreditCardOutlined />
          },
          {
            title: 'Confirmation',
            icon: <CheckCircleOutlined />
          }
        ]}
      />
      
      <div className="mt-8">
        {currentStep === 0 && renderBookingDetails()}
        {currentStep === 1 && renderPaymentDetails()}
        {currentStep === 2 && renderConfirmation()}
      </div>
    </div>
  );
};

export default BookingForm; 