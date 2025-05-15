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
  Tooltip
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { Amenity, AmenityCategory } from '../utils/types';
import { getAmenities, deleteAmenity, toggleAmenityStatus } from '../lib/amenityService';
import { getIconByName } from '../utils/iconMapping';

const { Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface AdminAmenitiesTableProps {
  onEdit: (amenity: Amenity) => void;
  onAdd: () => void;
}

const AdminAmenitiesTable: React.FC<AdminAmenitiesTableProps> = ({ onEdit, onAdd }) => {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    is_active: undefined as boolean | undefined
  });
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchAmenities();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchAmenities = async () => {
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

      const response = await getAmenities(token, options);
      setAmenities(response.amenities);
      setPagination({
        ...pagination,
        total: response.totalCount
      });
    } catch (error: any) {
      console.error('Error fetching amenities:', error);
      message.error('Failed to load amenities');
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

  const handleStatusChange = async (amenityId: number, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      await toggleAmenityStatus(amenityId, isActive, token);
      message.success(`Amenity ${isActive ? 'activated' : 'deactivated'} successfully`);
      
      // Update the local state to reflect the change
      setAmenities(amenities.map(amenity => 
        amenity.amenity_id === amenityId 
          ? { ...amenity, is_active: isActive } 
          : amenity
      ));
    } catch (error) {
      console.error('Error updating amenity status:', error);
      message.error(`Failed to ${isActive ? 'activate' : 'deactivate'} amenity`);
    }
  };

  const showDeleteConfirm = (amenityId: number, amenityName: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this amenity?',
      icon: <ExclamationCircleOutlined />,
      content: `You are about to delete "${amenityName}". This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        return handleDeleteAmenity(amenityId);
      }
    });
  };

  const handleDeleteAmenity = async (amenityId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      await deleteAmenity(amenityId, token);
      message.success('Amenity deleted successfully');
      
      // Remove the deleted amenity from the local state
      setAmenities(amenities.filter(amenity => amenity.amenity_id !== amenityId));
      setPagination({
        ...pagination,
        total: pagination.total - 1
      });
    } catch (error) {
      console.error('Error deleting amenity:', error);
      message.error('Failed to delete amenity. It may be in use by room types.');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
    fetchAmenities();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
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
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive: boolean, record: Amenity) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleStatusChange(record.amenity_id, checked)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Amenity) => (
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
              onClick={() => showDeleteConfirm(record.amenity_id, record.name)} 
              size="small"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-amenities-table">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1">
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={onAdd}
            className="bg-[#2C1810] hover:bg-[#3D2317]"
          >
            Add New Amenity
          </Button>
        </div>
        
        <div className="filters flex flex-wrap gap-3">
          <Select
            placeholder="Filter by Category"
            style={{ width: 160 }}
            allowClear
            onChange={(value) => handleFilterChange('category', value)}
          >
            {Object.values(AmenityCategory).map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
          
          <Select
            placeholder="Filter by Status"
            style={{ width: 140 }}
            allowClear
            onChange={(value) => handleFilterChange('is_active', value)}
          >
            <Option value={true}>Active</Option>
            <Option value={false}>Inactive</Option>
          </Select>
          
          <Search
            placeholder="Search amenities..."
            onSearch={handleSearch}
            style={{ width: 220 }}
            allowClear
          />
        </div>
      </div>
      
      <Table
        columns={columns}
        dataSource={amenities}
        rowKey="amenity_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} amenities`
        }}
        onChange={handleTableChange}
        className="shadow-sm"
      />
    </div>
  );
};

export default AdminAmenitiesTable; 