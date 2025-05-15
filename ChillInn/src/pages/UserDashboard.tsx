import { useState, useEffect } from "react";
import { Layout, Card, Typography, Button, message, Input, Select, Row, Col, Divider, Tag, Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import { SearchOutlined, UserOutlined, HeartOutlined, FireOutlined } from "@ant-design/icons";
import AppLayout from "../components/AppLayout";
import { Content } from "antd/es/layout/layout";
import CachedImage from '../components/CachedImage';
import RoomRecommendations from '../components/RoomRecommendations';
import { getAvailableRooms, getRoomTypes, getRoomTypeAmenities } from '../lib/roomService';
import { getUserProfile, saveRoom, unsaveRoom, getSavedRooms } from '../lib/userService';
import { getAmenities } from '../lib/amenityService';
import { Room, RoomType, Amenity } from '../utils/types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface User {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

interface SearchParams {
  searchTerm: string;
  guests: number;
  roomType: string;
  priceRange: string;
  amenities: string;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedRoomIds, setSavedRoomIds] = useState<Set<string>>(new Set());
  const [savingRoomIds, setSavingRoomIds] = useState<Set<string>>(new Set());
  const [availableRoomTypes, setAvailableRoomTypes] = useState<RoomType[]>([]);
  const [availableAmenities, setAvailableAmenities] = useState<Amenity[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [token, setToken] = useState<string | null>(null);
  
  const [searchParams, setSearchParams] = useState<SearchParams>({
    searchTerm: "",
    guests: 2,
    roomType: "all",
    priceRange: "all",
    amenities: "all"
  });

  useEffect(() => {
    const authToken = localStorage.getItem("token");
    setToken(authToken);
    
    fetchUserProfile();
    fetchRooms();
    fetchSavedRooms();
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setIsLoadingFilters(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      // Fetch room types and amenities in parallel
      const [roomTypesData, amenitiesData] = await Promise.all([
        getRoomTypes(token),
        getAmenities(token, { is_active: true })
      ]);
      
      console.log('Available room types:', roomTypesData);
      console.log('Available amenities:', amenitiesData);
      
      setAvailableRoomTypes(roomTypesData);
      setAvailableAmenities(amenitiesData.amenities);
    } catch (error) {
      console.error('Error fetching filters data:', error);
      message.error('Failed to load filter options');
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      const userData = await getUserProfile(token);
      setUser({
        id: userData.user_id,
        email: userData.email,
        fullname: userData.fullname,
        role: userData.role,
        status: 'active' // Assuming active status for logged-in users
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      message.error("Error fetching user profile");
      navigate("/");
    }
  };

  const fetchSavedRooms = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await getSavedRooms(token);
      console.log('Saved rooms:', response.rooms);
      
      // Create a Set of saved room IDs for easy lookup
      const savedIds = new Set<string>();
      response.rooms.forEach(room => {
        if (room.room_id) {
          savedIds.add(room.room_id.toString());
        }
      });
      
      setSavedRoomIds(savedIds);
    } catch (error) {
      console.error('Error fetching saved rooms:', error);
    }
  };

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      
      // Get all available rooms without any filters initially
      const response = await getAvailableRooms({
        limit: 50, // Show more rooms initially for better filtering options
        sort_by: 'price',
        sort_order: 'asc'
      }, token || undefined);
      
      console.log('Available rooms response:', response);
      setRooms(response.rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      message.error('Failed to load rooms. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      
      // Construct search options for the API call
      const searchOptions: any = {
        limit: 100 // Get more rooms for better client-side filtering
      };
      
      // Add search term if provided (for room name/description search)
      if (searchParams.searchTerm.trim() !== '') {
        searchOptions.search = searchParams.searchTerm.trim();
      }
      
      // Add guests filter if not default
      if (searchParams.guests > 0) {
        searchOptions.min_capacity = searchParams.guests;
      }
      
      console.log('Initial search options for API:', searchOptions);
      
      // Get all available rooms with basic filtering
      const response = await getAvailableRooms(searchOptions, token || undefined);
      console.log('API response rooms:', response.rooms);
      
      // Apply additional filtering on the client side
      let filteredRooms = [...response.rooms];
      
      // Apply room type filter if selected
      if (searchParams.roomType !== 'all') {
        console.log(`Filtering by room type: ${searchParams.roomType}`);
        filteredRooms = filteredRooms.filter(room => 
          room.room_type.name === searchParams.roomType
        );
      }
      
      // Apply price range filter
      if (searchParams.priceRange !== 'all') {
        let minPrice = 0;
        let maxPrice = 1000000; // Large number to include all prices
        
        switch(searchParams.priceRange) {
          case 'budget':
            minPrice = 0;
            maxPrice = 3000;
            break;
          case 'mid':
            minPrice = 3001;
            maxPrice = 7000;
            break;
          case 'luxury':
            minPrice = 7001;
            maxPrice = 50000;
            break;
        }
        
        console.log(`Filtering by price range: ₱${minPrice} - ₱${maxPrice}`);
        
        // Filter rooms by price range
        filteredRooms = filteredRooms.filter(room => {
          const price = room.room_type.price;
          return price >= minPrice && price <= maxPrice;
        });
      }
      
      // Apply amenities filter if selected
      if (searchParams.amenities !== 'all') {
        const selectedAmenityId = searchParams.amenities;
        console.log(`Filtering by amenity ID: ${selectedAmenityId}`);
        
        // Find the selected amenity to get its name
        const selectedAmenity = availableAmenities.find(a => 
          a.amenity_id.toString() === selectedAmenityId.toString()
        );
        const selectedAmenityName = selectedAmenity?.name || '';
        
        if (selectedAmenityName) {
          console.log(`Selected amenity name: ${selectedAmenityName}`);
        }
        
        // Filter rooms that have the selected amenity
        filteredRooms = filteredRooms.filter(room => {
          // Check if room has amenities array
          if (!room.room_type.amenities || !Array.isArray(room.room_type.amenities)) {
            return false;
          }
          
          // Check if the selected amenity is in the room's amenities
          return room.room_type.amenities.some(amenity => {
            // Try ID-based matching first
            const selectedId = selectedAmenityId.toString();
            const amenityId = (amenity.amenity_id || '').toString();
            
            // If ID doesn't match but we have an amenity name, try matching by name too
            // This works as a fallback if the IDs don't match due to format issues
            if (selectedAmenityName && amenity.name) {
              return amenityId === selectedId || amenity.name.includes(selectedAmenityName);
            }
            
            return amenityId === selectedId;
          });
        });
      }
      
      console.log(`Filtered from ${response.rooms.length} to ${filteredRooms.length} rooms`);
      console.log('Final filtered rooms:', filteredRooms);
      
      setRooms(filteredRooms);
      
      const resultsCount = filteredRooms.length;
      if (resultsCount === 0) {
        message.info('No rooms found matching your criteria');
      } else {
        message.success(`Found ${resultsCount} available room${resultsCount !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error searching rooms:', error);
      message.error('Failed to search for rooms. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRoom = async (roomId: string | number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error('Please login to save rooms');
        return;
      }
      
      // Add roomId to savingRoomIds to show loading state
      setSavingRoomIds(prev => new Set(prev).add(roomId.toString()));
      
      const roomIdStr = roomId.toString();
      
      if (savedRoomIds.has(roomIdStr)) {
        // Unsave the room
        await unsaveRoom(roomId, token);
        message.success('Removed from saved rooms');
        
        // Remove from savedRoomIds
        const newSavedIds = new Set(savedRoomIds);
        newSavedIds.delete(roomIdStr);
        setSavedRoomIds(newSavedIds);
      } else {
        // Save the room
        await saveRoom(roomId, token);
        message.success('Added to saved rooms');
        
        // Add to savedRoomIds
        setSavedRoomIds(new Set(savedRoomIds).add(roomIdStr));
      }
    } catch (error) {
      console.error('Error saving/unsaving room:', error);
      message.error('Failed to update saved rooms');
    } finally {
      // Remove roomId from savingRoomIds when done
      setSavingRoomIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId.toString());
        return newSet;
      });
    }
  };

  const handleUnsaveRoom = async (roomId: string | number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error('Please login to unsave rooms');
        return;
      }
      
      await unsaveRoom(roomId, token);
      message.success('Removed from saved rooms');
      
      // Remove from savedRoomIds
      const newSavedIds = new Set(savedRoomIds);
      newSavedIds.delete(roomId.toString());
      setSavedRoomIds(newSavedIds);
    } catch (error) {
      console.error('Error unsaving room:', error);
      message.error('Failed to unsave room');
    }
  };

  if (isLoading && !rooms.length) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <AppLayout userRole="guest" userName={user?.fullname}>
      <Content className="p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Title level={4} className="mb-2">Welcome back, {user?.fullname || "Guest"}!</Title>
          <Paragraph className="mb-6">Discover your perfect stay at ChillInn.</Paragraph>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            type="card"
            className="mb-6"
          >
            <TabPane 
              tab={
                <span>
                  <SearchOutlined />
                  Browse Rooms
                </span>
              } 
              key="browse"
            >
              <Card className="mb-6 shadow-sm" style={{marginBottom:'1em'}}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="md:col-span-2">
                    <Text strong>Search</Text>
                    <Input 
                      placeholder="Search rooms, amenities..." 
                      prefix={<SearchOutlined />}
                      value={searchParams.searchTerm}
                      onChange={e => setSearchParams({...searchParams, searchTerm: e.target.value})}
                    />
                  </div>
                  <div>
                    <Text strong>Guests</Text>
                    <Select 
                      className="w-full"
                      value={searchParams.guests}
                      onChange={value => setSearchParams({...searchParams, guests: value})}
                    >
                      <Option value={1}>1 Guest</Option>
                      <Option value={2}>2 Guests</Option>
                      <Option value={3}>3 Guests</Option>
                      <Option value={4}>4+ Guests</Option>
                    </Select>
                  </div>
                  <div>
                    <Text strong>Room Type</Text>
                    <Select 
                      className="w-full"
                      loading={isLoadingFilters}
                      value={searchParams.roomType}
                      onChange={value => setSearchParams({...searchParams, roomType: value})}
                    >
                      <Option value="all">All Types</Option>
                      {availableRoomTypes.map(type => (
                        <Option key={type.room_type_id} value={type.name}>{type.name}</Option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Button 
                      type="primary" 
                      block 
                      onClick={handleSearch}
                      loading={isLoading}
                      className="bg-[#2C1810] hover:bg-[#3D2317]"
                    >
                      Search
                    </Button>
                  </div>
                </div>
                
                <Divider className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Text strong>Price Range</Text>
                    <Select 
                      className="w-full"
                      value={searchParams.priceRange}
                      onChange={value => setSearchParams({...searchParams, priceRange: value})}
                    >
                      <Option value="all">All Prices</Option>
                      <Option value="budget">Budget (₱0 - ₱3,000)</Option>
                      <Option value="mid">Mid-Range (₱3,001 - ₱7,000)</Option>
                      <Option value="luxury">Luxury (₱7,001+)</Option>
                    </Select>
                  </div>
                  <div>
                    <Text strong>Amenities</Text>
                    <Select 
                      className="w-full"
                      loading={isLoadingFilters}
                      value={searchParams.amenities}
                      onChange={value => setSearchParams({...searchParams, amenities: value})}
                    >
                      <Option value="all">All Amenities</Option>
                      {availableAmenities.map(amenity => (
                        <Option key={amenity.amenity_id} value={amenity.amenity_id}>{amenity.name}</Option>
                      ))}
                    </Select>
                  </div>
                </div>
              </Card>
              
              {/* Room listings */}
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2C1810]"></div>
                </div>
              ) : (
                <div>
                  {rooms.length === 0 ? (
                    <div className="text-center py-8">
                      <Title level={4}>No rooms found</Title>
                      <Paragraph>Try adjusting your search criteria</Paragraph>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rooms.map(room => (
                        <Card 
                          key={room.room_id} 
                          hoverable 
                          className="overflow-hidden"
                          cover={
                            <div className="h-48 overflow-hidden relative">
                              <CachedImage
                                src={room.images?.[0] || '/placeholder-room.jpg'}
                                alt={`${room.room_type.name} - Room ${room.room_number}`}
                                className="w-full h-full object-cover transition-transform hover:scale-105"
                              />
                              <Button
                                icon={<HeartOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  savedRoomIds.has(room.room_id.toString())
                                    ? handleUnsaveRoom(room.room_id)
                                    : handleSaveRoom(room.room_id);
                                }}
                                className={`absolute top-2 right-2 ${
                                  savedRoomIds.has(room.room_id.toString())
                                    ? 'text-red-500 bg-white'
                                    : 'text-gray-500 bg-white'
                                }`}
                                shape="circle"
                                loading={savingRoomIds.has(room.room_id.toString())}
                              />
                            </div>
                          }
                          onClick={() => navigate(`/rooms/${room.room_id}`)}
                        >
                          <Card.Meta
                            title={
                              <div className="flex justify-between items-center">
                                <span>{room.room_type.name}</span>
                                <Tag color="volcano">₱{room.room_type.price.toLocaleString()}</Tag>
                              </div>
                            }
                            description={
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <Text type="secondary">Room {room.room_number}</Text>
                                  <Text type="secondary">{room.room_type.capacity} guests</Text>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {room.room_type.amenities?.slice(0, 3).map((amenity, index) => (
                                    <Tag key={index}>{amenity.name}</Tag>
                                  ))}
                                  {room.room_type.amenities && room.room_type.amenities.length > 3 && (
                                    <Tag>+{room.room_type.amenities.length - 3} more</Tag>
                                  )}
                                </div>
                              </div>
                            }
                          />
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <FireOutlined />
                  Recommended For You
                </span>
              } 
              key="recommendations"
            >
              <Card className="shadow-sm">
                {user && token ? (
                  <RoomRecommendations 
                    userId={user.id.toString()} 
                    token={token} 
                    showReasoning={true}
                    limit={6}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Title level={4}>Sign in to see recommendations</Title>
                    <Paragraph>We'll suggest rooms based on your preferences and history</Paragraph>
                    <Button 
                      type="primary" 
                      onClick={() => navigate('/login')}
                      className="bg-[#2C1810] hover:bg-[#3D2317] mt-4"
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </Card>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <HeartOutlined />
                  Saved Rooms
                </span>
              } 
              key="saved"
            >
              <SavedRoomsContent 
                savedRoomIds={savedRoomIds} 
                handleUnsaveRoom={handleUnsaveRoom} 
                navigate={navigate}
                token={token}
              />
            </TabPane>
          </Tabs>
        </div>
      </Content>
    </AppLayout>
  );
};

// Saved rooms content component
interface SavedRoomsContentProps {
  savedRoomIds: Set<string>;
  handleUnsaveRoom: (roomId: string | number) => Promise<void>;
  navigate: (path: string) => void;
  token: string | null;
}

const SavedRoomsContent: React.FC<SavedRoomsContentProps> = ({ savedRoomIds, handleUnsaveRoom, navigate, token }) => {
  const [savedRooms, setSavedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSavedRoomsDetails();
  }, [savedRoomIds, token]);
  
  const fetchSavedRoomsDetails = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      const response = await getSavedRooms(token);
      setSavedRooms(response.rooms || []);
    } catch (error) {
      console.error('Error fetching saved rooms details:', error);
      message.error('Failed to load saved rooms');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2C1810]"></div>
      </div>
    );
  }
  
  if (savedRooms.length === 0) {
    return (
      <div className="text-center py-8">
        <Title level={4}>No saved rooms yet</Title>
        <Paragraph>Browse rooms and click the heart icon to save your favorites</Paragraph>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {savedRooms.map(room => (
        <Card 
          key={room.room_id} 
          hoverable
          className="overflow-hidden"
          cover={
            <div className="h-48 overflow-hidden relative">
              <CachedImage
                src={room.images?.[0] || '/placeholder-room.jpg'}
                alt={`${room.room_type.name} - Room ${room.room_number}`}
                className="w-full h-full object-cover transition-transform hover:scale-105"
              />
              <Button
                icon={<HeartOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnsaveRoom(room.room_id);
                }}
                className="absolute top-2 right-2 text-red-500 bg-white"
                shape="circle"
              />
            </div>
          }
          onClick={() => navigate(`/rooms/${room.room_id}`)}
        >
          <Card.Meta
            title={
              <div className="flex justify-between items-center">
                <span>{room.room_type.name}</span>
                <Tag color="volcano">₱{room.room_type.price.toLocaleString()}</Tag>
              </div>
            }
            description={
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Text type="secondary">Room {room.room_number}</Text>
                  <Text type="secondary">{room.room_type.capacity} guests</Text>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {room.room_type.amenities?.slice(0, 3).map((amenity, index: number) => (
                    <Tag key={index}>{amenity.name}</Tag>
                  ))}
                  {room.room_type.amenities && room.room_type.amenities.length > 3 && (
                    <Tag>+{room.room_type.amenities.length - 3} more</Tag>
                  )}
                </div>
              </div>
            }
          />
        </Card>
      ))}
    </div>
  );
};

export default UserDashboard; 