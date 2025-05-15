import React, { useState } from 'react';
import { Form, Input, Button, Select, InputNumber, Upload, Switch, Card, Typography, message, Spin } from 'antd';
import { UploadOutlined, DollarOutlined as PesoOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { PaymentMethod, PaymentSubmission, Payment } from '../utils/types';
import { recordPayment, generatePaymentReceipt } from '../lib/paymentService';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

interface PaymentFormProps {
  bookingId: string | number;
  totalPrice: number;
  remainingBalance: number;
  onSuccess?: (payment: Payment) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  initialValues?: {
    amount: number;
    method: string;
    transaction_id?: string;
    notes?: string;
    is_deposit?: boolean;
  };
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  bookingId,
  totalPrice,
  remainingBalance,
  onSuccess,
  onCancel,
  isEditing = false,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const handleSubmit = async (values: any) => {
    if (!isEditing && remainingBalance <= 0) {
      message.error('This booking is already fully paid');
      return;
    }

    if (!isEditing && values.amount > remainingBalance) {
      message.error(`Payment amount cannot exceed the remaining balance of ₱${remainingBalance.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required. Please login again.');
        return;
      }

      const paymentData: PaymentSubmission = {
        booking_id: bookingId,
        amount: values.amount,
        method: values.method,
        transaction_id: values.transaction_id,
        notes: values.notes,
        is_deposit: values.is_deposit
      };

      // Record the payment
      const payment = await recordPayment(paymentData, token);

      // If receipt file is provided, generate receipt URL
      if (payment.payment_id) {
        // Note: File upload should be handled by cloudinaryService, not paymentService
        // This is a simplified version that just generates a receipt URL
        await generatePaymentReceipt(payment.payment_id, token);
        message.success(isEditing ? 'Payment updated successfully' : 'Payment recorded and receipt generated successfully');
      } else {
        message.success(isEditing ? 'Payment updated successfully' : 'Payment recorded successfully');
      }

      form.resetFields();
      setFileList([]);
      setReceiptFile(null);
      
      if (onSuccess) {
        onSuccess(payment);
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        message.error(error.response.data.error || 'Invalid payment data. Please check your input.');
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        message.error('Authentication error. Please login again.');
      } else {
        message.error(isEditing ? 'Failed to update payment. Please try again later.' : 'Failed to record payment. Please try again later.');
      }
      console.error(isEditing ? 'Error updating payment:' : 'Error recording payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptUpload = (info: any) => {
    if (info.file.status === 'uploading') {
      setUploadingReceipt(true);
      return;
    }
    
    if (info.file.status === 'done') {
      const fileList = [...info.fileList].slice(-1); // Keep only the last file
      setFileList(fileList);
      if (fileList.length > 0) {
        setReceiptFile(fileList[0].originFileObj);
      } else {
        setReceiptFile(null);
      }
      setUploadingReceipt(false);
    }
    
    if (info.file.status === 'error') {
      message.error('Error uploading receipt. Please try again.');
      setUploadingReceipt(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isImage = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!isImage) {
        message.error('You can only upload image or PDF files!');
        return Upload.LIST_IGNORE;
      }
      return false; // Prevent auto-upload
    },
    fileList,
    onChange: handleReceiptUpload,
    maxCount: 1,
    showUploadList: { showRemoveIcon: !uploadingReceipt },
    disabled: uploadingReceipt,
  };

  return (
    <Card className="payment-form-card shadow-sm">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues || {
          amount: remainingBalance,
          method: PaymentMethod.CREDIT_CARD,
          is_deposit: remainingBalance < totalPrice
        }}
      >
        <Title level={4}>{isEditing ? 'Edit Payment' : 'Record Payment'}</Title>

        <Form.Item
          name="amount"
          label="Payment Amount (₱)"
          rules={[
            { required: true, message: 'Please enter the payment amount' },
            {
              validator: (_, value) => {
                if (value <= 0) {
                  return Promise.reject('Amount must be greater than zero');
                }
                if (!isEditing && value > remainingBalance) {
                  return Promise.reject(`Amount cannot exceed the remaining balance (₱${remainingBalance.toLocaleString()})`);
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <InputNumber
            min={0.01}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            className="border-[#D4AF37] focus:ring-[#2C1810]"
            addonBefore={<PesoOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="method"
          label="Payment Method"
          rules={[{ required: true, message: 'Please select a payment method' }]}
        >
          <Select
            placeholder="Select payment method"
            className="border-[#D4AF37] focus:ring-[#2C1810]"
          >
            {Object.values(PaymentMethod).map(method => (
              <Option key={method} value={method}>{method}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="transaction_id"
          label="Transaction ID/Reference"
        >
          <Input 
            placeholder="e.g., Credit card authorization code, check number, etc."
            className="border-[#D4AF37] focus:ring-[#2C1810]"
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea
            placeholder="Any additional information about this payment..."
            rows={2}
            className="border-[#D4AF37] focus:ring-[#2C1810]"
          />
        </Form.Item>

        <Form.Item
          name="receipt"
          label="Upload Receipt"
        >
          <Upload {...uploadProps} listType="picture">
            <Button icon={uploadingReceipt ? <LoadingOutlined spin /> : <UploadOutlined />} disabled={uploadingReceipt}>
              {uploadingReceipt ? 'Uploading...' : 'Upload Receipt (optional)'}
            </Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="is_deposit"
          label="Mark as Deposit"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren="Deposit" 
            unCheckedChildren="Full Payment"
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
            className="bg-[#2C1810] hover:bg-[#3D2317] text-white"
          >
            {isEditing ? 'Update Payment' : 'Record Payment'}
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default PaymentForm; 