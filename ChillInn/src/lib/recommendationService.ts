import axios from 'axios';
import { getUserProfile } from './userService';
import { getRoomById, getAllRooms, getRoomTypes } from './roomService';
import { getGuestBookings } from './bookingService';
import { Booking, Room } from '../utils/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Fallback if OpenRouter isn't available
const BACKUP_MODEL = import.meta.env.VITE_OPENROUTER_MODEL;

// Define interfaces for our data structures
interface UserData {
  fullname: string;
  specialRequests: string;
  pastBookings: {
    roomType: string;
    checkIn: string;
    checkOut: string;
  }[];
  preferredLanguage: string;
}

interface RoomData {
  roomId: string | number;
  roomNumber: string;
  roomTypeName: string;
  price: number;
  description: string;
  capacity: number;
  amenities: string[];
}

interface Recommendation {
  room_id: string | number;
  room_number: string;
  room_type: string;
  relevance_score: number;
  reasoning: string;
}

interface UserProfile {
  fullname: string;
  special_requests?: string;
  language?: string;
  [key: string]: any;
}

/**
 * Fetches personalized room recommendations for a user based on their history and preferences
 * 
 * @param {string} userId - The user's ID
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Array of recommended rooms with reasoning
 */
export const getUserRecommendations = async (userId: string, token: string): Promise<Recommendation[]> => {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    // Get user profile, bookings, and available rooms in parallel
    const [userProfile, bookingsResponse, availableRoomsData, roomTypes] = await Promise.all([
      getUserProfile(token) as Promise<UserProfile>,
      getGuestBookings(token),
      getAllRooms(token),
      getRoomTypes(token)
    ]);
    
    // Extract user preferences from previous bookings and profile
    const pastBookings = bookingsResponse.bookings.filter((booking: Booking) => 
      new Date(booking.check_out) < new Date()
    );
    
    // Prepare user history and preference data
    const userData: UserData = {
      fullname: userProfile.fullname,
      specialRequests: userProfile.special_requests || '',
      pastBookings: pastBookings.map((booking: Booking) => ({
        roomType: booking.room_type || booking.room_name || 'Standard Room',
        checkIn: booking.check_in,
        checkOut: booking.check_out
      })),
      preferredLanguage: userProfile.language || 'en',
    };
    
    // Prepare room data
    const roomData: RoomData[] = availableRoomsData.rooms.map((room: Room) => {
      const roomType = roomTypes.find(rt => rt.room_type_id === room.room_type.room_type_id);
      return {
        roomId: room.room_id,
        roomNumber: room.room_number,
        roomTypeName: room.room_type.name || 'Unknown',
        price: room.room_type.price || 0,
        description: room.room_type.description || '',
        capacity: room.room_type.capacity || 1,
        amenities: (room.room_type.amenities || []).map(a => a.name || '')
      };
    });
    
    // Get AI recommendations
    const recommendations = await getAIRecommendations(userData, roomData);
    
    // Store recommendations in MongoDB for future reference and improvement
    await storeUserRecommendations(userId, recommendations, token);
    
    return recommendations;
  } catch (error) {
    console.error('Error getting user recommendations:', error);
    throw error;
  }
};

/**
 * Process the AI recommendations to ensure they have valid room IDs
 * This maps room numbers to actual MongoDB IDs if needed
 */
function processRecommendations(recommendations: any[], roomData: RoomData[]): Recommendation[] {
  return recommendations.map(rec => {
    // Check if the room_id looks like a valid MongoDB ObjectId
    const isLikelyObjectId = typeof rec.room_id === 'string' && 
      (rec.room_id.length === 24 || rec.room_id.match(/^[0-9a-fA-F]{24}$/));
      
    if (isLikelyObjectId) {
      // If it looks like a valid ObjectId, use it directly
      return {
        ...rec,
        room_id: rec.room_id
      };
    } else {
      // If it doesn't look like an ObjectId, try to find the matching room from roomData
      // First try to match by room_id directly
      let matchedRoom = roomData.find(r => r.roomId.toString() === rec.room_id.toString());
      
      // If no match found by ID, try to match by room_number
      if (!matchedRoom) {
        matchedRoom = roomData.find(r => r.roomNumber === rec.room_number);
      }
      
      if (matchedRoom) {
        return {
          ...rec,
          room_id: matchedRoom.roomId
        };
      }
      
      // If no match found, return as is but log a warning
      console.warn(`Could not find a matching room for recommendation: ${JSON.stringify(rec)}`);
      return rec;
    }
  });
}

