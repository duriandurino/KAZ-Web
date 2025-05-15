import React, { useState } from 'react';
import { Form, Rate, Input, Button, message, Card, Typography } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { createReview } from '../lib/reviewService';
import { ReviewSubmission } from '../utils/types';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ReviewFormProps {
  bookingId: string | number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ bookingId, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: { rating: number; comment: string }) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required. Please login again.');
        return;
      }

      const reviewData: ReviewSubmission = {
        booking_id: bookingId,
        rating: values.rating,
        comment: values.comment
      };

      await createReview(reviewData, token);

      message.success('Thank you! Your review has been submitted successfully and is pending approval.');
      form.resetFields();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      // Handle specific error responses
      if (error.response?.status === 409) {
        message.error('You have already submitted a review for this booking.');
      } else if (error.response?.status === 400) {
        message.error(error.response.data.error || 'Invalid review data. Please check your input.');
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        message.error('Authentication error. Please login again.');
      } else {
        message.error('Failed to submit review. Please try again later.');
      }
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="review-form-card shadow-sm">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ rating: 5 }}
      >
        <Title level={4}>Share Your Experience</Title>
        <Text type="secondary" className="block mb-4">
          Your feedback helps other guests make better choices and helps us improve our service.
        </Text>

        <Form.Item
          name="rating"
          label="Rating"
          rules={[{ required: true, message: 'Please rate your experience' }]}
        >
          <Rate 
            character={<StarOutlined />} 
            className="text-[#D4AF37]"
            allowHalf
          />
        </Form.Item>

        <Form.Item
          name="comment"
          label="Your Review"
          rules={[
            { required: true, message: 'Please share your experience' },
            { min: 10, message: 'Review must be at least 10 characters' }
          ]}
        >
          <TextArea
            placeholder="Tell us about your stay..."
            rows={4}
            className="border-[#D4AF37] focus:ring-[#2C1810]"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <div className="flex justify-end gap-3 mt-4">
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
            Submit Review
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default ReviewForm; 