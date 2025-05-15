import React, { useState, useEffect } from 'react';
import { List, Rate, Avatar, Typography, Divider, Empty, Spin, Pagination } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getRoomReviews } from '../lib/reviewService';
import { Review } from '../utils/types';

const { Text, Paragraph, Title } = Typography;

interface ReviewListProps {
  roomId: number | string;
  limit?: number;
}

const ReviewList: React.FC<ReviewListProps> = ({ roomId, limit = 5 }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [roomId, page, limit]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await getRoomReviews(roomId, limit, (page - 1) * limit);
      setReviews(response.reviews);
      setTotalCount(response.totalCount);
      
      // Calculate average rating
      if (response.reviews.length > 0) {
        const sum = response.reviews.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(sum / response.reviews.length);
      }
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
      setReviews([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <Text type="danger">{error}</Text>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Empty 
        description="No reviews yet. Be the first to review this room!" 
        className="py-8"
      />
    );
  }

  return (
    <div className="reviews-container">
      <div className="mb-4 flex items-center gap-3">
        <Title level={5} className="my-0">Guest Reviews</Title>
        <div className="flex items-center gap-1">
          <Rate disabled defaultValue={averageRating} allowHalf />
          <Text className="text-gray-600">({totalCount})</Text>
        </div>
      </div>
      
      <List
        dataSource={reviews}
        renderItem={(review) => (
          <List.Item className="py-4">
            <div className="w-full">
              <div className="flex items-center gap-3">
                <Avatar icon={<UserOutlined />} />
                <div>
                  <Text strong>{review.guest_fullname}</Text>
                  <div>
                    <Rate disabled defaultValue={review.rating} className="text-sm" />
                    <Text type="secondary" className="ml-2 text-xs">
                      {dayjs(review.review_date).format('MMM D, YYYY')}
                    </Text>
                  </div>
                </div>
              </div>
              <Paragraph className="mt-3 text-gray-700">
                {review.comment}
              </Paragraph>
            </div>
          </List.Item>
        )}
        itemLayout="vertical"
        bordered={false}
        split={true}
        className="review-list"
      />
      
      {totalCount > limit && (
        <div className="flex justify-center mt-4">
          <Pagination
            current={page}
            pageSize={limit}
            total={totalCount}
            onChange={handlePageChange}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewList; 