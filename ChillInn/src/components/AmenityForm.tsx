import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Card, Typography, message, Switch } from 'antd';
import { getIconOptions } from '../utils/iconMapping';
import { AmenityCategory, AmenitySubmission, Amenity } from '../utils/types';
import { createAmenity, updateAmenity } from '../lib/amenityService';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

interface AmenityFormProps {
  initialValues?: Partial<Amenity>;
  onSuccess?: (amenity: Amenity) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

const AmenityForm: React.FC<AmenityFormProps> = ({
  initialValues,
  onSuccess,
  onCancel,
  isEditing = false,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [iconOptions] = useState(getIconOptions());

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        description: initialValues.description,
        icon_name: initialValues.icon_name,
        category: initialValues.category,
        is_active: initialValues.is_active ?? true,
      });
    }
  }, [initialValues, form]);

  const handleSubmit = async (values: AmenitySubmission) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required. Please login again.');
        return;
      }

      let amenity: Amenity;

      // Log the values before submission
      console.log('Submitting amenity data:', values);

      if (isEditing && initialValues?.amenity_id) {
        // Update existing amenity
        amenity = await updateAmenity(initialValues.amenity_id, values, token);
        message.success('Amenity updated successfully');
      } else {
        // Create new amenity
        amenity = await createAmenity(values, token);
        message.success('Amenity created successfully');
      }

      form.resetFields();
      
      if (onSuccess) {
        onSuccess(amenity);
      }
    } catch (error: any) {
      console.error('Error saving amenity:', error);
      
      // Detailed error handling
      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
        
        if (error.response.status === 409) {
          message.error('An amenity with this name already exists');
        } else if (error.response.status === 400) {
          const errorMessage = error.response.data?.error || 'Invalid amenity data. Please check your input.';
          message.error(errorMessage);
        } else if (error.response.status === 403 || error.response.status === 401) {
          message.error('Authentication error. Please login again.');
          // Consider redirecting to login page here
        } else {
          message.error('Failed to save amenity. Please try again later.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        message.error('Server not responding. Please check your internet connection.');
      } else {
        // Something happened in setting up the request
        message.error('An error occurred while saving. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="amenity-form-card shadow-sm">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: '',
          description: '',
          icon_name: 'WifiIcon',
          category: AmenityCategory.BASIC,
          is_active: true,
        }}
      >
        <Title level={4}>{isEditing ? 'Edit Amenity' : 'Add New Amenity'}</Title>

        <Form.Item
          name="name"
          label="Amenity Name"
          rules={[
            { required: true, message: 'Please enter the amenity name' },
            { min: 2, message: 'Name must be at least 2 characters' },
            { max: 50, message: 'Name must be at most 50 characters' }
          ]}
        >
          <Input 
            placeholder="e.g., WiFi, Pool, Breakfast"
            className="border-[#D4AF37] focus:ring-[#2C1810]"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { required: true, message: 'Please enter a description' },
            { min: 5, message: 'Description must be at least 5 characters' }
          ]}
        >
          <TextArea
            placeholder="Brief description of the amenity..."
            rows={3}
            className="border-[#D4AF37] focus:ring-[#2C1810]"
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="icon_name"
          label="Icon"
          rules={[{ required: true, message: 'Please select an icon' }]}
        >
          <Select
            placeholder="Select an icon"
            className="border-[#D4AF37] focus:ring-[#2C1810]"
            options={iconOptions}
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please select a category' }]}
        >
          <Select
            placeholder="Select a category"
            className="border-[#D4AF37] focus:ring-[#2C1810]"
          >
            {Object.values(AmenityCategory).map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="is_active"
          label="Active"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren="Active" 
            unCheckedChildren="Inactive"
            defaultChecked 
          />
        </Form.Item>

        <div className="flex justify-end gap-3 mt-6">
          {onCancel && (
            <Button onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            className="bg-[#2C1810] hover:bg-[#3D2317]"
          >
            {isEditing ? 'Update Amenity' : 'Add Amenity'}
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default AmenityForm; 