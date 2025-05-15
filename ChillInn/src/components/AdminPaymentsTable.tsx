import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Typography, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  message, 
  Input, 
  Select,
  DatePicker,
  Tooltip,
  InputNumber,
  Popover
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  EyeOutlined,
  DollarOutlined as PesoOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { Payment, PaymentMethod, PaymentStatus } from '../utils/types';
import { getPayments, deletePayment } from '../lib/paymentService';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface AdminPaymentsTableProps {
  onEdit: (payment: Payment) => void;
  onViewDetails: (payment: Payment) => void;
  onViewReceipt?: (payment: Payment) => void;
}

const AdminPaymentsTable: React.FC<AdminPaymentsTableProps> = ({ 
  onEdit, 
  onViewDetails,
  onViewReceipt
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    method: undefined as string | undefined,
    status: undefined as PaymentStatus | undefined,
    min_amount: undefined as number | undefined,
    max_amount: undefined as number | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
  });
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      const options = {
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
        ...filters,
        search: searchText
      };

      const response = await getPayments(token, options);
      setPayments(response.payments);
      setPagination({
        ...pagination,
        total: response.totalCount
      });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      message.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination: any) => {
    setPagination({
      ...pagination,
      current: pagination.current
    });
  };

  const showDeleteConfirm = (paymentId: number, amount: number) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this payment?',
      icon: <ExclamationCircleOutlined />,
      content: `You are about to delete payment of ₱${amount.toFixed(2)}. This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        return handleDeletePayment(paymentId);
      }
    });
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      await deletePayment(paymentId, token);
      message.success('Payment deleted successfully');
      
      // Remove the deleted payment from the local state
      setPayments(payments.filter(payment => payment.payment_id !== paymentId));
      setPagination({
        ...pagination,
        total: pagination.total - 1
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      message.error('Failed to delete payment. It may be referenced by a booking record.');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
    fetchPayments();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, current: 1 });
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilters({
        ...filters,
        start_date: dates[0].format('YYYY-MM-DD'),
        end_date: dates[1].format('YYYY-MM-DD')
      });
      setPagination({ ...pagination, current: 1 });
    } else {
      setFilters({
        ...filters,
        start_date: undefined,
        end_date: undefined
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      method: undefined,
      status: undefined,
      min_amount: undefined,
      max_amount: undefined,
      start_date: undefined,
      end_date: undefined
    });
    setSearchText('');
    setPagination({ ...pagination, current: 1 });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      currencyDisplay: 'symbol'
    }).format(amount).replace('PHP', '₱');
  };

  const getStatusColor = (status: PaymentStatus) => {
    const colors = {
      [PaymentStatus.COMPLETED]: 'green',
      [PaymentStatus.PENDING]: 'orange',
      [PaymentStatus.FAILED]: 'red',
      [PaymentStatus.REFUNDED]: 'volcano'
    };
    return colors[status] || 'blue';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'payment_id',
      key: 'payment_id',
      width: 70,
      render: (id: number) => <Text>{id}</Text>
    },
    {
      title: 'Booking ID',
      dataIndex: 'booking_id',
      key: 'booking_id',
      width: 100,
      render: (id: number) => <Text className="cursor-pointer underline" onClick={() => {}}>{id}</Text>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a: Payment, b: Payment) => a.amount - b.amount,
      render: (amount: number) => (
        <Text strong className="text-green-600">
          {formatCurrency(amount)}
        </Text>
      )
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => <Tag>{method}</Tag>
    },
    {
      title: 'Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      sorter: (a: Payment, b: Payment) => 
        dayjs(a.payment_date).valueOf() - dayjs(b.payment_date).valueOf(),
      render: (date: string) => 
        <Text>{dayjs(date).format('MMM D, YYYY h:mm A')}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: PaymentStatus) => (
        status ? <Tag color={getStatusColor(status)}>{status}</Tag> : <Tag color="blue">Completed</Tag>
      )
    },
    {
      title: 'Receipt',
      key: 'receipt',
      width: 80,
      render: (_: any, record: Payment) => (
        record.receipt_url ? (
          <Button 
            icon={<EyeOutlined />} 
            size="small" 
            onClick={() => onViewReceipt && onViewReceipt(record)}
            type="text"
          />
        ) : <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: any, record: Payment) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => onViewDetails(record)} 
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              onClick={() => onEdit(record)} 
              size="small"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => showDeleteConfirm(record.payment_id, record.amount)} 
              size="small"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-payments-table">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1">
          <Button 
            type="primary" 
            icon={<PesoOutlined />}
            onClick={() => {}}
            className="bg-[#2C1810] hover:bg-[#3D2317] text-white"
          >
            Generate Payment Report
          </Button>
        </div>
        
        <div className="filters flex flex-wrap gap-3">
          <Select
            placeholder="Payment Method"
            style={{ width: 160 }}
            allowClear
            onChange={(value) => handleFilterChange('method', value)}
            value={filters.method}
          >
            {Object.values(PaymentMethod).map(method => (
              <Option key={method} value={method}>{method}</Option>
            ))}
          </Select>
          
          <Select
            placeholder="Payment Status"
            style={{ width: 140 }}
            allowClear
            onChange={(value) => handleFilterChange('status', value)}
            value={filters.status}
          >
            {Object.values(PaymentStatus).map(status => (
              <Option key={status} value={status}>{status}</Option>
            ))}
          </Select>
          
          <div className="flex items-center gap-2">
            <InputNumber
              placeholder="Min"
              style={{ width: 100 }}
              min={0}
              precision={2}
              onChange={(value) => handleFilterChange('min_amount', value)}
              value={filters.min_amount}
              addonBefore="₱"
              controls={false}
            />
            <span>-</span>
            <InputNumber
              placeholder="Max"
              style={{ width: 100 }}
              min={0}
              precision={2}
              onChange={(value) => handleFilterChange('max_amount', value)}
              value={filters.max_amount}
              addonBefore="₱"
              controls={false}
            />
          </div>
          
          <RangePicker
            placeholder={['Start Date', 'End Date']}
            style={{ width: 240 }}
            onChange={handleDateRangeChange}
            allowClear
            value={
              filters.start_date && filters.end_date
                ? [dayjs(filters.start_date), dayjs(filters.end_date)]
                : undefined
            }
          />
          
          <Search
            placeholder="Search payments..."
            onSearch={handleSearch}
            style={{ width: 220 }}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          
          <Button 
            icon={<FilterOutlined />} 
            onClick={resetFilters}
            type="default"
          >
            Reset
          </Button>
        </div>
      </div>
      
      <Table
        columns={columns}
        dataSource={payments}
        rowKey="payment_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} payments`
        }}
        onChange={handleTableChange}
        className="shadow-sm"
      />
    </div>
  );
};

export default AdminPaymentsTable; 