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
  Switch,
  InputNumber,
  Tooltip,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { Service, RoomService } from '../utils/types';
import { getServices } from '../lib/serviceService';

const { Title, Text } = Typography;
const { Option } = Select;

interface RoomTypeServicesManagerProps {
  roomTypeId: string | number;
  services?: RoomService[];
  onAddService: (serviceId: string | number, included: boolean, discountPercentage: number) => Promise<void>;
  onUpdateService: (serviceId: string | number, included: boolean, discountPercentage: number) => Promise<void>;
  onRemoveService: (serviceId: string | number) => Promise<void>;
}

const RoomTypeServicesManager: React.FC<RoomTypeServicesManagerProps> = ({
  roomTypeId,
  services = [],
  onAddService,
  onUpdateService,
  onRemoveService
}) => {
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [included, setIncluded] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | number | null>(null);

  // Fetch all available services
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      const response = await getServices(token, { is_active: true });
      setAllServices(response.services);
    } catch (error) {
      console.error('Error fetching services:', error);
      message.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  // Get services not already assigned to this room type
  const getAvailableServices = () => {
    const assignedServiceIds = services.map(s => s.service.service_id.toString());
    return allServices.filter(service => !assignedServiceIds.includes(service.service_id.toString()));
  };

  const handleOpenModal = (isEdit = false, serviceInfo?: RoomService) => {
    setIsEditing(isEdit);
    if (isEdit && serviceInfo) {
      setEditingServiceId(serviceInfo.service.service_id);
      setIncluded(serviceInfo.included);
      setDiscountPercentage(serviceInfo.discount_percentage);
    } else {
      setSelectedService(null);
      setIncluded(false);
      setDiscountPercentage(0);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setIncluded(false);
    setDiscountPercentage(0);
    setIsEditing(false);
    setEditingServiceId(null);
  };

  const handleSaveService = async () => {
    try {
      if (isEditing && editingServiceId) {
        await onUpdateService(editingServiceId, included, discountPercentage);
        message.success('Service updated successfully');
      } else if (selectedService) {
        await onAddService(selectedService, included, discountPercentage);
        message.success('Service added successfully');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving service:', error);
      message.error('Failed to save service');
    }
  };

  const handleRemoveService = (serviceId: string | number) => {
    Modal.confirm({
      title: 'Are you sure you want to remove this service?',
      icon: <ExclamationCircleOutlined />,
      content: 'This will remove the service from this room type.',
      onOk: async () => {
        try {
          await onRemoveService(serviceId);
          message.success('Service removed successfully');
        } catch (error) {
          console.error('Error removing service:', error);
          message.error('Failed to remove service');
        }
      }
    });
  };

  const onIncludedChange = (checked: boolean) => {
    setIncluded(checked);
    // If service is included, reset discount to 0
    if (checked) {
      setDiscountPercentage(0);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Service',
      dataIndex: ['service', 'name'],
      key: 'name',
      render: (text: string, record: RoomService) => (
        <div>
          <Text strong>{text}</Text>
          <div>
            <Text type="secondary">{record.service.description}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Base Price',
      dataIndex: ['service', 'price'],
      key: 'price',
      render: (price: number) => (
        <Text>₱{price.toFixed(2)}</Text>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: RoomService) => (
        <Space>
          {record.included ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>Included</Tag>
          ) : record.discount_percentage > 0 ? (
            <Tag color="orange" icon={<PercentageOutlined />}>{record.discount_percentage}% Discount</Tag>
          ) : (
            <Tag color="default">Standard Price</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Final Price',
      key: 'finalPrice',
      render: (_, record: RoomService) => {
        if (record.included) {
          return <Tag color="green">Included in room price</Tag>;
        } else if (record.discount_percentage > 0) {
          const discountedPrice = record.service.price * (1 - record.discount_percentage / 100);
          return (
            <Space>
              <Text type="secondary" delete>₱{record.service.price.toFixed(2)}</Text>
              <Text strong className="text-[#D4AF37]">₱{discountedPrice.toFixed(2)}</Text>
            </Space>
          );
        } else {
          return <Text>₱{record.service.price.toFixed(2)}</Text>;
        }
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: RoomService) => (
        <Space>
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleOpenModal(true, record)}
            />
          </Tooltip>
          <Tooltip title="Remove">
            <Button 
              danger
              icon={<DeleteOutlined />} 
              size="small"
              onClick={() => handleRemoveService(record.service.service_id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card className="room-type-services">
      <div className="flex justify-between items-center mb-4">
        <Title level={4}>Room Type Services</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleOpenModal()}
          disabled={getAvailableServices().length === 0}
          className="bg-[#2C1810] hover:bg-[#3D2317]"
        >
          Assign Service
        </Button>
      </div>

      {services.length > 0 ? (
        <Table 
          columns={columns} 
          dataSource={services} 
          rowKey={(record) => record.service.service_id.toString()}
          pagination={false}
        />
      ) : (
        <Empty description="No services assigned to this room type" />
      )}

      {/* Modal for adding/editing services */}
      <Modal
        title={isEditing ? "Edit Service Assignment" : "Assign Service to Room Type"}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSaveService}
        okButtonProps={{ 
          disabled: (!isEditing && !selectedService) || (included === false && discountPercentage < 0),
          className: "bg-[#2C1810] hover:bg-[#3D2317]"
        }}
      >
        <Form layout="vertical">
          {!isEditing && (
            <Form.Item label="Select Service" required>
              <Select
                placeholder="Select a service"
                value={selectedService}
                onChange={setSelectedService}
                style={{ width: '100%' }}
              >
                {getAvailableServices().map(service => (
                  <Option key={service.service_id} value={service.service_id}>
                    {service.name} - ₱{service.price.toFixed(2)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="Include in Room Price">
            <Switch 
              checked={included} 
              onChange={onIncludedChange}
              checkedChildren="Included" 
              unCheckedChildren="Not Included" 
            />
            {included && (
              <Text type="secondary" className="ml-2">
                This service will be included in the room price at no additional cost
              </Text>
            )}
          </Form.Item>

          {!included && (
            <Form.Item label="Discount Percentage">
              <InputNumber
                min={0}
                max={100}
                value={discountPercentage}
                onChange={(value) => setDiscountPercentage(Number(value))}
                formatter={(value) => `${value}%`}
                parser={(value) => value!.replace('%', '')}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default RoomTypeServicesManager; 