/**
 * Call OpenRouter API to get room recommendations
 * 
 * @param {UserData} userData - User profile and history data
 * @param {RoomData[]} roomData - Available rooms data
 * @returns {Promise<Recommendation[]>} - Array of recommended rooms with reasoning
 */
const getAIRecommendations = async (userData: UserData, roomData: RoomData[]): Promise<Recommendation[]> => {
  try {
    // Construct prompt for recommendation
    const prompt = constructRecommendationPrompt(userData, roomData);
    
    console.log('Sending recommendation request to LLM model:', import.meta.env.VITE_OPENROUTER_MODEL);
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: import.meta.env.VITE_OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a hotel recommendation assistant who provides personalized room suggestions based on guest preferences and history. Your response MUST be valid JSON with a recommendations array. You must use the exact room IDs provided in the input data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'ChillInn Hotel Recommendations'
        }
      }
    );
    
    console.log('Received recommendation response from LLM');
    
    // Get the response content
    const responseContent = response.data.choices[0].message.content;
    console.log('Raw response content type:', typeof responseContent);
    
    // Parse the response
    let recommendationsData;
    
    // Try different parsing strategies
    try {
      // If the response is already an object (some models return this way)
      if (typeof responseContent === 'object' && responseContent !== null) {
        recommendationsData = responseContent;
        console.log('Response was already a parsed object');
      } 
      // If it's a string that needs parsing
      else if (typeof responseContent === 'string') {
        // Try to extract JSON if it's embedded in other text (some models like deepseek do this)
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          recommendationsData = JSON.parse(jsonStr);
          console.log('Successfully extracted and parsed JSON from string response');
        } else {
          // Just try parsing the whole thing
          recommendationsData = JSON.parse(responseContent);
          console.log('Successfully parsed string response as JSON');
        }
      }
      
      // Verify that we have a recommendations array
      if (!recommendationsData || !Array.isArray(recommendationsData.recommendations)) {
        console.warn('Response did not contain a recommendations array:', recommendationsData);
        // Try to locate recommendations in another property if the structure is different
        if (recommendationsData && typeof recommendationsData === 'object') {
          // Look for an array in any property that might contain our recommendations
          for (const key in recommendationsData) {
            if (Array.isArray(recommendationsData[key]) && 
                recommendationsData[key].length > 0 && 
                (recommendationsData[key][0].room_id || recommendationsData[key][0].room_number)) {
              console.log(`Found recommendations array in property "${key}"`);
              // Process the recommendations to ensure they have valid room IDs
              const processedRecs = processRecommendations(recommendationsData[key], roomData);
              return processedRecs;
            }
          }
        }
        return getFallbackRecommendations(roomData);
      }
      
      // Process the recommendations to ensure they have valid room IDs
      const processedRecommendations = processRecommendations(recommendationsData.recommendations, roomData);
      return processedRecommendations;
    } catch (error) {
      console.error('Error parsing recommendation response:', error);
      console.error('Raw response that failed to parse:', responseContent);
      return getFallbackRecommendations(roomData);
    }
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return getFallbackRecommendations(roomData);
  }
};

/**
 * Construct a detailed prompt for the AI to generate recommendations
 */
