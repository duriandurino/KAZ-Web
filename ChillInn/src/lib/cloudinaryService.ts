import axios from 'axios';
import apiClient from '../utils/apiClient';
import { formatId } from '../utils/mongoAdapter';

interface CloudinaryUploadParams {
  cloudName: string;
  uploadPreset: string;
  folder: string;
  resourceType: string;
  apiUrl: string;
}

interface CloudinaryResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  url: string;
  secure_url: string;
  created_at: string;
}

interface ImageMetadata {
  image_id: number;
  message: string;
  cloudinary_public_id: string;
  previous_removed?: boolean;
}

// Compress image before upload - returns a Promise that resolves to a Blob
async function compressImage(file: File, maxWidthHeight = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create a FileReader to read the file
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      // Create an image to get the dimensions
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidthHeight) {
            height *= maxWidthHeight / width;
            width = maxWidthHeight;
          }
        } else {
          if (height > maxWidthHeight) {
            width *= maxWidthHeight / height;
            height = maxWidthHeight;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with specified quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not compress image'));
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Could not read file'));
    };
  });
}

// Check if file needs compression
function shouldCompress(file: File): boolean {
  // Skip compression for small files or non-image files
  const isImage = file.type.startsWith('image/');
  const isSvg = file.type === 'image/svg+xml';
  const isSmall = file.size < 200 * 1024; // Skip if less than 200KB
  
  return isImage && !isSvg && !isSmall;
}

