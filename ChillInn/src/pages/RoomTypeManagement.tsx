import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Table, Input, Form, Modal, Typography, message, Select, Space, Layout, Tabs, Dropdown, Menu } from "antd";
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  AppstoreOutlined,
  SettingOutlined,
  MoreOutlined
} from "@ant-design/icons";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import RoomTypeServicesManager from "../components/RoomTypeServicesManager";
import RoomTypeAmenitiesManager from "../components/RoomTypeAmenitiesManager";
import { 
  getRoomTypeServices, 
  assignServiceToRoomType, 
  updateRoomTypeService, 
  removeServiceFromRoomType, 
  getRoomTypeAmenities, 
  assignAmenityToRoomType, 
  removeAmenityFromRoomType,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  getRoomTypes
} from '../lib/roomService';
import { RoomService, Amenity } from '../utils/types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Header, Content } = Layout;
const { TabPane } = Tabs;

interface RoomType {
  id: number;
  name: string;
  description: string;
  price: number;
  capacity: number;
  size?: number;
  beds?: number;
  status?: string;
  category?: string;
}

const RoomTypeManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ fullname: string } | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [showEditRoomType, setShowEditRoomType] = useState(false);
  const [currentRoomType, setCurrentRoomType] = useState<RoomType | null>(null);
  const [addRoomTypeForm] = Form.useForm();
  const [editRoomTypeForm] = Form.useForm();
  
  // For services management
  const [showServicesManager, setShowServicesManager] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number | null>(null);
  const [selectedRoomTypeName, setSelectedRoomTypeName] = useState('');
  const [roomTypeServices, setRoomTypeServices] = useState<RoomService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // For amenities management
  const [showAmenitiesManager, setShowAmenitiesManager] = useState(false);
  const [roomTypeAmenities, setRoomTypeAmenities] = useState<Amenity[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  
  useEffect(() => {
    fetchUserProfile();
    fetchRoomTypes();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await axios.get("/api/users/userinfobyid", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });

      if (response.data.role.toLowerCase() !== "admin") {
        message.error("Unauthorized access");
        navigate("/");
        return;
      }

      setUser(response.data);
    } catch (error) {
      message.error("Error fetching admin profile");
      navigate("/");
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required");
        navigate("/");
        return;
      }
      
      const roomTypesData = await getRoomTypes(token);
      setRoomTypes(roomTypesData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching room types:", error);
      message.error("Error fetching room types");
      setIsLoading(false);
    }
  };

  const handleAddRoomType = async (values: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required");
        return;
      }
      
      await createRoomType(values, token);
      message.success("Room type added successfully");
      setShowAddRoomType(false);
      addRoomTypeForm.resetFields();
      fetchRoomTypes();
    } catch (error) {
      console.error("Error adding room type:", error);
      message.error("Error adding room type");
    }
  };

  const handleEditRoomType = (roomType: RoomType) => {
    setCurrentRoomType(roomType);
    editRoomTypeForm.setFieldsValue({
      name: roomType.name,
      description: roomType.description,
      price: roomType.price,
      capacity: roomType.capacity || 1,
      size: roomType.size,
      beds: roomType.beds || 1,
      status: roomType.status || 'Active',
      category: roomType.category || 'Standard'
    });
    setShowEditRoomType(true);
  };

  const handleUpdateRoomType = async (values: any) => {
    if (!currentRoomType) return;
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required");
        return;
      }
      
      await updateRoomType(currentRoomType.id, values, token);
      message.success("Room type updated successfully");
      setShowEditRoomType(false);
      fetchRoomTypes();
    } catch (error) {
      console.error("Error updating room type:", error);
      message.error("Error updating room type");
    }
  };

  const showDeleteConfirm = (roomTypeId: number, roomTypeName: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this room type?',
      icon: <ExclamationCircleOutlined />,
      content: `You are about to delete "${roomTypeName}". This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            message.error("Authentication required");
            return;
          }
          
          await deleteRoomType(roomTypeId, token);
          message.success("Room type deleted successfully");
          fetchRoomTypes();
        } catch (error: any) {
          if (error.response && error.response.status === 409) {
            message.error("Cannot delete room type that is used by existing rooms");
          } else {
            console.error("Error deleting room type:", error);
            message.error("Error deleting room type");
          }
        }
      }
    });
  };

  const handleManageServices = async (roomTypeId: number, roomTypeName: string) => {
    setSelectedRoomTypeId(roomTypeId);
    setSelectedRoomTypeName(roomTypeName);
    setLoadingServices(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required");
        return;
      }
      
      const services = await getRoomTypeServices(roomTypeId, token);
      setRoomTypeServices(services);
      setShowServicesManager(true);
    } catch (error) {
      console.error('Error fetching room type services:', error);
      message.error('Failed to load room type services');
    } finally {
      setLoadingServices(false);
    }
  };
  
  const handleAddService = async (serviceId: string | number, included: boolean, discountPercentage: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !selectedRoomTypeId) {
        message.error("Authentication required");
        return;
      }
      
      await assignServiceToRoomType(
        selectedRoomTypeId,
        serviceId,
        included,
        discountPercentage,
        token
      );
      
      // Refresh services
      const services = await getRoomTypeServices(selectedRoomTypeId, token);
      setRoomTypeServices(services);
    } catch (error) {
      console.error('Error adding service to room type:', error);
      message.error('Failed to add service to room type');
      throw error;
    }
  };
  
  const handleUpdateService = async (serviceId: string | number, included: boolean, discountPercentage: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !selectedRoomTypeId) {
        message.error("Authentication required");
        return;
      }
      
      await updateRoomTypeService(
        selectedRoomTypeId,
        serviceId,
        included,
        discountPercentage,
        token
      );
      
      // Refresh services
      const services = await getRoomTypeServices(selectedRoomTypeId, token);
      setRoomTypeServices(services);
    } catch (error) {
      console.error('Error updating room type service:', error);
      message.error('Failed to update room type service');
      throw error;
    }
  };
  
  const handleRemoveService = async (serviceId: string | number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !selectedRoomTypeId) {
        message.error("Authentication required");
        return;
      }
      
      await removeServiceFromRoomType(
        selectedRoomTypeId,
        serviceId,
        token
      );
      
      // Refresh services
      const services = await getRoomTypeServices(selectedRoomTypeId, token);
      setRoomTypeServices(services);
    } catch (error) {
      console.error('Error removing service from room type:', error);
      message.error('Failed to remove service from room type');
      throw error;
    }
  };

  const handleManageAmenities = (roomTypeId: number, roomTypeName: string) => {
    setSelectedRoomTypeId(roomTypeId);
    setSelectedRoomTypeName(roomTypeName);
    setLoadingAmenities(true);
    
    const token = localStorage.getItem("token");
    if (!token) {
      message.error("Authentication required");
      return;
    }
    
    getRoomTypeAmenities(roomTypeId, token)
      .then(amenities => {
        setRoomTypeAmenities(amenities);
        setShowAmenitiesManager(true);
      })
      .catch(error => {
        console.error('Error fetching room type amenities:', error);
        message.error('Failed to load room type amenities');
      })
      .finally(() => {
        setLoadingAmenities(false);
      });
  };

  const handleAddAmenity = async (amenityId: string | number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !selectedRoomTypeId) {
        message.error("Authentication required");
        return;
      }
      
      await assignAmenityToRoomType(
        selectedRoomTypeId,
        amenityId,
        token
      );
      
      // Refresh amenities
      const amenities = await getRoomTypeAmenities(selectedRoomTypeId, token);
      setRoomTypeAmenities(amenities);
    } catch (error) {
      console.error('Error adding amenity to room type:', error);
      message.error('Failed to add amenity to room type');
      throw error;
    }
  };

  const handleRemoveAmenity = async (amenityId: string | number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !selectedRoomTypeId) {
        message.error("Authentication required");
        return;
      }
      
      await removeAmenityFromRoomType(
        selectedRoomTypeId,
        amenityId,
        token
      );
      
      // Refresh amenities
      const amenities = await getRoomTypeAmenities(selectedRoomTypeId, token);
      setRoomTypeAmenities(amenities);
    } catch (error) {
      console.error('Error removing amenity from room type:', error);
      message.error('Failed to remove amenity from room type');
      throw error;
    }
  };

  const roomTypeColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `₱${price.toFixed(2)}`,
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (capacity: number) => `${capacity} Person${capacity > 1 ? 's' : ''}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: RoomType) => (
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item 
                key="edit" 
                icon={<EditOutlined />} 
                onClick={() => handleEditRoomType(record)}
              >
                Edit Details
              </Menu.Item>
              <Menu.Item 
                key="amenities" 
                icon={<AppstoreOutlined />} 
                onClick={() => handleManageAmenities(record.id, record.name)}
              >
                Manage Amenities
              </Menu.Item>
              <Menu.Item 
                key="services" 
                icon={<SettingOutlined />} 
                onClick={() => handleManageServices(record.id, record.name)}
              >
                Manage Services
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item 
                key="delete" 
                icon={<DeleteOutlined />} 
                danger
                onClick={() => showDeleteConfirm(record.id, record.name)}
              >
                Delete
              </Menu.Item>
            </Menu>
          }
          trigger={['click']}
        >
          <Button size="small">
            <MoreOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="admin" userName={user?.fullname} />
      <Layout>
        <PageTransition>
          <Header className="bg-white px-6 flex items-center justify-between">
            <Title level={4} style={{ margin: 0, color: "#2C1810" }}>
              Room Type Management
            </Title>
            <div className="space-x-4">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowAddRoomType(true)}
                className="bg-[#2C1810] hover:bg-[#3D2317]"
              >
                Add Room Type
              </Button>
              <Button
                type="default"
                onClick={() => navigate('/admin/room-management')}
              >
                Back to Rooms
              </Button>
            </div>
          </Header>
          <Content className="p-6 bg-[#F5F5F5]">
            <div className="max-w-6xl mx-auto">
              <Card className="shadow-md border-[#D4AF37] hover:shadow-lg transition-shadow">
                <Table
                  dataSource={roomTypes}
                  columns={roomTypeColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  className="custom-table"
                />
              </Card>
            </div>
          </Content>
        </PageTransition>
      </Layout>

      {/* Add Room Type Modal */}
      <Modal
        title="Add Room Type"
        open={showAddRoomType}
        onCancel={() => setShowAddRoomType(false)}
        footer={null}
      >
        <Form
          form={addRoomTypeForm}
          layout="vertical"
          onFinish={handleAddRoomType}
        >
          <Form.Item
            name="name"
            label="Room Type Name"
            rules={[{ required: true, message: "Please enter room type name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price per Night (₱)"
            rules={[{ required: true, message: "Please enter price" }]}
          >
            <Input type="number" min={0} step={0.01} />
          </Form.Item>
          <Form.Item
            name="capacity"
            label="Capacity (Persons)"
            rules={[{ required: true, message: "Please enter capacity" }]}
            initialValue={2}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item
            name="size"
            label="Room Size (sq.m)"
          >
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item
            name="beds"
            label="Number of Beds"
            initialValue={1}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            initialValue="Standard"
          >
            <Select>
              <Option value="Standard">Standard</Option>
              <Option value="Deluxe">Deluxe</Option>
              <Option value="Premium">Premium</Option>
              <Option value="Suite">Suite</Option>
              <Option value="Special">Special</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block className="bg-[#2C1810] hover:bg-[#3D2317]">
              Add Room Type
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Room Type Modal */}
      <Modal
        title={`Edit Room Type: ${currentRoomType?.name}`}
        open={showEditRoomType}
        onCancel={() => setShowEditRoomType(false)}
        footer={null}
      >
        <Form
          form={editRoomTypeForm}
          layout="vertical"
          onFinish={handleUpdateRoomType}
        >
          <Form.Item
            name="name"
            label="Room Type Name"
            rules={[{ required: true, message: "Please enter room type name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price per Night (₱)"
            rules={[{ required: true, message: "Please enter price" }]}
          >
            <Input type="number" min={0} step={0.01} />
          </Form.Item>
          <Form.Item
            name="capacity"
            label="Capacity (Persons)"
            rules={[{ required: true, message: "Please enter capacity" }]}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item
            name="size"
            label="Room Size (sq.m)"
          >
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item
            name="beds"
            label="Number of Beds"
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
          >
            <Select>
              <Option value="Standard">Standard</Option>
              <Option value="Deluxe">Deluxe</Option>
              <Option value="Premium">Premium</Option>
              <Option value="Suite">Suite</Option>
              <Option value="Special">Special</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
          >
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block className="bg-[#2C1810] hover:bg-[#3D2317]">
              Update Room Type
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Room Type Services Manager Modal */}
      <Modal
        title={`Manage Services for ${selectedRoomTypeName}`}
        open={showServicesManager}
        onCancel={() => setShowServicesManager(false)}
        footer={null}
        width={1000}
      >
        {loadingServices ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
          </div>
        ) : (
          <RoomTypeServicesManager
            roomTypeId={selectedRoomTypeId || 0}
            services={roomTypeServices}
            onAddService={handleAddService}
            onUpdateService={handleUpdateService}
            onRemoveService={handleRemoveService}
          />
        )}
      </Modal>

      {/* Room Type Amenities Manager Modal */}
      <Modal
        title={`Manage Amenities for ${selectedRoomTypeName}`}
        open={showAmenitiesManager}
        onCancel={() => setShowAmenitiesManager(false)}
        footer={null}
        width={1000}
      >
        {loadingAmenities ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
          </div>
        ) : (
          <RoomTypeAmenitiesManager
            roomTypeId={selectedRoomTypeId || 0}
            amenities={roomTypeAmenities}
            onAddAmenity={handleAddAmenity}
            onRemoveAmenity={handleRemoveAmenity}
          />
        )}
      </Modal>
    </Layout>
  );
};

export default RoomTypeManagement; 