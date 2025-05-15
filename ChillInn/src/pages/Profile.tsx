import { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Form, message, Upload as AntUpload, Typography, Layout, Alert, Modal, Spin } from "antd";
import { EyeOutlined, EyeInvisibleOutlined, UploadOutlined, LoadingOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';
import AppLayout from "../components/AppLayout";
import { uploadProfileImage, getProfileImage } from '../lib/cloudinaryService';
import { getUserProfile, updateUserProfile } from '../lib/userService';

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
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  useEffect(() => {
    fetchUserProfile();
    
    return () => {
      if (imagePreview && imagePreview !== DEFAULT_PROFILE_IMAGE) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, []);
  
  // Additional effect to update the form when user data changes
  useEffect(() => {
    if (user) {
      // Format phone number - remove +63 prefix from the start if present
      const rawPhoneNumber = user.phone_number || '';
      const phoneNumber = rawPhoneNumber.replace(/^\+63/, '').trim();
      
      // Ensure form fields are set with current user data
      form.setFieldsValue({
        userId: user.user_id,
        email: user.email,
        phone_number: phoneNumber,
        special_requests: user.special_requests || '',
        // Split fullname into firstname and lastname for the form
        firstname: user.fullname?.split(' ')[0] || '',
        lastname: user.fullname?.split(' ').slice(1).join(' ') || ''
      });
    }
  }, [user, form]);

  // Add useEffect to monitor form values
  useEffect(() => {
    const values = form.getFieldsValue();
    console.log('Form values changed:', values);
  }, [form.getFieldsValue()]);

  const fetchUserProfile = async () => {
    console.log('fetchUserProfile called');
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', token ? 'Yes' : 'No');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate("/");
        return;
      }

      console.log('Calling getUserProfile service function');
      const userData = await getUserProfile(token);
      console.log('getUserProfile returned data:', userData);
      
      setUser(userData);
      console.log('User state set with:', userData);

      // Split fullname into firstname and lastname
      const nameParts = userData.fullname?.split(' ') || ['', ''];
      const firstname = nameParts[0] || '';
      const lastname = nameParts.slice(1).join(' ') || '';
      console.log('Name parts:', { firstname, lastname });

      // Format phone number - remove +63 prefix and any spaces
      const rawPhoneNumber = userData.phone_number || '';
      const phoneNumber = rawPhoneNumber.replace(/^\+63/, '').trim();
      console.log('Phone number formatted:', phoneNumber);

      // Set form values individually to ensure they are set correctly
      form.setFieldValue('userId', userData.user_id);
      form.setFieldValue('email', userData.email);
      form.setFieldValue('password', '');
      form.setFieldValue('firstname', firstname);
      form.setFieldValue('lastname', lastname);
      form.setFieldValue('phone_number', phoneNumber);
      form.setFieldValue('special_requests', userData.special_requests || '');
      console.log('Form values set');

      // Set profile image preview if it exists in user data
      if (userData.profile_image) {
        setImagePreview(userData.profile_image);
        console.log('Setting image preview to user profile image:', userData.profile_image);
      } else {
        // Set default first
        setImagePreview(DEFAULT_PROFILE_IMAGE);
        console.log('No profile image, using default');
      }
    } catch (error: any) {
      console.error('Error in fetchUserProfile:', error);
      if (error.response?.status === 401) {
        message.error("Session expired. Please login again.");
        navigate("/");
      } else if (error.response?.data?.message) {
        setProfileError(error.response.data.message);
        console.error('Profile error set to:', error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        setProfileError("Unable to connect to server. Please check your internet connection.");
        console.error('Network error detected');
      } else {
        setProfileError("Error fetching profile. Please try again later.");
        console.error('Generic error set');
      }
    }
  };

  const handleImageChange = async (info: any) => {
    if (info.file && info.file.status === 'uploading') {
      // Show uploading state
      setUploadingImage(true);
      return;
    }
    
    if (info.file && info.file.status === 'done') {
      const file = info.file.originFileObj;
      if (!file) {
        setUploadingImage(false);
        return;
      }
      
      // Preview the image locally before upload
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      // Store the file for later uploading when form is submitted
      setImageFile(file);
      setUploadingImage(false);
    }
    
    if (info.file && info.file.status === 'error') {
      message.error('Error loading image. Please try again.');
      setUploadingImage(false);
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
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !user?.user_id) {
      return null;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      setUploadingImage(true);
      message.loading({ content: "Uploading image...", key: "imageUpload" });
      
      // Use our improved Cloudinary service to upload profile image
      const imageUrl = await uploadProfileImage(imageFile, user.user_id, token);
      
      if (!imageUrl) {
        throw new Error("Failed to upload image");
      }
      
      message.success({ content: "Image uploaded successfully!", key: "imageUpload" });
      return imageUrl;
    } catch (error: any) {
      message.error({ content: error.message || "Failed to upload image", key: "imageUpload" });
      console.error("Image upload error:", error);
      throw error;
    } finally {
      setUploadingImage(false);
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

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Prepare the update data
      const updateData = {
        userId: user?.user_id,
        fullname: `${values.firstname} ${values.lastname}`.trim(),
        phone_number: `+63${phoneNumber}`,
        special_requests: values.special_requests || null,
        ...(values.password && { password: values.password }),
      };

      console.log('Starting profile update with data:', updateData);

      // First handle image upload if there's a new image
      let imageUrl = null;
      if (imageFile) {
        try {
          console.log('Uploading new profile image');
          message.loading({ content: "Uploading image...", key: "imageUpload" });
          
          // Upload image to Cloudinary
          imageUrl = await uploadProfileImage(imageFile, user?.user_id!, token);
          
          if (imageUrl) {
            message.success({ content: "Image uploaded successfully!", key: "imageUpload" });
            console.log('Profile image updated successfully:', imageUrl);
            
            // Update the preview with the new image URL
            setImagePreview(imageUrl);
            
            // Add image URL to update data
            updateData.profile_image = imageUrl;
          } else {
            message.error({ content: "Failed to upload image, but will continue with profile update", key: "imageUpload" });
          }
        } catch (uploadError: any) {
          message.error({ content: uploadError.message || "Failed to upload image", key: "imageUpload" });
          console.error("Image upload error:", uploadError);
          // Continue with profile update even if image upload fails
        }
      }

      // Then update the profile data
      console.log('Updating profile with data:', updateData);
      const updatedUser = await updateUserProfile(updateData, token);
      console.log('Profile updated successfully:', updatedUser);
      
      // Update user state with the updated user data
      if (updatedUser && updatedUser.user) {
        setUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ...updatedUser.user,
            // Ensure profile_image is set from our upload if it was successful
            ...(imageUrl && { profile_image: imageUrl })
          };
        });
        
        message.success("Profile updated successfully!");
      } else {
        console.warn("User data not returned from update call:", updatedUser);
        message.success("Profile information updated");
      }
      
      // Reset image file state after upload attempt
      setImageFile(null);
      
      // Refresh the profile data to ensure consistency
      fetchUserProfile();
      
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      if (error.response?.status === 401) {
        message.error("Session expired. Please login again.");
        navigate("/");
      } else if (error.response?.status === 404) {
        message.error("Profile update service not available. Please try again later.");
        console.error("API endpoint not found:", error.config?.url);
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
    <AppLayout userRole="guest" userName={user?.fullname}>
      <Content className="p-6 mx-auto w-full max-w-4xl bg-[#F5F5F5]">
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
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center z-10">
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: '#D4AF37' }} spin />} />
                  </div>
                )}
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
                  disabled={uploadingImage}
                  customRequest={({ file, onSuccess }) => {
                    setTimeout(() => {
                      onSuccess?.("ok");
                    }, 0);
                  }}
                >
                  <Button
                    type="text"
                    icon={uploadingImage ? <LoadingOutlined /> : <UploadOutlined />}
                    className="absolute bottom-0 right-0 bg-[#2C1810] p-2 rounded-full cursor-pointer hover:bg-[#3D2317] text-white"
                    disabled={uploadingImage}
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
                  <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-gray-100 text-black font-medium w-12 border-r rounded-l border-[#D4AF37] z-[1]">
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
                <Text type="secondary" className="text-xs mt-1">Enter your 10-digit phone number without the country code</Text>
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
    </AppLayout>
  );
};

export default Profile; 