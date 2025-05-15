/**
 * OpenRouter API client for AI-powered room recommendations
 * This utility handles communication with the OpenRouter API to generate personalized room recommendations
 * using Gemini AI based on user's preferences and booking history.
 */
import axios from 'axios';

// Define the base API URL
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Interface for OpenRouter chat completion request
interface OpenRouterRequest {
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  max_tokens?: number;
  temperature?: number;
}

// Interface for OpenRouter response
interface OpenRouterResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Interface for recommended room
export interface RecommendedRoom {
  room_type_id: string;
  name: string;
  description: string;
  reason: string;
  match_score: number;
}

/**
 * Get personalized room recommendations based on user preferences and past bookings
 * @param userId - The user ID to get recommendations for
 * @param preferences - User preferences including special requests, saved rooms, etc.
 * @param pastBookings - User's booking history
 * @param availableRooms - Available rooms to choose from
 * @returns Array of recommended rooms with reasons
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  preferences: {
    special_requests?: string;
    saved_rooms?: Array<{ id: string; name: string; type: string }>;
    preferred_amenities?: string[];
  },
  pastBookings: Array<{
    room_type: string;
    check_in: string;
    check_out: string;
    rating?: number;
  }>,
  availableRooms: Array<{
    room_type_id: string;
    name: string;
    type: string;
    description: string;
    price: number;
    amenities: string[];
    capacity: number;
  }>
): Promise<RecommendedRoom[]> => {
  try {
    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('Missing OpenRouter API key');
      return [];
    }
    
    // Prepare the data for the AI model
    const systemPrompt = `You are an AI hotel room recommendation system for ChillInn Hotel. 
    Your task is to analyze the user's preferences, past bookings, and available rooms to provide personalized recommendations.
    Consider the following factors:
    - User's stated preferences and special requests
    - Rooms the user has saved for later
    - Past booking history and any ratings given
    - Available room types and their amenities
    - Room capacity and price points
    
    Respond ONLY with JSON in the following format:
    [
      {
        "room_type_id": "string",
        "name": "string",
        "description": "string",
        "reason": "string explaining why this room is recommended",
        "match_score": number between 0-100
      }
    ]
    
    Provide at most 3 recommendations, ordered by match score descending.`;
    
    const userPrompt = JSON.stringify({
      user_id: userId,
      preferences: preferences,
      past_bookings: pastBookings,
      available_rooms: availableRooms
    }, null, 2);
    
    // Prepare request to OpenRouter API
    const payload: OpenRouterRequest = {
      model: import.meta.env.VITE_OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };
    
    // Make the API request
    const response = await axios.post<OpenRouterResponse>(
      API_URL,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin, // Required by OpenRouter
          'X-Title': 'ChillInn Hotel Recommendations'
        }
      }
    );
    
    // Parse the response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      
      try {
        // Parse the JSON response
        const recommendations = JSON.parse(content) as RecommendedRoom[];
        return recommendations;
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        return [];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    return [];
  }
};

/**
 * Generate an explanation of why a room was recommended
 * @param room The room object
 * @param userPreferences User preferences
 * @returns Detailed explanation of the recommendation
 */
export const generateRecommendationExplanation = async (
  room: any,
  userPreferences: any
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return "This room matches your preferences based on our recommendation system.";
    }
    
    const systemPrompt = `You are an AI hotel recommendation assistant. Generate a personalized explanation 
    of why a particular room is being recommended to a user based on their preferences and the room's features.
    Make the explanation conversational, friendly, and specific to the user's needs.
    Keep your response between 2-3 sentences.`;
    
    const userPrompt = JSON.stringify({
      room: room,
      user_preferences: userPreferences
    });
    
    const payload: OpenRouterRequest = {
      model: import.meta.env.VITE_OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.7
    };
    
    const response = await axios.post<OpenRouterResponse>(
      API_URL,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'ChillInn Hotel Recommendations'
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content.trim();
    }
    
    return "This room matches your preferences based on our recommendation system.";
  } catch (error) {
    console.error('Error generating explanation:', error);
    return "This room matches your preferences based on our recommendation system.";
  }
};

export default {
  getPersonalizedRecommendations,
  generateRecommendationExplanation
}; 