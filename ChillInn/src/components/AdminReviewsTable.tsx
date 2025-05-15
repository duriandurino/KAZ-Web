import React, { useState, useEffect } from 'react';
import { Table, Rate, Typography, Button, Space, Tag, Modal, message, Input, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getReviews, updateReviewApproval, deleteReview } from '../lib/reviewService';
import { Review } from '../utils/types';

const { Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const AdminReviewsTable: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    is_approved: undefined as boolean | undefined,
    room_id: undefined as number | undefined,
    guest_id: undefined as number | undefined,
    rating: undefined as number | undefined
  });
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      const options = {
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
        ...filters,
        search: searchText
      };

      const response = await getReviews(token, options);
      setReviews(response.reviews);
      setPagination({
        ...pagination,
        total: response.totalCount
      });
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      message.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setPagination({
      ...pagination,
      current: pagination.current
    });
  };

  const handleApproveReview = async (reviewId: number, approve: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      await updateReviewApproval(reviewId, approve, token);
      message.success(`Review ${approve ? 'approved' : 'unapproved'} successfully`);
      
      // Update the local state to reflect the change
      setReviews(reviews.map(review => 
        review.review_id === reviewId 
          ? { ...review, is_approved: approve } 
          : review
      ));
    } catch (error) {
      console.error('Error updating review:', error);
      message.error(`Failed to ${approve ? 'approve' : 'unapprove'} review`);
    }
  };

  const showDeleteConfirm = (reviewId: number) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this review?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        return handleDeleteReview(reviewId);
      }
    });
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('Authentication required');
        return;
      }

      await deleteReview(reviewId, token);
      message.success('Review deleted successfully');
      
      // Remove the deleted review from the local state
      setReviews(reviews.filter(review => review.review_id !== reviewId));
      setPagination({
        ...pagination,
        total: pagination.total - 1
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      message.error('Failed to delete review');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
    fetchReviews();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, current: 1 });
  };

  const columns = [
    {
      title: 'Room',
      dataIndex: 'room_number',
      key: 'room_number',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Guest',
      dataIndex: 'guest_fullname',
      key: 'guest_fullname',
      render: (text: string, record: Review) => (
        <div>
          <Text>{text}</Text>
          <div>
            <Text type="secondary" className="text-xs">{record.guest_email}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled defaultValue={rating} />
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}>
          {text}
        </Paragraph>
      )
    },
    {
      title: 'Date',
      dataIndex: 'review_date',
      key: 'review_date',
      render: (date: string) => dayjs(date).format('MMMM D, YYYY')
    },
    {
      title: 'Status',
      dataIndex: 'is_approved',
      key: 'is_approved',
      render: (isApproved: boolean) => (
        isApproved ? 
          <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag> : 
          <Tag color="warning" icon={<CloseCircleOutlined />}>Pending</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Review) => (
        <Space size="small">
          {!record.is_approved ? (
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckCircleOutlined />}
              onClick={() => handleApproveReview(record.review_id, true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
          ) : (
            <Button 
              size="small" 
              icon={<CloseCircleOutlined />}
              onClick={() => handleApproveReview(record.review_id, false)}
            >
              Unapprove
            </Button>
          )}
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => showDeleteConfirm(record.review_id)}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-reviews-table">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="filters flex flex-wrap gap-3">
          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => handleFilterChange('is_approved', value)}
          >
            <Option value={true}>Approved</Option>
            <Option value={false}>Pending</Option>
          </Select>
          
          <Select
            placeholder="Filter by rating"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => handleFilterChange('rating', value)}
          >
            {[5, 4, 3, 2, 1].map(rating => (
              <Option key={rating} value={rating}>
                {rating} <Rate disabled defaultValue={rating} className="scale-75 ml-1" />
              </Option>
            ))}
          </Select>
        </div>
        
        <Search
          placeholder="Search reviews..."
          onSearch={handleSearch}
          style={{ width: 250 }}
          allowClear
        />
      </div>
      
      <Table
        columns={columns}
        dataSource={reviews}
        rowKey="review_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} reviews`
        }}
        onChange={handleTableChange}
        className="shadow-sm"
      />
    </div>
  );
};

export default AdminReviewsTable; 