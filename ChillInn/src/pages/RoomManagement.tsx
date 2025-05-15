import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Table, Input, Form, Modal, Typography, message, Select, Upload, Space, Layout, Avatar, Dropdown, Menu, Spin, Image as AntImage } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, UploadOutlined, SettingOutlined, MoreOutlined, CheckCircleOutlined, StopOutlined, LoadingOutlined, EyeOutlined } from "@ant-design/icons";
import axios from "axios";
import { removeToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import type { UploadFile } from "antd/es/upload/interface";
import { uploadToCloudinary, getRoomThumbnail, getRoomPreviewImages, uploadRoomThumbnail, uploadRoomPreviewImage } from '../lib/cloudinaryService';
import RoomTypeServicesManager from '../components/RoomTypeServicesManager';
import { 
  getRoomTypeServices, 
  assignServiceToRoomType, 
  updateRoomTypeService, 
  removeServiceFromRoomType,
  createRoom,
  getRoomTypes
} from '../lib/roomService';
import { RoomService } from '../utils/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Header, Content } = Layout;

interface RoomType {
  id: number;
  name: string;
  description: string;
  price: number;
}

interface Room {
  id: number;
  room_id: string;
  room_number: string;
  type_id: number;
  status: string;
  floor: string;
  images: string[];
  room_type?: string | {
    name: string;
    price: number;
    capacity: number;
    [key: string]: any;
  };
  room_type_name?: string;
}

const RoomManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ fullname: string } | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [addRoomForm] = Form.useForm();
  const [showServicesManager, setShowServicesManager] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number | null>(null);
  const [selectedRoomTypeName, setSelectedRoomTypeName] = useState('');
  const [roomTypeServices, setRoomTypeServices] = useState<RoomService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingRoomImages, setUploadingRoomImages] = useState<{[key: string]: boolean}>({});
  
  // New states for viewing room images
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [selectedRoomImages, setSelectedRoomImages] = useState<{
    room_number: string;
    thumbnail: string | null;
    previews: Array<{imageUrl: string, image_id: number | string}>;
    isLoading: boolean;
  }>({
    room_number: '',
    thumbnail: null,
    previews: [],
    isLoading: false
  });
  
  useEffect(() => {
    fetchUserProfile();
    fetchRoomTypes();
    fetchRooms();
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
      console.log('[DEBUG] Room types fetched:', roomTypesData);
      
      // Process room types to ensure consistent ID formats
      const processedRoomTypes = roomTypesData.map(rt => {
        // Ensure each room type has an id property that's consistent
        return {
          ...rt,
          // If room_type_id exists, use it for id (convert to number if possible)
          id: rt.id || (rt.room_type_id ? 
            (typeof rt.room_type_id === 'string' && !isNaN(Number(rt.room_type_id)) ? 
              Number(rt.room_type_id) : rt.room_type_id) : 
            rt._id),
          // Ensure name property exists
          name: rt.name || rt.room_type_name || 'Unnamed Type'
        };
      });
      
      console.log('[DEBUG] Processed room types:', processedRoomTypes);
      setRoomTypes(processedRoomTypes);
    } catch (error) {
      console.error("Error fetching room types:", error);
      message.error("Error fetching room types");
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required");
        navigate("/");
        return;
      }
      
      // First fetch or refresh room types to ensure we have the latest
      await fetchRoomTypes();
      
      const response = await axios.get("/api/room/getallrooms", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
          "Authorization": `Bearer ${token}`
        },
      });
      
      console.log('[DEBUG] Raw API response from getallrooms:', response.data);
      
      // Check the shape of the response data and extract rooms accordingly
      if (response.data && Array.isArray(response.data)) {
        // If response.data is already an array, use it directly
        console.log('[DEBUG] Room data is a direct array, count:', response.data.length);
        setRooms(response.data);
      } else if (response.data && response.data.rooms && Array.isArray(response.data.rooms)) {
        // If response.data is an object with a rooms property, use that
        console.log('[DEBUG] Room data is in rooms property, count:', response.data.rooms.length);
        setRooms(response.data.rooms);
      } else {
        // Default to empty array if the structure is unexpected
        console.error("[DEBUG] Unexpected response format:", response.data);
        setRooms([]);
      }
      
      // Log a few sample rooms to help diagnosis
      const roomsToSet = (response.data && Array.isArray(response.data)) 
        ? response.data
        : (response.data && response.data.rooms && Array.isArray(response.data.rooms))
          ? response.data.rooms
          : [];
          
      if (roomsToSet.length > 0) {
        console.log('[DEBUG] First room object:', roomsToSet[0]);
        console.log('[DEBUG] First room type_id:', roomsToSet[0].type_id, 'type:', typeof roomsToSet[0].type_id);
        console.log('[DEBUG] First room room_type property:', roomsToSet[0].room_type);
        console.log('[DEBUG] Room types currently loaded:', roomTypes);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      if (axios.isAxiosError(error)) {
        console.error("API Error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      message.error("Error fetching rooms");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoom = async (values: any) => {
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required");
        navigate("/");
        return;
      }

      console.log("Form values before processing:", values);
      
      // Ensure type_id is treated as a number or string, not an object
      if (typeof values.type_id === 'object' && values.type_id !== null) {
        console.log("Converting type_id from object to value:", values.type_id);
        // If it's an object somehow, try to extract the key or value
        values.type_id = values.type_id.key || values.type_id.value || values.type_id.toString();
      }

      // Start loading state for image uploads
      setUploadingImages(true);
      message.loading({ content: "Uploading images...", key: "roomImages" });

      // Upload each image to Cloudinary and collect the URLs
      const imageUrls = [];
      const imageIds = [];
      
      for (const file of fileList) {
        if (file.originFileObj) {
          const uploadResult = await uploadToCloudinary(file.originFileObj);
          imageUrls.push(uploadResult.secure_url);
          imageIds.push(uploadResult.public_id);
        }
      }
      
      // Create room data with image URLs
      const roomData = {
        ...values,
        type_id: values.type_id, // Ensure this is properly set
        images: imageUrls,
        image_ids: imageIds
      };

      console.log("Room data being sent:", roomData); // Debug log

      message.success({ content: "Images uploaded successfully!", key: "roomImages" });
      
      // Send to backend using service function
      message.loading({ content: "Creating room...", key: "createRoom" });
      await createRoom(roomData, token);
      
      message.success({ content: "Room added successfully", key: "createRoom" });
      setShowAddRoom(false);
      addRoomForm.resetFields();
      setFileList([]);
      fetchRooms();
    } catch (error) {
      console.error("Error adding room:", error);
      message.error({ content: "Error adding room: " + (error instanceof Error ? error.message : String(error)), key: "createRoom" });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleUpdateRoom = async (roomId: string, updates: Partial<Room>) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required");
        navigate("/");
        return;
      }
      
      await axios.put(
        `/api/room/updateroombyid/${roomId}`,
        updates,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      message.success("Room updated successfully!");
      fetchRooms();
    } catch (error) {
      console.error("Error updating room:", error);
      message.error("Error updating room!");
    }
  };

  const handleUploadImage = async (roomId: string, file: File, type: 'thumbnail' | 'preview') => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("You must be logged in to upload images");
        return;
      }

      // Validate room ID
      if (!roomId) {
        message.error(`Cannot upload ${type} - invalid room ID`);
        console.error(`Invalid room ID for ${type} upload:`, roomId);
        return;
      }

      // Set loading state for this specific room
      setUploadingRoomImages(prev => ({ ...prev, [roomId]: true }));
      message.loading({ content: `Uploading ${type}...`, key: `upload-${roomId}-${type}` });

      console.log(`Starting ${type} upload for room ID: ${roomId} (type: ${typeof roomId})`);
      console.log(`File details: name=${file.name}, size=${file.size}, type=${file.type}`);
      
      // Use the appropriate cloudinaryService function based on image type
      let result: string | null;
      try {
        if (type === 'thumbnail') {
          result = await uploadRoomThumbnail(file, roomId, token);
        } else {
          result = await uploadRoomPreviewImage(file, roomId, token);
        }
        
        console.log(`${type === 'thumbnail' ? 'Thumbnail' : 'Preview'} upload result:`, result);
        
        if (result) {
          message.success({ content: `${type === 'thumbnail' ? 'Thumbnail' : 'Preview'} uploaded successfully!`, key: `upload-${roomId}-${type}` });
          // Refresh room data to update UI
          await fetchRooms();
        } else {
          console.error(`Failed to save ${type} metadata, null result received`);
          message.error({ content: `Failed to save ${type} metadata`, key: `upload-${roomId}-${type}` });
        }
      } catch (uploadError: any) {
        console.error(`Error during ${type} upload processing:`, uploadError);
        
        if (axios.isAxiosError(uploadError)) {
          console.error('API Error details:', {
            status: uploadError.response?.status,
            statusText: uploadError.response?.statusText,
            data: uploadError.response?.data,
            url: uploadError.config?.url
          });
          
          // Handle specific error cases
          if (uploadError.response?.data?.error?.includes('Missing required fields')) {
            message.error({ 
              content: `Error: ${uploadError.response.data.error}`, 
              key: `upload-${roomId}-${type}` 
            });
          } else if (uploadError.response?.data?.error?.includes('Invalid room_id format')) {
            message.error({ 
              content: `Error: Room ID format is invalid. Technical details: ${uploadError.response.data.error}`, 
              key: `upload-${roomId}-${type}` 
            });
          } else if (uploadError.response?.data?.error?.includes('Room with ID') && uploadError.response?.data?.error?.includes('not found')) {
            message.error({ 
              content: `Error: Room not found in database. Technical details: ${uploadError.response.data.error}`, 
              key: `upload-${roomId}-${type}` 
            });
          } else {
            message.error({ 
              content: `Error uploading ${type}: ${uploadError.message}`, 
              key: `upload-${roomId}-${type}` 
            });
          }
        } else {
          message.error({ 
            content: `Error uploading ${type}: ${uploadError.message || 'Unknown error'}`, 
            key: `upload-${roomId}-${type}` 
          });
        }
        
        throw uploadError; // Re-throw to be caught by outer catch block
      }
    } catch (error: any) {
      console.error(`Error in handleUploadImage for ${type}:`, error);
    } finally {
      // Clear loading state for this room
      setUploadingRoomImages(prev => ({ ...prev, [roomId]: false }));
    }
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
      throw error; // Re-throw for component error handling
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
      throw error; // Re-throw for component error handling
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
      throw error; // Re-throw for component error handling
    }
  };

  const navigateToRoomTypeManagement = () => {
    navigate('/admin/room-type-management');
  };

  // Function to view room images in modal
  const handleViewRoomImages = async (roomId: string, roomNumber: string) => {
    // Validate room ID
    if (!roomId) {
      message.error("Cannot view images: Invalid room ID");
      console.error("Invalid room ID for viewing images:", roomId);
      return;
    }

    // Initialize the modal with loading state
    setSelectedRoomImages({
      room_number: roomNumber,
      thumbnail: null,
      previews: [],
      isLoading: true
    });
    setShowImagesModal(true);
    
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("Authentication required to view images");
        setSelectedRoomImages(prev => ({...prev, isLoading: false}));
        return;
      }
      
      // Fetch room images
      console.log(`Fetching images for room ID: ${roomId} (type: ${typeof roomId})`);
      
      // First try to get the thumbnail
      console.log(`Requesting room thumbnail for room ID: ${roomId}`);
      const thumbnailData = await getRoomThumbnail(roomId, token);
      console.log('Thumbnail data received:', thumbnailData);
      
      // Then get preview images
      console.log(`Requesting room preview images for room ID: ${roomId}`);
      const previewData = await getRoomPreviewImages(roomId, token);
      console.log('Preview data received:', previewData);
      
      if (!thumbnailData.imageUrl && (!previewData || previewData.length === 0)) {
        message.info("No images have been uploaded for this room yet");
      }
      
      // Update state with image data
      setSelectedRoomImages({
        room_number: roomNumber,
        thumbnail: thumbnailData.imageUrl,
        previews: previewData,
        isLoading: false
      });
      
      console.log('Updated room images state:', {
        room_number: roomNumber,
        thumbnail: thumbnailData.imageUrl,
        previews_count: previewData.length,
        previews: previewData
      });
    } catch (error) {
      console.error("Error fetching room images:", error);
      if (axios.isAxiosError(error)) {
        console.error("API Error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      message.error("Failed to load room images");
      setSelectedRoomImages(prev => ({...prev, isLoading: false}));
    }
  };

  const columns = [
    {
      title: "Room Number",
      dataIndex: "room_number",
      key: "room_number",
    },
    {
      title: "Type",
      dataIndex: "type_id",
      key: "type_id",
      render: (typeId: number | string, record: Room) => {
        console.log('Rendering room type for typeId:', typeId, 'with record:', record);
        
        // Try multiple approaches to find the room type
        // 1. Direct matching based on typeId
        let roomType = roomTypes.find(type => type.id === typeId);
        
        // 2. If not found, try matching by string comparison (in case of string vs number issues)
        if (!roomType && typeId !== undefined) {
          roomType = roomTypes.find(type => type.id.toString() === typeId.toString());
        }
        
        // 3. If the room has room_type property directly (nested object)
        if (!roomType && record.room_type) {
          // If room_type is a string, it might be just the name
          if (typeof record.room_type === 'string') {
            return record.room_type;
          }
          
          // If room_type is an object with name property
          if (typeof record.room_type === 'object' && record.room_type.name) {
            return record.room_type.name;
          }
        }
        
        // 4. If room_type_name exists directly on the room
        if (record.room_type_name) {
          return record.room_type_name;
        }
        
        // Return the name if found, otherwise "Unknown"
        return roomType ? roomType.name : "Unknown";
      },
    },
    {
      title: "Floor",
      dataIndex: "floor",
      key: "floor",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <span className={`capitalize ${status.toLowerCase() === 'available' ? 'text-green-600' : status.toLowerCase() === 'maintenance' ? 'text-amber-600' : 'text-red-600'}`}>
          {status}
        </span>
      ),
    },
    {
      title: 'Images',
      key: 'images',
      width: 120,
      render: (_: unknown, record: Room) => (
        <Space size="small">
          <Dropdown overlay={
            <Menu>
              <Menu.Item 
                key="thumbnail" 
                disabled={uploadingRoomImages[record.room_id]} 
                onClick={() => {
                  // Validate room ID before initiating upload
                  console.log(`[DEBUG] Room ID for thumbnail upload: ${record.room_id} (type: ${typeof record.room_id})`);
                  console.log('[DEBUG] Full room record:', record);
                  
                  if (!record.room_id) {
                    message.error("Cannot upload image: Invalid room ID");
                    console.error("Invalid room ID for thumbnail upload:", record);
                    return;
                  }

                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      console.log(`[DEBUG] Uploading thumbnail for room ID: ${record.room_id}`);
                      handleUploadImage(record.room_id, file, 'thumbnail');
                    }
                  };
                  input.click();
                }}
              >
                {uploadingRoomImages[record.room_id] ? <LoadingOutlined spin /> : null} Upload Thumbnail
              </Menu.Item>
              <Menu.Item 
                key="preview" 
                disabled={uploadingRoomImages[record.room_id]} 
                onClick={() => {
                  // Validate room ID before initiating upload
                  console.log(`[DEBUG] Room ID for preview upload: ${record.room_id} (type: ${typeof record.room_id})`);
                  console.log('[DEBUG] Full room record:', record);
                  
                  if (!record.room_id) {
                    message.error("Cannot upload image: Invalid room ID");
                    console.error("Invalid room ID for preview upload:", record);
                    return;
                  }

                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      console.log(`[DEBUG] Uploading preview for room ID: ${record.room_id}`);
                      handleUploadImage(record.room_id, file, 'preview');
                    }
                  };
                  input.click();
                }}
              >
                {uploadingRoomImages[record.room_id] ? <LoadingOutlined spin /> : null} Upload Preview
              </Menu.Item>
            </Menu>
          } trigger={['click']}>
            <Button size="small" icon={<PictureOutlined style={{ color: '#D4AF37' }} />}>
              {uploadingRoomImages[record.room_id] ? <LoadingOutlined spin style={{ marginRight: 8 }} /> : null}
              Images
            </Button>
          </Dropdown>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Room) => (
        <Space size="small">
          <Dropdown overlay={
            <Menu>
              <Menu.Item
                key="viewImages" 
                icon={<PictureOutlined />}
                onClick={() => handleViewRoomImages(record.room_id, record.room_number)}
              >
                View Images
              </Menu.Item>
              {record.status === 'Available' ? (
                <Menu.Item 
                  key="maintenance" 
                  icon={<StopOutlined />} 
                  danger
                  onClick={() => handleUpdateRoom(record.room_id, { status: 'Maintenance' })}
                >
                  Set to Maintenance
                </Menu.Item>
              ) : (
                <Menu.Item 
                  key="available" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleUpdateRoom(record.room_id, { status: 'Available' })}
                >
                  Set to Available
                </Menu.Item>
              )}
            </Menu>
          } trigger={['click']}>
            <Button size="small">
              <MoreOutlined />
            </Button>
          </Dropdown>
        </Space>
      )
    }
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
              Room Management
            </Title>
            <div className="space-x-4">
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={navigateToRoomTypeManagement}
                className="bg-[#2C1810] hover:bg-[#3D2317]"
              >
                Manage Room Types
              </Button>
              <Button
                type="default"
                icon={<PlusOutlined />}
                onClick={() => setShowAddRoom(true)}
              >
                Add Room
              </Button>
            </div>
          </Header>
          <Content className="p-6 bg-[#F5F5F5]">
            <div className="max-w-6xl mx-auto">
              <Card className="shadow-md border-[#D4AF37] hover:shadow-lg transition-shadow">
                <Table
                  dataSource={rooms}
                  columns={columns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  className="custom-table"
                />
              </Card>
            </div>
          </Content>
        </PageTransition>
      </Layout>

      <Modal
        title="Add Room"
        open={showAddRoom}
        onCancel={() => setShowAddRoom(false)}
        footer={null}
      >
        <Form
          form={addRoomForm}
          layout="vertical"
          onFinish={handleAddRoom}
        >
          <Form.Item
            name="room_number"
            label="Room Number"
            rules={[{ required: true, message: "Please enter room number" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type_id"
            label="Room Type"
            rules={[{ required: true, message: "Please select room type" }]}
          >
            <Select 
              placeholder="Select a room type"
              onChange={(value) => {
                console.log("Selected room type ID:", value);
                // Force form to update the value
                addRoomForm.setFieldsValue({ type_id: value });
              }}
            >
              {roomTypes.map(type => (
                <Select.Option 
                  key={type.id} 
                  value={type.id}
                >
                  {type.name} - ₱{type.price.toFixed(2)}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="floor"
            label="Floor"
            rules={[{ required: true, message: "Please enter floor" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: "Please select status" }]}
            initialValue="Available"
          >
            <Select>
              <Select.Option value="Available">Available</Select.Option>
              <Select.Option value="Occupied">Occupied</Select.Option>
              <Select.Option value="Maintenance">Maintenance</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="Room Images"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
            >
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              loading={uploadingImages}
              disabled={uploadingImages}
            >
              {uploadingImages ? 'Adding Room...' : 'Add Room'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

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
      
      {/* Room Images Modal */}
      <Modal
        title={`Images for Room ${selectedRoomImages.room_number}`}
        open={showImagesModal}
        onCancel={() => setShowImagesModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowImagesModal(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedRoomImages.isLoading ? (
          <div className="flex justify-center py-8">
            <Spin tip="Loading images..." />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <Typography.Title level={5}>Thumbnail Image</Typography.Title>
              {selectedRoomImages.thumbnail ? (
                <div className="flex justify-center">
                  <AntImage
                    src={selectedRoomImages.thumbnail}
                    alt={`Thumbnail for Room ${selectedRoomImages.room_number}`}
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-100 rounded">
                  <Typography.Text type="secondary">No thumbnail image available</Typography.Text>
                </div>
              )}
            </div>
            
            <div>
              <Typography.Title level={5}>Preview Images ({selectedRoomImages.previews.length})</Typography.Title>
              {selectedRoomImages.previews.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {selectedRoomImages.previews.map((image, index) => (
                    <AntImage
                      key={image.image_id || index}
                      src={image.imageUrl}
                      alt={`Preview ${index + 1} for Room ${selectedRoomImages.room_number}`}
                      style={{ maxHeight: '150px', maxWidth: '200px' }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-100 rounded">
                  <Typography.Text type="secondary">No preview images available</Typography.Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default RoomManagement; 