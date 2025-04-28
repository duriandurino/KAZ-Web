import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Table, Input, Form, Modal, Typography, message, Select, Upload, Space, Layout, Avatar } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import { removeToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import type { UploadFile } from "antd/es/upload/interface";
import { uploadToCloudinary } from '../lib/cloudinaryService';
import CachedImage from '../components/CachedImage';

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
  room_number: string;
  type_id: number;
  status: string;
  floor: string;
  images: string[];
}

const RoomManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ fullname: string } | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRoomType, setShowAddRoomType] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [addRoomTypeForm] = Form.useForm();
  const [addRoomForm] = Form.useForm();
  
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
      const response = await axios.get("/api/room/getroomtypes", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      setRoomTypes(response.data);
    } catch (error) {
      message.error("Error fetching room types");
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get("/api/room/getallrooms", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      setRooms(response.data);
    } catch (error) {
      message.error("Error fetching rooms");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoomType = async (values: any) => {
    try {
      await axios.post(
        "/api/room/add-roomtype",
        values,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );
      message.success("Room type added successfully");
      setShowAddRoomType(false);
      addRoomTypeForm.resetFields();
      fetchRoomTypes();
    } catch (error) {
      message.error("Error adding room type");
    }
  };

  const handleAddRoom = async (values: any) => {
    try {
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
        images: imageUrls,
        image_ids: imageIds
      };

      // Send to your backend API
      await axios.post(
        "/api/room/add-room",
        roomData,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      
      message.success("Room added successfully");
      setShowAddRoom(false);
      addRoomForm.resetFields();
      setFileList([]);
      fetchRooms();
    } catch (error) {
      message.error("Error adding room");
    }
  };

  const handleUpdateRoom = async (roomId: number, updates: Partial<Room>) => {
    try {
      await axios.put(
        `/api/room/updateroombyid/${roomId}`,
        updates,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );
      message.success("Room updated successfully!");
      fetchRooms();
    } catch (error) {
      message.error("Error updating room!");
    }
  };

  const handleUploadImage = async (roomId: number, file: File, type: 'thumbnail' | 'preview') => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("You must be logged in to upload images");
        return;
      }

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file);
      
      // Save image metadata to the appropriate endpoint
      const endpoint = type === 'thumbnail' 
        ? '/api/images/room-thumbnail'
        : '/api/images/room-preview';
      
      // Prepare image data to save in your database
      const imageData = {
        room_id: roomId,
        image_url: uploadResult.secure_url,
        cloudinary_public_id: uploadResult.public_id,
        cloudinary_version: uploadResult.version,
        cloudinary_signature: uploadResult.signature,
        width: uploadResult.width,
        height: uploadResult.height
      };
      
      // Save image metadata in your database
      await axios.post(endpoint, imageData, {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
          "Authorization": `Bearer ${token}`
        }
      });
      
      message.success(`${type === 'thumbnail' ? 'Thumbnail' : 'Preview'} uploaded successfully!`);
      fetchRooms();
    } catch (error: any) {
      message.error(`Error uploading ${type}: ${error.message}`);
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
      render: (typeId: number) => {
        const roomType = roomTypes.find(type => type.id === typeId);
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
        <span className={`capitalize ${status.toLowerCase() === 'available' ? 'text-green-600' : 'text-red-600'}`}>
          {status}
        </span>
      ),
    },
    {
      title: 'Preview',
      key: 'preview',
      render: (_: any, record: Room) => (
        <Space>
          <Button
            type="text"
            icon={<PictureOutlined style={{ color: '#D4AF37' }} />}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleUploadImage(record.id, file, 'thumbnail');
              };
              input.click();
            }}
          />
          <Button
            type="text"
            icon={<PictureOutlined style={{ color: '#D4AF37' }} />}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleUploadImage(record.id, file, 'preview');
              };
              input.click();
            }}
          />
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Room) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#D4AF37' }} />}
            onClick={() => {
              // TODO: Implement edit room functionality
            }}
          />
          <Button
            type="text"
            icon={<DeleteOutlined style={{ color: '#B22222' }} />}
            onClick={() => handleUpdateRoom(record.id, {
              status: record.status === 'Available' ? 'Maintenance' : 'Available'
            })}
          />
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
                icon={<PlusOutlined />}
                onClick={() => setShowAddRoomType(true)}
              >
                Add Room Type
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
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price per Night"
            rules={[{ required: true, message: "Please enter price" }]}
          >
            <Input type="number" prefix="₱" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Add Room Type
            </Button>
          </Form.Item>
        </Form>
      </Modal>

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
            <Input type="number" />
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
            rules={[{ required: true, message: "Please enter status" }]}
          >
            <Input />
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
            <Button type="primary" htmlType="submit" block>
              Add Room
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default RoomManagement; 