// Direct upload to Cloudinary
export async function uploadToCloudinary(file: File): Promise<CloudinaryResponse> {
  try {
    // Use the Cloudinary upload endpoint directly 
    // For better security, this should ideally go through your backend
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
    }
    
    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    // Compress image if needed
    let fileToUpload: File | Blob = file;
    if (shouldCompress(file)) {
      console.log(`Compressing image: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      try {
        const compressedBlob = await compressImage(file);
        console.log(`Compressed from ${Math.round(file.size / 1024)} KB to ${Math.round(compressedBlob.size / 1024)} KB`);
        
        // Create a new File from Blob to maintain file name
        fileToUpload = new File([compressedBlob], file.name, { type: file.type });
      } catch (compressionError) {
        console.warn('Image compression failed, using original file:', compressionError);
      }
    }
    
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'chillinn');
    
    console.log('Uploading to Cloudinary...', { cloudName, apiUrl });
    
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Add upload progress tracking
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      }
    });
    
    console.log('Cloudinary response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    
    // Provide more detailed error information based on the error type
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Cloudinary response error:', error.response.data);
        throw new Error(`Upload failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('No response received from Cloudinary. Please check your internet connection.');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
    
    throw new Error('Failed to upload image to Cloudinary');
  }
}

// Get profile image for a guest
export async function getProfileImage(guestId: number): Promise<{ imageUrl: string | null, image_id?: number }> {
  try {
    // Since there's no dedicated endpoint for profile images in the backend,
    // we'll use the user info endpoint to get the profile_image URL
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token available for getProfileImage');
      return { imageUrl: null };
    }
    
    // Get user info which should contain the profile_image field
    const response = await apiClient.get('/users/userinfobyid', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Check if user has a profile image URL
    if (response.data && response.data.profile_image) {
      return {
        imageUrl: response.data.profile_image,
        // We don't have image_id in this context
      };
    }
    
    return { imageUrl: null };
  } catch (error) {
    console.error(`Error getting profile image for guest ID ${guestId}:`, error);
    return { imageUrl: null };
  }
}

// Save profile image metadata
export async function saveProfileImage(
  guestId: number,
  cloudinaryResponse: CloudinaryResponse,
  token: string
): Promise<ImageMetadata> {
  try {
    console.log('Saving profile image for guest ID:', guestId);
    
    // Format user ID to ensure compatibility with MongoDB
    const formattedGuestId = formatId(guestId);
    
    // Since there's no dedicated endpoint for saving profile images,
    // we'll update the user profile with the profile_image field
    const response = await apiClient.put(
      '/users/update-user',
      {
        userId: formattedGuestId,
        profile_image: cloudinaryResponse.secure_url
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Profile image save response:', response.data);
    
    // Create a response structure that matches what the calling code expects
    return {
      image_id: 0, // We don't have a real image_id in this context
      message: "Profile image saved successfully",
      cloudinary_public_id: cloudinaryResponse.public_id
    };
  } catch (error) {
    console.error('Error saving profile image:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    throw error;
  }
}

// Save room thumbnail metadata to backend
export async function saveRoomThumbnail(
  roomId: number | string,
  cloudinaryResponse: CloudinaryResponse,
  token: string
): Promise<ImageMetadata> {
  try {
    console.log(`[DEBUG] Saving thumbnail metadata for room ID: ${roomId} (type: ${typeof roomId})`);
    
    // Format the room ID for MongoDB (ensure it's a proper string format)
    const formattedRoomId = formatId(roomId);
    console.log(`[DEBUG] Formatted room ID: ${formattedRoomId} (type: ${typeof formattedRoomId})`);
    
    // Ensure the room_id and image_url are properly set
    if (!formattedRoomId || !cloudinaryResponse.secure_url) {
      throw new Error('Missing required fields: room_id and image_url');
    }
    
    // Prepare request data with properly formatted room ID
    // For MongoDB, we need to send a properly formatted string ID
    const requestData = {
      room_id: formattedRoomId,
      image_url: cloudinaryResponse.secure_url,
      cloudinary_public_id: cloudinaryResponse.public_id,
      cloudinary_version: cloudinaryResponse.version,
      cloudinary_signature: cloudinaryResponse.signature,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height
    };
    
    console.log('[DEBUG] Request data for thumbnail:', JSON.stringify(requestData, null, 2));
    
    try {
      // Ensure we're setting the proper Content-Type header
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Send the actual request to save thumbnail metadata
      const response = await apiClient.post(
        '/images/room-thumbnail',
        requestData,
        { headers }
      );
      
      console.log('[DEBUG] Thumbnail save response:', response.data);
      
      return {
        image_id: response.data.image_id,
        message: response.data.message || "Room thumbnail updated successfully",
        cloudinary_public_id: response.data.cloudinary_public_id || cloudinaryResponse.public_id
      };
    } catch (error: any) {
      // Log the complete error for better debugging
      console.error('[DEBUG] Error response from server:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        requestData: error.config?.data
      });
      
      // If there's a MongoDB ObjectId casting error, provide more helpful error information
      if (error.response?.data?.error?.includes('Invalid room_id format')) {
        console.error('[DEBUG] Invalid room ID format. The backend requires a valid MongoDB ObjectId.');
        console.error('[DEBUG] Attempted with room ID:', formattedRoomId);
        throw new Error(`Invalid room ID format: ${formattedRoomId}`);
      }
      
      // If room not found, provide a helpful error
      if (error.response?.data?.error?.includes('Room with ID') && error.response?.data?.error?.includes('not found')) {
        console.error('[DEBUG] Room not found in database:', formattedRoomId);
        throw new Error(`Room with ID ${formattedRoomId} not found in database`);
      }
      
      // If the error is about missing fields, provide clarity
      if (error.response?.data?.error?.includes('Missing required fields')) {
        console.error('[DEBUG] Request is missing required fields:', error.response.data.error);
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[DEBUG] Error saving room thumbnail metadata:', error);
    throw error;
  }
}

// Save room preview image metadata to backend
export async function saveRoomPreviewImage(
  roomId: number | string,
  cloudinaryResponse: CloudinaryResponse,
  token: string
): Promise<ImageMetadata> {
  try {
    console.log(`[DEBUG] Saving preview image metadata for room ID: ${roomId} (type: ${typeof roomId})`);
    
    // Format the room ID for MongoDB (ensure it's a proper string format)
    const formattedRoomId = formatId(roomId);
    console.log(`[DEBUG] Formatted room ID: ${formattedRoomId} (type: ${typeof formattedRoomId})`);
    
    // Ensure the room_id and image_url are properly set
    if (!formattedRoomId || !cloudinaryResponse.secure_url) {
      throw new Error('Missing required fields: room_id and image_url');
    }
    
    // Prepare request data with properly formatted room ID
    // For MongoDB, we need to send a properly formatted string ID
    const requestData = {
      room_id: formattedRoomId,
      image_url: cloudinaryResponse.secure_url,
      cloudinary_public_id: cloudinaryResponse.public_id,
      cloudinary_version: cloudinaryResponse.version,
      cloudinary_signature: cloudinaryResponse.signature,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height
    };
    
    console.log('[DEBUG] Request data for preview image:', JSON.stringify(requestData, null, 2));
    
    try {
      // Ensure we're setting the proper Content-Type header
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Send the actual request to save preview image metadata
      const response = await apiClient.post(
        '/images/room-preview',
        requestData,
        { headers }
      );
      
      console.log('[DEBUG] Preview image save response:', response.data);
      
      return {
        image_id: response.data.image_id,
        message: response.data.message || "Room preview image added successfully",
        cloudinary_public_id: response.data.cloudinary_public_id || cloudinaryResponse.public_id
      };
    } catch (error: any) {
      // Log the complete error for better debugging
      console.error('[DEBUG] Error response from server:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        requestData: error.config?.data
      });
      
      // If there's a MongoDB ObjectId casting error, provide more helpful error information
      if (error.response?.data?.error?.includes('Invalid room_id format')) {
        console.error('[DEBUG] Invalid room ID format. The backend requires a valid MongoDB ObjectId.');
        console.error('[DEBUG] Attempted with room ID:', formattedRoomId);
        throw new Error(`Invalid room ID format: ${formattedRoomId}`);
      }
      
      // If room not found, provide a helpful error
      if (error.response?.data?.error?.includes('Room with ID') && error.response?.data?.error?.includes('not found')) {
        console.error('[DEBUG] Room not found in database:', formattedRoomId);
        throw new Error(`Room with ID ${formattedRoomId} not found in database`);
      }
      
      // If the error is about missing fields, provide clarity
      if (error.response?.data?.error?.includes('Missing required fields')) {
        console.error('[DEBUG] Request is missing required fields:', error.response.data.error);
        throw new Error(error.response.data.error);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[DEBUG] Error saving room preview image metadata:', error);
    throw error;
  }
}

// Get thumbnail for a room
export async function getRoomThumbnail(roomId: number | string, token?: string): Promise<{ imageUrl: string | null, image_id?: number | string }> {
  try {
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // Add the x-api-key header
      headers['x-api-key'] = import.meta.env.VITE_API_KEY;
    }

    // Format the room ID to ensure compatibility with MongoDB
    const formattedRoomId = formatId(roomId);
    console.log(`[DEBUG] Getting thumbnail for room ID: ${formattedRoomId}`);
    
    // Use apiClient to ensure proper baseURL handling
    const response = await apiClient.get(`/images/room-thumbnail/${formattedRoomId}`, {
      headers
    });
    
    console.log('[DEBUG] Room thumbnail response:', response.data);
    
    if (response.data) {
      // Handle both possible response formats (image_url or imageUrl)
      const imageUrl = response.data.image_url || response.data.imageUrl;
      return {
        imageUrl: imageUrl,
        image_id: response.data.image_id || response.data._id
      };
    }
    
    return { imageUrl: null };
  } catch (error) {
    console.error(`Error getting thumbnail for room ID ${roomId}:`, error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`No thumbnail found for room ID ${roomId}`);
      return { imageUrl: null };
    }
    return { imageUrl: null };
  }
}

// Get preview images for a room
export async function getRoomPreviewImages(roomId: number | string, token?: string): Promise<Array<{ imageUrl: string, image_id: number | string }>> {
  try {
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // Add the x-api-key header
      headers['x-api-key'] = import.meta.env.VITE_API_KEY;
    }

    // Format the room ID to ensure compatibility with MongoDB
    const formattedRoomId = formatId(roomId);
    console.log(`[DEBUG] Getting preview images for room ID: ${formattedRoomId}`);
    
    // Use apiClient to ensure proper baseURL handling
    const response = await apiClient.get(`/images/room-previews/${formattedRoomId}`, {
      headers
    });
    
    console.log('[DEBUG] Room preview images response:', response.data);
    
    if (response.data && response.data.images && Array.isArray(response.data.images)) {
      return response.data.images.map((image: any) => ({
        // Handle both possible response formats (image_url or imageUrl)
        imageUrl: image.image_url || image.imageUrl,
        image_id: image.image_id || image._id
      }));
    }
    
    // If there's no images array but there is data, try to handle it as a single image
    if (response.data && (response.data.image_url || response.data.imageUrl)) {
      return [{
        imageUrl: response.data.image_url || response.data.imageUrl,
        image_id: response.data.image_id || response.data._id
      }];
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting preview images for room ID ${roomId}:`, error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`No preview images found for room ID ${roomId}`);
      return [];
    }
    return [];
  }
}

// Delete an image
export async function deleteImage(imageId: number, token: string): Promise<boolean> {
  try {
    await apiClient.delete(`/images/${imageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting image ID ${imageId}:`, error);
    throw error;
  }
}

// Upload a profile image
export async function uploadProfileImage(file: File, guestId: number, token: string): Promise<string | null> {
  try {
    console.log(`Starting profile image upload for user ID: ${guestId}`);
    
    // First upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(file);
    console.log('Cloudinary upload successful:', cloudinaryResponse.secure_url);
    
    // Then save metadata to our backend
    const result = await saveProfileImage(guestId, cloudinaryResponse, token);
    
    if (result && result.message === "Profile image saved successfully") {
      console.log('Profile image successfully saved to backend');
      return cloudinaryResponse.secure_url;
    } else {
      console.error("Backend response indicates failure:", result);
      return null;
    }
  } catch (error) {
    console.error('Error in uploadProfileImage:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    throw error;
  }
}

// Upload a room thumbnail
export async function uploadRoomThumbnail(file: File, roomId: number | string, token: string): Promise<string | null> {
  try {
    console.log(`Starting thumbnail upload for room ID: ${roomId} (type: ${typeof roomId})`);
    
    // Validate roomId is not empty
    if (!roomId) {
      console.error('Empty room ID provided to uploadRoomThumbnail');
      throw new Error('Room ID is required for uploading a thumbnail');
    }
    
    // First upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(file);
    console.log('Cloudinary upload successful for thumbnail:', cloudinaryResponse.secure_url);
    
    // Format the room ID for MongoDB compatibility
    const formattedRoomId = formatId(roomId);
    
    // Additional validation after formatting
    if (!formattedRoomId) {
      console.error('Room ID formatting resulted in empty value:', roomId);
      throw new Error('Invalid room ID format - cannot be formatted correctly');
    }
    
    console.log(`Formatted room ID for thumbnail: ${formattedRoomId}`);
    
    // Prepare the request data
    const requestData = {
      room_id: formattedRoomId,
      image_url: cloudinaryResponse.secure_url,
      cloudinary_public_id: cloudinaryResponse.public_id,
      cloudinary_version: cloudinaryResponse.version,
      cloudinary_signature: cloudinaryResponse.signature,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height
    };
    
    console.log('Request data for room thumbnail:', JSON.stringify(requestData, null, 2));
    
    // Send the request to save the thumbnail
    const response = await apiClient.post(
      '/images/room-thumbnail',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_KEY
        }
      }
    );
    
    console.log('Backend response for thumbnail:', response.data);
    
    if (response.data && (response.data.message?.includes('successfully'))) {
      console.log('Thumbnail successfully saved to backend');
      // Return the Cloudinary URL directly
      return cloudinaryResponse.secure_url;
    } else {
      console.error("Backend response indicates failure for thumbnail:", response.data);
      return null;
    }
  } catch (error) {
    console.error('Error in uploadRoomThumbnail:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        request_data: error.config?.data
      });
    }
    throw error;
  }
}

// Upload a room preview image
export async function uploadRoomPreviewImage(file: File, roomId: number | string, token: string): Promise<string | null> {
  try {
    console.log(`Starting preview image upload for room ID: ${roomId} (type: ${typeof roomId})`);
    
    // Validate roomId is not empty
    if (!roomId) {
      console.error('Empty room ID provided to uploadRoomPreviewImage');
      throw new Error('Room ID is required for uploading a preview image');
    }
    
    // First upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(file);
    console.log('Cloudinary upload successful for preview:', cloudinaryResponse.secure_url);
    
    // Format the room ID for MongoDB compatibility
    const formattedRoomId = formatId(roomId);
    
    // Additional validation after formatting
    if (!formattedRoomId) {
      console.error('Room ID formatting resulted in empty value:', roomId);
      throw new Error('Invalid room ID format - cannot be formatted correctly');
    }
    
    console.log(`Formatted room ID for preview: ${formattedRoomId}`);
    
    // Prepare the request data
    const requestData = {
      room_id: formattedRoomId,
      image_url: cloudinaryResponse.secure_url,
      cloudinary_public_id: cloudinaryResponse.public_id,
      cloudinary_version: cloudinaryResponse.version,
      cloudinary_signature: cloudinaryResponse.signature,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height
    };
    
    console.log('Request data for room preview:', JSON.stringify(requestData, null, 2));
    
    // Send the request to save the preview image
    const response = await apiClient.post(
      '/images/room-preview',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_KEY
        }
      }
    );
    
    console.log('Backend response for preview image:', response.data);
    
    if (response.data && (response.data.message?.includes('successfully'))) {
      console.log('Preview image successfully saved to backend');
      // Return the Cloudinary URL directly
      return cloudinaryResponse.secure_url;
    } else {
      console.error("Backend response indicates failure for preview image:", response.data);
      return null;
    }
  } catch (error) {
    console.error('Error in uploadRoomPreviewImage:', error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        request_data: error.config?.data
      });
    }
    throw error;
  }
} 