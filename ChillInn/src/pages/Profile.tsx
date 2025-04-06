import { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Form, message, Upload as AntUpload, Typography, Layout, Alert, Modal } from "antd";
import { EyeOutlined, EyeInvisibleOutlined, UploadOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';
import axios from "axios";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import { uploadFile } from '../lib/appwrite';

const { Content } = Layout;
const { Title, Text } = Typography;

interface User {
  user_id: number;
  email: string;
  fullname: string;
  phone_number: string;
  role: string;
  special_requests?: string;
  profile_image?: string;
}

const DEFAULT_PROFILE_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC44NCAyLjE3IDQuODQgNC44NFMxNC42NyAxNC42OCAxMiAxNC42OCA3LjE2IDEyLjUxIDcuMTYgOS44NCA5LjMzIDUgMTIgNXptMCAxM2MtMi4zMyAwLTQuMzEtMS4zNi01LjI2LTMuMzEuODUtMS40MiAyLjQxLTIuMzcgNC4xNy0yLjM3IDEuNzYgMCAzLjMyLjk1IDQuMTcgMi4zNy0uOTUgMS45NS0yLjkzIDMuMzEtNS4yNiAzLjMxeiIvPjwvc3ZnPg==';

const Profile = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
    
    return () => {
      if (imagePreview && imagePreview !== DEFAULT_PROFILE_IMAGE) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, []);

  // Add useEffect to monitor form values
  useEffect(() => {
    const values = form.getFieldsValue();
    console.log('Form values changed:', values);
  }, [form.getFieldsValue()]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate("/");
        return;
      }

      const response = await axios.get("/api/users/userinfobyid", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
          "Authorization": `Bearer ${token}`
        }
      });
      console.log("API Response:", response.data);
      setUser(response.data);

      // Split fullname into firstname and lastname
      const nameParts = response.data.fullname?.split(' ') || ['', ''];
      const firstname = nameParts[0] || '';
      const lastname = nameParts.slice(1).join(' ') || '';

      // Format phone number - remove +63 prefix and any spaces
      const rawPhoneNumber = response.data.phone_number || '';
      console.log("Raw Phone Number:", rawPhoneNumber);
      const phoneNumber = rawPhoneNumber.replace('+63', '').trim();
      console.log("Formatted Phone Number:", phoneNumber);

      // Set form values individually to ensure they are set correctly
      form.setFieldValue('userId', response.data.user_id);
      form.setFieldValue('email', response.data.email);
      form.setFieldValue('password', '');
      form.setFieldValue('firstname', firstname);
      form.setFieldValue('lastname', lastname);
      form.setFieldValue('phone_number', phoneNumber);
      form.setFieldValue('special_requests', response.data.special_requests || '');

      // Log current form values
      const currentValues = form.getFieldsValue();
      console.log("Current Form Values:", currentValues);

      // Set default first
      setImagePreview(DEFAULT_PROFILE_IMAGE);

      // Only try to fetch image if we have a user_id
      if (response.data.user_id) {
        try {
          const imageResponse = await axios.get(`/api/images`, {
            headers: {
              "x-api-key": import.meta.env.VITE_API_KEY,
              "Authorization": `Bearer ${token}`
            },
            params: {
              guest_id: response.data.user_id,
              purpose: 'profile'
            }
          });

          if (imageResponse.data && imageResponse.data.length > 0 && imageResponse.data[0].image_url) {
            setImagePreview(imageResponse.data[0].image_url);
          }
        } catch (imageError) {
          console.log("No profile image found or error loading image:", imageError);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        message.error("Session expired. Please login again.");
        navigate("/");
      } else if (error.response?.data?.message) {
        setProfileError(error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        setProfileError("Unable to connect to server. Please check your internet connection.");
      } else {
        setProfileError("Error fetching profile. Please try again later.");
      }
    }
  };

  const handleImageChange = async (info: any) => {
    if (!info || !info.file) {
      message.error("Failed to process image. Please try again.");
      return;
    }

    const file = info.file;

    // Check file type
    if (!file.type || !file.type.startsWith('image/')) {
      message.error("Please select an image file (JPEG, PNG, etc.)");
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      message.error("Image size should be less than 10MB");
      return;
    }

    try {
      // Clean up previous preview URL if it exists
      if (imagePreview && imagePreview !== DEFAULT_PROFILE_IMAGE) {
        URL.revokeObjectURL(imagePreview);
      }

      // Get the actual file object
      const fileObj = file instanceof File ? file : file.originFileObj;
      
      if (!fileObj) {
        throw new Error("Could not get valid file object");
      }

      // Create new preview URL
      const previewUrl = URL.createObjectURL(fileObj);
      
      // Update state
      setImageFile(fileObj);
      setImagePreview(previewUrl);
      
      message.success("Image selected successfully");
    } catch (error) {
      console.error("Error processing image:", error);
      message.error("Failed to process image. Please try again.");
    }
  };

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Image must be smaller than 10MB!');
      return false;
    }
    return false; // Return false to prevent auto upload
  };

  const handlePhoneNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      form.setFieldValue('phone_number', value);
      console.log("Phone number updated:", value);
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !user?.user_id) {
      return null;
    }
    
    try {
      const token = localStorage.getItem('token');

      // Upload to Appwrite using the client
      const appwriteResponse = await uploadFile(imageFile);

      // Generate a delete hash for the image
      const deleteHash = crypto.randomUUID();

      // Then save the image record using the images endpoint
      const imageData = {
        guest_id: user.user_id,
        image_purpose: 'profile',
        image_url: appwriteResponse.url,
        delete_hash: deleteHash,
        file_id: appwriteResponse.fileId,
        width: 0,
        height: 0
      };

      const response = await axios.post('/api/images', imageData, {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return appwriteResponse.url;
    } catch (error: any) {
      console.error("Image upload error:", error?.message || 'Unknown error occurred');
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        throw new Error("Unable to connect to server. Please check your internet connection.");
      } else {
        throw new Error("Failed to upload profile image. Please try again later.");
      }
    }
  };

  const showSaveConfirmation = (values: any) => {
    setFormValues(values);
    setIsSaveModalVisible(true);
  };

  const handleCancelSave = () => {
    setIsSaveModalVisible(false);
    setFormValues(null);
  };

  const handleConfirmSave = async () => {
    if (formValues) {
      await handleSubmit(formValues);
      setIsSaveModalVisible(false);
      setFormValues(null);
    }
  };

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    setProfileError(null);

    try {
      // Validate phone number
      const phoneNumber = values.phone_number.replace(/\D/g, '');
      if (phoneNumber.length !== 10) {
        setProfileError("Please enter a valid 10-digit phone number");
        setIsLoading(false);
        return;
      }

      let imageUrl = null;
      if (imageFile) {
        try {
          message.loading("Uploading profile image...", 0);
          imageUrl = await uploadImage();
          message.destroy(); // Clear the loading message
          if (imageUrl) {
            message.success("Profile image uploaded successfully");
          }
        } catch (uploadError: any) {
          message.destroy(); // Clear the loading message
          setProfileError(uploadError.message);
          setIsLoading(false);
          return;
        }
      }

      interface UpdateData {
        userId: number | undefined;
        fullname: string;
        role: string | undefined;
        access_level: string;
        phone_number: string;
        special_requests: any;
        profile_image?: string;
        [key: string]: any; // Allow additional properties
      }

      const updateData: UpdateData = {
        userId: user?.user_id,
        fullname: `${values.firstname} ${values.lastname}`.trim(),
        role: user?.role,
        access_level: "1",
        phone_number: `+63${phoneNumber}`,
        special_requests: values.special_requests || null,
        ...(imageUrl && { profile_image: imageUrl }),
      };

      // Remove firstname and lastname from updateData as they're not needed by the API
      delete updateData.firstname;
      delete updateData.lastname;

      if (!updateData.password) {
        delete updateData.password;
      }

      console.log("Sending update data:", updateData);

      await axios.put(
        `/api/users/update-user`,
        updateData,
        {
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY,
          },
        }
      );

      message.success("Profile updated successfully!");
      setImageFile(null);
      await fetchUserProfile();
    } catch (error: any) {
      if (error.response?.status === 401) {
        message.error("Session expired. Please login again.");
        navigate("/");
      } else if (error.response?.data?.message) {
        setProfileError(error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        setProfileError("Unable to connect to server. Please check your internet connection.");
      } else {
        setProfileError("Error updating profile. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout hasSider className="min-h-screen">
      <Sidebar userRole="guest" userName={user?.fullname} />
      <Layout className="bg-[#F5F5F5]">
        <PageTransition>
          <Content className="p-6 mx-auto w-full max-w-4xl">
            <Card 
              className="shadow-md" 
              style={{ borderColor: '#D4AF37' }}
              title={<Title level={3} style={{ color: '#2C1810', margin: 0 }}>Edit Profile</Title>}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={showSaveConfirmation}
                className="space-y-6"
              >
                {profileError && (
                  <Alert
                    message={profileError}
                    type="error"
                    showIcon
                    className="mb-4"
                  />
                )}

                {/* Profile Image */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-32 h-32">
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover border-2 border-[#D4AF37]"
                      onError={() => {
                        if (imagePreview !== DEFAULT_PROFILE_IMAGE) {
                          setImagePreview(DEFAULT_PROFILE_IMAGE);
                        }
                      }}
                    />
                    <AntUpload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={beforeUpload}
                      onChange={handleImageChange}
                      customRequest={({ file, onSuccess }) => {
                        setTimeout(() => {
                          onSuccess?.("ok");
                        }, 0);
                      }}
                    >
                      <Button
                        type="text"
                        icon={<UploadOutlined />}
                        className="absolute bottom-0 right-0 bg-[#2C1810] p-2 rounded-full cursor-pointer hover:bg-[#3D2317] text-white"
                      />
                    </AntUpload>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <Form.Item
                    label={<Text>Email</Text>}
                    name="email"
                  >
                    <Input 
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                      disabled={true}
                    />
                  </Form.Item>

                  <Form.Item
                    label={<Text>New Password (Optional)</Text>}
                    name="password"
                  >
                    <Input.Password
                      placeholder="Leave blank to keep current password"
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                      iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                    />
                  </Form.Item>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item
                      label={<Text>First Name</Text>}
                      name="firstname"
                      rules={[{ required: true, message: 'Please input your first name!' }]}
                    >
                      <Input 
                        className="border-[#D4AF37] focus:ring-[#2C1810]"
                        placeholder="Enter your first name"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<Text>Last Name</Text>}
                      name="lastname"
                      rules={[{ required: true, message: 'Please input your last name!' }]}
                    >
                      <Input 
                        className="border-[#D4AF37] focus:ring-[#2C1810]"
                        placeholder="Enter your last name"
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    label={<Text>Phone Number</Text>}
                    name="phone_number"
                    rules={[
                      { required: true, message: 'Please input your phone number!' },
                      { min: 10, message: 'Phone number must be 10 digits!' },
                      { pattern: /^[0-9]+$/, message: 'Phone number can only contain numbers!' }
                    ]}
                  >
                    <div className="relative flex items-center">
                      <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-gray-100 text-gray-600 w-12 border-r rounded-l">
                        +63
                      </div>
                      <Input
                        type="text"
                        placeholder="9123456789"
                        onChange={handlePhoneNumberChange}
                        className="border-[#D4AF37] focus:ring-[#2C1810] pl-12"
                        maxLength={10}
                        onKeyPress={(e) => {
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        style={{ paddingLeft: '48px' }}
                      />
                    </div>
                  </Form.Item>

                  <Form.Item
                    label={<Text>Special Requests</Text>}
                    name="special_requests"
                  >
                    <Input 
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      className="w-full bg-[#2C1810] hover:bg-[#3D2317] text-white"
                      loading={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </Form.Item>
                </div>
              </Form>
            </Card>
          </Content>
        </PageTransition>
      </Layout>

      {/* Save Confirmation Modal */}
      <Modal
        title="Confirm Changes"
        open={isSaveModalVisible}
        onOk={handleConfirmSave}
        onCancel={handleCancelSave}
        okText="Save Changes"
        cancelText="Cancel"
        okButtonProps={{ 
          loading: isLoading,
          className: "bg-[#2C1810] hover:bg-[#3D2317] text-white"
        }}
        centered
        width={400}
      >
        <p>Are you sure you want to save these changes to your profile?</p>
      </Modal>
    </Layout>
  );
};

export default Profile; 