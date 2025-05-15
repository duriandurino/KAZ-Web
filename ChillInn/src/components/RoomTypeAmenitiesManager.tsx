import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table,
  Button, 
  Space, 
  Tag, 
  Modal, 
  message, 
  Form,
  Select,
  Tooltip,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
  CoffeeOutlined,
  DesktopOutlined,
  SafetyOutlined,
  CarOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Amenity } from '../utils/types';
import { getAmenities } from '../lib/amenityService';

const { Title, Text } = Typography;
const { Option } = Select;

// Map of amenity names to icons for display
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

// Get icon for amenity or default to CheckCircleOutlined
const getAmenityIcon = (amenityName: string) => {
  const normalizedName = Object.keys(amenityIcons).find(key => 
    amenityName.toLowerCase().includes(key.toLowerCase())
  );
  
  return normalizedName ? amenityIcons[normalizedName] : <CheckCircleOutlined />;
};

interface RoomTypeAmenitiesManagerProps {
  roomTypeId: string | number;
  amenities?: Amenity[];
  onAddAmenity: (amenityId: string | number) => Promise<void>;
  onRemoveAmenity: (amenityId: string | number) => Promise<void>;
}

const RoomTypeAmenitiesManager: React.FC<RoomTypeAmenitiesManagerProps> = ({
  roomTypeId,
  amenities = [],
  onAddAmenity,
  onRemoveAmenity
}) => {
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all available amenities
  useEffect(() => {
    fetchAmenities();
  }, []);

  const fetchAmenities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      const response = await getAmenities(token, { is_active: true });
      setAllAmenities(response.amenities);
    } catch (error) {
      console.error('Error fetching amenities:', error);
      message.error('Failed to load amenities');
    } finally {
      setLoading(false);
    }
  };

  // Get amenities not already assigned to this room type
  const getAvailableAmenities = () => {
    const assignedAmenityIds = amenities.map(a => a.amenity_id.toString());
    return allAmenities.filter(amenity => !assignedAmenityIds.includes(amenity.amenity_id.toString()));
  };

  const handleOpenModal = () => {
    setSelectedAmenity(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAmenity(null);
  };

  const handleSaveAmenity = async () => {
    try {
      if (selectedAmenity) {
        await onAddAmenity(selectedAmenity);
        message.success('Amenity added to room type successfully');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving amenity:', error);
      message.error('Failed to add amenity to room type');
    }
  };

  const handleRemoveAmenity = (amenityId: string | number) => {
    Modal.confirm({
      title: 'Are you sure you want to remove this amenity?',
      icon: <ExclamationCircleOutlined />,
      content: 'This will remove the amenity from this room type.',
      onOk: async () => {
        try {
          await onRemoveAmenity(amenityId);
          message.success('Amenity removed from room type successfully');
        } catch (error) {
          console.error('Error removing amenity:', error);
          message.error('Failed to remove amenity from room type');
        }
      }
    });
  };

  // Table columns
  const columns = [
    {
      title: 'Icon',
      key: 'icon',
      width: 60,
      render: (_: unknown, record: Amenity) => (
        <span className="text-xl text-[#D4AF37]">
          {getAmenityIcon(record.name)}
        </span>
      )
    },
    {
      title: 'Amenity',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Amenity) => (
        <div>
          <Text strong>{text}</Text>
          <div>
            <Text type="secondary">{record.description}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category || 'General'}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Amenity) => (
        <Space>
          <Tooltip title="Remove">
            <Button 
              danger
              icon={<DeleteOutlined />} 
              size="small"
              onClick={() => handleRemoveAmenity(record.amenity_id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card className="room-type-amenities">
      <div className="flex justify-between items-center mb-4">
        <Title level={4}>Room Type Amenities</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleOpenModal}
          disabled={getAvailableAmenities().length === 0}
          className="bg-[#2C1810] hover:bg-[#3D2317]"
        >
          Add Amenity
        </Button>
      </div>

      {amenities.length > 0 ? (
        <Table 
          columns={columns} 
          dataSource={amenities} 
          rowKey={(record) => record.amenity_id.toString()}
          pagination={false}
        />
      ) : (
        <Empty description="No amenities assigned to this room type" />
      )}

      {/* Modal for adding amenities */}
      <Modal
        title="Add Amenity to Room Type"
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSaveAmenity}
        okButtonProps={{ 
          disabled: !selectedAmenity,
          className: "bg-[#2C1810] hover:bg-[#3D2317]"
        }}
      >
        <Form layout="vertical">
          <Form.Item label="Select Amenity" required>
            <Select
              placeholder="Select an amenity"
              value={selectedAmenity}
              onChange={setSelectedAmenity}
              style={{ width: '100%' }}
            >
              {getAvailableAmenities().map(amenity => (
                <Option key={amenity.amenity_id} value={amenity.amenity_id}>
                  <Space>
                    <span>{getAmenityIcon(amenity.name)}</span>
                    <span>{amenity.name}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default RoomTypeAmenitiesManager; 