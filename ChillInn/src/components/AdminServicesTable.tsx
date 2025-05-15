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
  Switch,
  Tooltip,
  InputNumber
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Service, ServiceCategory } from '../utils/types';
import { getServices, deleteService, toggleServiceStatus } from '../lib/serviceService';
import { getIconByName } from '../utils/iconMapping';

const { Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface AdminServicesTableProps {
  onEdit: (service: Service) => void;
  onAdd: () => void;
}

const AdminServicesTable: React.FC<AdminServicesTableProps> = ({ onEdit, onAdd }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    is_active: undefined as boolean | undefined,
    min_price: undefined as number | undefined,
    max_price: undefined as number | undefined
  });
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchServices();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchServices = async () => {
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

      const response = await getServices(token, options);
      setServices(response.services);
      setPagination({
        ...pagination,
        total: response.totalCount
      });
    } catch (error: any) {
      console.error('Error fetching services:', error);
      message.error('Failed to load services');
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

  const handleStatusChange = async (serviceId: number, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      await toggleServiceStatus(serviceId, isActive, token);
      message.success(`Service ${isActive ? 'activated' : 'deactivated'} successfully`);
      
      // Update the local state to reflect the change
      setServices(services.map(service => 
        service.service_id === serviceId 
          ? { ...service, is_active: isActive } 
          : service
      ));
    } catch (error) {
      console.error('Error updating service status:', error);
      message.error(`Failed to ${isActive ? 'activate' : 'deactivate'} service`);
    }
  };

  const showDeleteConfirm = (serviceId: number, serviceName: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this service?',
      icon: <ExclamationCircleOutlined />,
      content: `You are about to delete "${serviceName}". This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        return handleDeleteService(serviceId);
      }
    });
  };

  const handleDeleteService = async (serviceId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      await deleteService(serviceId, token);
      message.success('Service deleted successfully');
      
      // Remove the deleted service from the local state
      setServices(services.filter(service => service.service_id !== serviceId));
      setPagination({
        ...pagination,
        total: pagination.total - 1
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      message.error('Failed to delete service. It may be in use by active bookings.');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
    fetchServices();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, current: 1 });
  };

  const resetFilters = () => {
    setFilters({
      category: undefined,
      is_active: undefined,
      min_price: undefined,
      max_price: undefined
    });
    setSearchText('');
    setPagination({ ...pagination, current: 1 });
  };

  const columns = [
    {
      title: 'Icon',
      dataIndex: 'icon_name',
      key: 'icon_name',
      width: 60,
      render: (iconName: string) => (
        <div className="text-xl text-[#D4AF37]">
          {getIconByName(iconName)}
        </div>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
          {text}
        </Paragraph>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a: Service, b: Service) => a.price - b.price,
      render: (price: number) => (
        <div className="flex items-center">
          <DollarOutlined className="mr-1 text-green-600" />
          <Text>{price.toFixed(2)}</Text>
        </div>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      sorter: (a: Service, b: Service) => a.duration - b.duration,
      render: (duration: number) => (
        <div className="flex items-center">
          <ClockCircleOutlined className="mr-1 text-blue-600" />
          <Text>{duration} min</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: Service) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleStatusChange(record.service_id, checked)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Service) => (
        <Space size="small">
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
              onClick={() => showDeleteConfirm(record.service_id, record.name)} 
              size="small"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-services-table">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1">
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={onAdd}
            className="bg-[#2C1810] hover:bg-[#3D2317]"
          >
            Add New Service
          </Button>
        </div>
        
        <div className="filters flex flex-wrap gap-3">
          <Select
            placeholder="Filter by Category"
            style={{ width: 180 }}
            allowClear
            onChange={(value) => handleFilterChange('category', value)}
            value={filters.category}
          >
            {Object.values(ServiceCategory).map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
          
          <Select
            placeholder="Filter by Status"
            style={{ width: 140 }}
            allowClear
            onChange={(value) => handleFilterChange('is_active', value)}
            value={filters.is_active}
          >
            <Option value={true}>Active</Option>
            <Option value={false}>Inactive</Option>
          </Select>
          
          <div className="flex items-center gap-2">
            <InputNumber
              placeholder="Min $"
              style={{ width: 100 }}
              min={0}
              precision={2}
              onChange={(value) => handleFilterChange('min_price', value)}
              value={filters.min_price}
              addonBefore="$"
              controls={false}
            />
            <span>-</span>
            <InputNumber
              placeholder="Max $"
              style={{ width: 100 }}
              min={0}
              precision={2}
              onChange={(value) => handleFilterChange('max_price', value)}
              value={filters.max_price}
              addonBefore="$"
              controls={false}
            />
          </div>
          
          <Search
            placeholder="Search services..."
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
        dataSource={services}
        rowKey="service_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} services`
        }}
        onChange={handleTableChange}
        className="shadow-sm"
      />
    </div>
  );
};

export default AdminServicesTable; 