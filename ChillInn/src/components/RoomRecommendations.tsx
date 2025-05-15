import React, { useEffect, useState } from 'react';
import { Card, Typography, Rate, Button, List, Skeleton, Empty, Tag, Badge, Spin, message } from 'antd';
import { FireOutlined, InfoCircleOutlined, RightOutlined } from '@ant-design/icons';
import { getUserRecommendations } from '../lib/recommendationService';
import { getRoomById } from '../lib/roomService';
import { getRoomThumbnail } from '../lib/cloudinaryService';
import { useNavigate } from 'react-router-dom';
import CachedImage from './CachedImage';

const { Title, Text, Paragraph } = Typography;

interface RoomRecommendation {
  room_id: string | number;
  room_number: string;
  room_type: string;
  relevance_score: number;
  reasoning: string;
  room_image?: string | null;
}

interface RoomRecommendationsProps {
  token: string;
  userId: string;
  limit?: number;
  showReasoning?: boolean;
  compact?: boolean;
}

const RoomRecommendations: React.FC<RoomRecommendationsProps> = ({ 
  token, 
  userId, 
  limit = 3,
  showReasoning = true,
  compact = false
}) => {
  const [recommendations, setRecommendations] = useState<RoomRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendations();
  }, [token, userId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!token) {
        throw new Error('Authentication token is required');
      }
      
      const recommendationData = await getUserRecommendations(userId, token);
      console.log('Fetched recommendations:', recommendationData);
      
      // Apply limit if specified
      const limitedRecommendations = recommendationData.slice(0, limit);
      
      // Load room images for each recommendation
      const enhancedRecommendations = await Promise.all(
        limitedRecommendations.map(async (recommendation) => {
          try {
            let roomImage = null;
            const roomId = recommendation.room_id;
            console.log(`Fetching image for room ID: ${roomId} (type: ${typeof roomId})`);
            
            // First, try to get the room thumbnail - this is the most reliable method
            try {
              // Format room ID to ensure compatibility with MongoDB
              const thumbnailData = await getRoomThumbnail(roomId, token);
              console.log('Thumbnail data for room', roomId, ':', thumbnailData);
              
              // If thumbnail is available, use it
              if (thumbnailData && thumbnailData.imageUrl) {
                roomImage = thumbnailData.imageUrl;
                console.log('Using thumbnail image:', roomImage);
              }
            } catch (thumbnailError) {
              console.warn(`Error fetching thumbnail for room ${roomId}:`, thumbnailError);
              // Continue to try other methods if thumbnail fetch fails
            }
            
            // If no thumbnail found, try getting room details which might include images
            if (!roomImage) {
              try {
                const roomDetails = await getRoomById(roomId, token);
                console.log('Room details for room', roomId, ':', roomDetails);
                
                // Use the first image from the room's images array if available
                if (roomDetails && roomDetails.images && roomDetails.images.length > 0) {
                  roomImage = roomDetails.images[0];
                  console.log('Using room image from details:', roomImage);
                }
              } catch (roomDetailsError) {
                console.warn(`Error fetching room details for ${roomId}:`, roomDetailsError);
              }
            }
            
            // Return the recommendation with the image (or without if none found)
            return {
              ...recommendation,
              room_image: roomImage
            };
          } catch (error) {
            console.error(`Error fetching image for room ${recommendation.room_id}:`, error);
            return recommendation;
          }
        })
      );
      
      setRecommendations(enhancedRecommendations);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Unable to load recommendations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoom = (roomId: string | number) => {
    // Make sure we have a valid room ID for navigation
    if (!roomId) {
      console.error('Invalid room ID for navigation:', roomId);
      message.error('Cannot view room details: Invalid room ID');
      return;
    }
    
    // Ensure room ID is properly formatted as a string for navigation
    const formattedId = roomId.toString();
    console.log(`Navigating to room details with ID: ${formattedId}`);
    navigate(`/rooms/${formattedId}`);
  };

  if (loading) {
    return (
      <div className="w-full">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 rounded-md">
        <Text type="danger">{error}</Text>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Empty 
        description="No recommendations yet. Book a stay to get personalized suggestions!" 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Compact version for dashboard widget
  if (compact) {
    return (
      <List
        itemLayout="horizontal"
        dataSource={recommendations}
        renderItem={item => (
          <List.Item
            actions={[
              <Button 
                type="link" 
                onClick={() => handleViewRoom(item.room_id)}
                icon={<RightOutlined />}
              >
                View
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={
                item.room_image ? (
                  <div className="w-12 h-12 rounded-md overflow-hidden">
                    <CachedImage
                      src={item.room_image}
                      alt={`Room ${item.room_number}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Badge count={Math.round(item.relevance_score)} overflowCount={100}>
                    <div className="w-10 h-10 flex items-center justify-center bg-[#2C1810] text-white rounded-full">
                      {item.room_number}
                    </div>
                  </Badge>
                )
              }
              title={
                <div className="flex items-center gap-2">
                  <Text strong>{item.room_type}</Text>
                  {item.relevance_score > 85 && (
                    <Tag color="volcano" icon={<FireOutlined />}>Perfect Match</Tag>
                  )}
                </div>
              }
              description={
                <Text type="secondary" ellipsis>{showReasoning ? item.reasoning : `Room ${item.room_number}`}</Text>
              }
            />
          </List.Item>
        )}
      />
    );
  }

  // Full detailed version
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Title level={4} className="m-0">Recommended For You</Title>
        <Button type="link" onClick={fetchRecommendations}>Refresh</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((recommendation) => (
          <Badge.Ribbon 
            key={recommendation.room_id}
            text={`${recommendation.relevance_score}% Match`}
            color={recommendation.relevance_score > 85 ? 'volcano' : 'blue'}
          >
            <Card 
              hoverable
              className="h-full flex flex-col"
              cover={
                recommendation.room_image ? (
                  <CachedImage 
                    src={recommendation.room_image}
                    alt={`${recommendation.room_type} - Room ${recommendation.room_number}`} 
                    className="h-44 object-cover"
                    lazy={true}
                  />
                ) : (
                  <div className="h-44 bg-gray-200 flex items-center justify-center">
                    <Text type="secondary">No image available</Text>
                  </div>
                )
              }
              actions={[
                <Button 
                  type="primary" 
                  onClick={() => handleViewRoom(recommendation.room_id)}
                  className="bg-[#2C1810] hover:bg-[#3D2317]"
                >
                  View Room
                </Button>
              ]}
            >
              <Card.Meta
                title={
                  <div className="flex items-center justify-between">
                    <Text strong>{recommendation.room_type}</Text>
                    <Text type="secondary">Room {recommendation.room_number}</Text>
                  </div>
                }
                description={
                  <div className="mt-2">
                    {showReasoning && (
                      <Paragraph ellipsis={{ rows: 3 }} className="text-sm">
                        <InfoCircleOutlined className="mr-1" />
                        {recommendation.reasoning}
                      </Paragraph>
                    )}
                  </div>
                }
              />
            </Card>
          </Badge.Ribbon>
        ))}
      </div>
    </div>
  );
};

export default RoomRecommendations; 