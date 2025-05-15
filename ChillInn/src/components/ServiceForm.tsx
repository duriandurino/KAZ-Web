import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Card, Typography, message, Switch, InputNumber } from 'antd';
import { getIconOptions } from '../utils/iconMapping';
import { ServiceCategory, ServiceSubmission, Service } from '../utils/types';
import { createService, updateService } from '../lib/serviceService';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

interface ServiceFormProps {
  initialValues?: Partial<Service>;
  onSuccess?: (service: Service) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

const ServiceForm: React.FC<ServiceFormProps> = ({
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
        price: initialValues.price,
        duration: initialValues.duration,
        icon_name: initialValues.icon_name,
        category: initialValues.category,
        is_active: initialValues.is_active ?? true,
      });
    }
  }, [initialValues, form]);

  const handleSubmit = async (values: ServiceSubmission) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required. Please login again.');
        return;
      }

      let service: Service;

      if (isEditing && initialValues?.service_id) {
        // Update existing service
        service = await updateService(initialValues.service_id, values, token);
        message.success('Service updated successfully');
      } else {
        // Create new service
        service = await createService(values, token);
        message.success('Service created successfully');
      }

      form.resetFields();
      
      if (onSuccess) {
        onSuccess(service);
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('A service with this name already exists');
      } else if (error.response?.status === 400) {
        message.error(error.response.data.error || 'Invalid service data. Please check your input.');
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        message.error('Authentication error. Please login again.');
      } else {
        message.error('Failed to save service. Please try again later.');
      }
      console.error('Error saving service:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const validatePositiveNumber = (_: any, value: number) => {
    if (value <= 0) {
      return Promise.reject('Value must be greater than zero');
    }
    return Promise.resolve();
  };

  return (
    <Card className="service-form-card shadow-sm">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: '',
          description: '',
          price: 0,
          duration: 60,
          icon_name: 'customerservice',
          category: ServiceCategory.OTHER,
          is_active: true,
        }}
      >
        <Title level={4}>{isEditing ? 'Edit Service' : 'Add New Service'}</Title>

        <Form.Item
          name="name"
          label="Service Name"
          rules={[
            { required: true, message: 'Please enter the service name' },
            { min: 2, message: 'Name must be at least 2 characters' },
            { max: 50, message: 'Name must be at most 50 characters' }
          ]}
        >
          <Input 
            placeholder="e.g., Room Cleaning, Airport Pickup, Spa Treatment"
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
            placeholder="Brief description of the service..."
            rows={3}
            className="border-[#D4AF37] focus:ring-[#2C1810]"
            maxLength={200}
            showCount
          />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="price"
            label="Price (₱)"
            rules={[
              { required: true, message: 'Please enter the price' },
              { validator: validatePositiveNumber }
            ]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              className="border-[#D4AF37] focus:ring-[#2C1810]"
              addonBefore="₱"
            />
          </Form.Item>

          <Form.Item
            name="duration"
            label="Duration (minutes)"
            rules={[
              { required: true, message: 'Please enter the duration' },
              { validator: validatePositiveNumber }
            ]}
          >
            <InputNumber
              min={1}
              step={5}
              style={{ width: '100%' }}
              className="border-[#D4AF37] focus:ring-[#2C1810]"
            />
          </Form.Item>
        </div>

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
            {Object.values(ServiceCategory).map(category => (
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
            {isEditing ? 'Update Service' : 'Add Service'}
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default ServiceForm; 