const constructRecommendationPrompt = (userData: UserData, roomData: RoomData[]): string => {
  return `
Please analyze the following guest information and available rooms to provide personalized hotel room recommendations:

### Guest Information
- Name: ${userData.fullname}
- Special Requests: ${userData.specialRequests || 'None'}
- Preferred Language: ${userData.preferredLanguage || 'English'}

### Past Bookings
${userData.pastBookings.length > 0 
  ? userData.pastBookings.map(booking => `- ${booking.roomType} from ${new Date(booking.checkIn).toLocaleDateString()} to ${new Date(booking.checkOut).toLocaleDateString()}`).join('\n')
  : 'No past bookings'}

### Available Rooms
${roomData.map(room => 
  `- ID: ${room.roomId} | Room ${room.roomNumber} (${room.roomTypeName}): Price ${room.price} PHP/night, Capacity: ${room.capacity} people
   Description: ${room.description.substring(0, 100)}${room.description.length > 100 ? '...' : ''}
   Amenities: ${room.amenities.join(', ')}`
).join('\n')}

Based on this information, please recommend up to 3 rooms for this guest that would best match their preferences and past booking patterns. Return your response in this JSON format:

{
  "recommendations": [
    {
      "room_id": "[exact room ID from the list above]",
      "room_number": "room_number_here",
      "room_type": "room_type_name_here",
      "relevance_score": 95,
      "reasoning": "Explanation of why this room is recommended"
    }
  ]
}

IMPORTANT: You MUST use the exact room ID from the list above (starting with 'ID:') for the room_id field. Do NOT use the room number as the room_id.
Only include available rooms. Include relevance score from 0-100 to indicate how well the room matches the guest's preferences. Provide specific reasoning for each recommendation.
`;
};

/**
 * Format ID to ensure compatibility with MongoDB and API endpoints
 */
function formatId(id: string | number): string {
  // If it's already a string, return it (or convert number to string)
  return id?.toString() || '';
}

/**
 * Get fallback recommendations if AI service fails
 */
const getFallbackRecommendations = (roomData: RoomData[]): Recommendation[] => {
  // Sort rooms by price as a simple fallback recommendation strategy
  const sortedRooms = [...roomData].sort((a, b) => a.price - b.price);
  
  // Return the top 3 or fewer if less available
  return sortedRooms.slice(0, Math.min(3, sortedRooms.length)).map(room => ({
    room_id: formatId(room.roomId),
    room_number: room.roomNumber,
    room_type: room.roomTypeName,
    relevance_score: 60, // Default score
    reasoning: "This room is available at a good price point."
  }));
};

/**
 * Store user recommendations in the MongoDB backend
 */
const storeUserRecommendations = async (userId: string, recommendations: Recommendation[], token: string): Promise<void> => {
  try {
    for (const rec of recommendations) {
      // Store each recommendation in the database
      await axios.post(
        `${process.env.REACT_APP_API_URL || ''}/recommendations`,
        {
          guest: userId,
          service: rec.room_id, // Using room_id for the service field
          weight: rec.relevance_score / 20 // Convert 0-100 score to 0-5 weight
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-API-Key': process.env.REACT_APP_API_KEY
          }
        }
      );
    }
  } catch (error) {
    console.error('Error storing recommendations:', error);
    // Non-critical error, don't throw
  }
};

/**
 * Get recommended room details with full information
 */
export const getRecommendedRoomDetails = async (recommendationIds: (string | number)[], token: string) => {
  try {
    // Get full details for each recommended room
    const roomDetails = await Promise.all(
      recommendationIds.map(async (recId) => {
        try {
          // Format the ID to ensure compatibility with API
          const formattedId = formatId(recId);
          console.log(`Fetching full details for recommended room ID: ${formattedId}`);
          return await getRoomById(formattedId, token);
        } catch (error) {
          console.error(`Error fetching details for room ${recId}:`, error);
          // Return null instead of throwing to handle individual errors
          return null;
        }
      })
    );
    
    // Filter out null values (failed fetches)
    return roomDetails.filter(room => room !== null);
  } catch (error) {
    console.error('Error getting recommended room details:', error);
    throw error;
  }
}; 