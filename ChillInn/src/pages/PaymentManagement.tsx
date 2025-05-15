import React, { useState, useEffect } from 'react';
import { Layout, Typography, Modal, Card, Row, Col, Statistic, Select, Image, Descriptions, Button, Badge, Alert, message } from 'antd';
import { 
  DownloadOutlined, 
  FilePdfOutlined, 
  FileExcelOutlined, 
  CreditCardOutlined,
  PrinterOutlined,
  PieChartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import AppLayout from '../components/AppLayout';
import PageTransition from '../components/PageTransition';
import AdminPaymentsTable from '../components/AdminPaymentsTable';
import PaymentForm from '../components/PaymentForm';
import { Payment, PaymentMethod, PaymentStatus } from '../utils/types';
import { getPaymentStatistics, updatePayment } from '../lib/paymentService';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

interface PaymentStats {
  total_amount: number;
  total_payments: number;
  payment_methods: { method: string; count: number; amount: number }[];
  daily_totals: { date: string; amount: number; count: number }[];
}

const PaymentManagement: React.FC = () => {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [statsPeriod]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const data = await getPaymentStatistics(token, statsPeriod);
      setStats(data);
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      message.error('Failed to load payment statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsEditModalVisible(true);
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailsModalVisible(true);
  };

  const handleViewReceipt = (payment: Payment) => {
    if (!payment.receipt_url) return;
    setSelectedPayment(payment);
    setIsReceiptModalVisible(true);
  };

  const handleUpdatePayment = async (updatedPayment: Payment) => {
    if (!selectedPayment) return;
    
    setUpdatingPayment(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }
      
      await updatePayment(selectedPayment.payment_id, updatedPayment, token);
      message.success('Payment updated successfully');
      setIsEditModalVisible(false);
      
      // Refresh stats after updating payment
      fetchStats();
    } catch (error) {
      console.error('Error updating payment:', error);
      message.error('Failed to update payment');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      currencyDisplay: 'symbol'
    }).format(value).replace('PHP', '₱');
  };

  const getStatusColor = (status?: PaymentStatus) => {
    if (!status) return 'blue';
    
    const colors = {
      [PaymentStatus.COMPLETED]: 'green',
      [PaymentStatus.PENDING]: 'orange',
      [PaymentStatus.FAILED]: 'red',
      [PaymentStatus.REFUNDED]: 'volcano'
    };
    return colors[status] || 'blue';
  };

  return (
    <AppLayout userRole="admin">
      <PageTransition>
        <Content className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Title className="text-2xl text-[#D4AF37]">₱</Title>
              <Title level={3} className="m-0">Payment Management</Title>
            </div>
            
            {/* Information alert about booking status */}
            <Alert
              message="Payment Status Information"
              description="Recording a payment for a booking with 'Pending' status will automatically update the booking status to 'Confirmed'. This helps streamline the booking confirmation process."
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              className="mb-6"
              closable
            />
            
            {/* Stats Cards */}
            <div className="mb-6">
              <Card className="shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <Title level={4} className="m-0">Payment Overview</Title>
                  <Select 
                    defaultValue="month" 
                    style={{ width: 120 }}
                    onChange={(value: any) => setStatsPeriod(value)}
                  >
                    <Option value="day">Today</Option>
                    <Option value="week">This Week</Option>
                    <Option value="month">This Month</Option>
                    <Option value="year">This Year</Option>
                  </Select>
                </div>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}>
                    <Statistic
                      title="Total Payments"
                      value={stats?.total_amount || 0}
                      precision={2}
                      loading={loadingStats}
                      prefix="₱"
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Statistic
                      title="Number of Payments"
                      value={stats?.total_payments || 0}
                      loading={loadingStats}
                      prefix={<CreditCardOutlined />}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Statistic
                      title="Top Payment Method"
                      value={stats?.payment_methods?.[0]?.method || 'N/A'}
                      loading={loadingStats}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
              </Card>
            </div>
            
            {/* Main Payment Table */}
            <AdminPaymentsTable 
              onEdit={handleEditPayment}
              onViewDetails={handleViewDetails}
              onViewReceipt={handleViewReceipt}
            />

            {/* Payment Details Modal */}
            <Modal
              title="Payment Details"
              open={isDetailsModalVisible}
              onCancel={() => setIsDetailsModalVisible(false)}
              footer={[
                <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()} className="text-black">
                  Print
                </Button>,
                <Button key="close" onClick={() => setIsDetailsModalVisible(false)} className="text-black">
                  Close
                </Button>
              ]}
              width={600}
            >
              {selectedPayment && (
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Payment ID">{selectedPayment.payment_id}</Descriptions.Item>
                  <Descriptions.Item label="Booking ID">{selectedPayment.booking_id}</Descriptions.Item>
                  <Descriptions.Item label="Amount">{formatCurrency(selectedPayment.amount)}</Descriptions.Item>
                  <Descriptions.Item label="Payment Method">{selectedPayment.method}</Descriptions.Item>
                  <Descriptions.Item label="Date">{dayjs(selectedPayment.payment_date).format('MMMM D, YYYY h:mm A')}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Badge status={getStatusColor(selectedPayment.status) as any} text={selectedPayment.status || 'Completed'} />
                  </Descriptions.Item>
                  {selectedPayment.transaction_id && (
                    <Descriptions.Item label="Transaction ID">{selectedPayment.transaction_id}</Descriptions.Item>
                  )}
                  {selectedPayment.notes && (
                    <Descriptions.Item label="Notes">{selectedPayment.notes}</Descriptions.Item>
                  )}
                  {selectedPayment.is_deposit !== undefined && (
                    <Descriptions.Item label="Type">{selectedPayment.is_deposit ? 'Deposit' : 'Full Payment'}</Descriptions.Item>
                  )}
                </Descriptions>
              )}
            </Modal>

            {/* Receipt Modal */}
            <Modal
              title="Payment Receipt"
              open={isReceiptModalVisible}
              onCancel={() => setIsReceiptModalVisible(false)}
              footer={[
                <Button key="download" icon={<DownloadOutlined />} type="primary" className="text-white">
                  Download
                </Button>,
                <Button key="close" onClick={() => setIsReceiptModalVisible(false)} className="text-black">
                  Close
                </Button>
              ]}
            >
              {selectedPayment?.receipt_url && (
                <div className="flex justify-center">
                  <Image 
                    src={selectedPayment.receipt_url}
                    alt="Payment Receipt"
                    style={{ maxHeight: '70vh' }}
                  />
                </div>
              )}
            </Modal>

            {/* Edit Payment Modal */}
            <Modal
              title="Edit Payment"
              open={isEditModalVisible}
              onCancel={() => setIsEditModalVisible(false)}
              footer={null}
              width={600}
              destroyOnClose
            >
              {selectedPayment && (
                <PaymentForm 
                  bookingId={selectedPayment.booking_id}
                  totalPrice={selectedPayment.amount} // Use the current amount as the total
                  remainingBalance={selectedPayment.amount} // Allow editing the full amount
                  onSuccess={(updatedPayment) => {
                    handleUpdatePayment(updatedPayment);
                    setIsEditModalVisible(false);
                  }}
                  onCancel={() => setIsEditModalVisible(false)}
                  isEditing={true}
                  initialValues={{
                    amount: selectedPayment.amount,
                    method: selectedPayment.method,
                    transaction_id: selectedPayment.transaction_id || '',
                    notes: selectedPayment.notes || '',
                    is_deposit: selectedPayment.is_deposit || false
                  }}
                />
              )}
            </Modal>
          </div>
        </Content>
      </PageTransition>
    </AppLayout>
  );
};

export default PaymentManagement; 