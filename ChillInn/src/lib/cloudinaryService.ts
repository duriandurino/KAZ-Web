import axios from 'axios';

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

// Save profile image metadata to backend
export async function saveProfileImage(
  guestId: number,
  cloudinaryResponse: CloudinaryResponse,
  token: string
): Promise<ImageMetadata> {
  try {
    const response = await axios.post(
      '/api/images/profile',
      {
        guest_id: guestId,
        image_url: cloudinaryResponse.secure_url,
        cloudinary_public_id: cloudinaryResponse.public_id,
        cloudinary_version: cloudinaryResponse.version,
        cloudinary_signature: cloudinaryResponse.signature,
        width: cloudinaryResponse.width,
        height: cloudinaryResponse.height
      },
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error saving profile image metadata:', error);
    throw error;
  }
}

// Save room thumbnail metadata to backend
export async function saveRoomThumbnail(
  roomId: number,
  cloudinaryResponse: CloudinaryResponse,
  token: string
): Promise<ImageMetadata> {
  try {
    const response = await axios.post(
      '/api/images/room-thumbnail',
      {
        room_id: roomId,
        image_url: cloudinaryResponse.secure_url,
        cloudinary_public_id: cloudinaryResponse.public_id,
        cloudinary_version: cloudinaryResponse.version,
        cloudinary_signature: cloudinaryResponse.signature,
        width: cloudinaryResponse.width,
        height: cloudinaryResponse.height
      },
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error saving room thumbnail metadata:', error);
    throw error;
  }
}

// Save room preview image metadata to backend
export async function saveRoomPreviewImage(
  roomId: number,
  cloudinaryResponse: CloudinaryResponse,
  token: string
): Promise<ImageMetadata> {
  try {
    const response = await axios.post(
      '/api/images/room-preview',
      {
        room_id: roomId,
        image_url: cloudinaryResponse.secure_url,
        cloudinary_public_id: cloudinaryResponse.public_id,
        cloudinary_version: cloudinaryResponse.version,
        cloudinary_signature: cloudinaryResponse.signature,
        width: cloudinaryResponse.width,
        height: cloudinaryResponse.height
      },
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error saving room preview image metadata:', error);
    throw error;
  }
}

// Get profile image
export async function getProfileImage(guestId: number): Promise<{ imageUrl: string | null, image_id?: number }> {
  try {
    const response = await axios.get(`/api/images/profile/${guestId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY
      }
    });
    
    if (response.data && response.data.imageUrl) {
      return {
        imageUrl: response.data.imageUrl,
        image_id: response.data.image_id
      };
    }
    
    return { imageUrl: null };
  } catch (error) {
    // If 404 (image not found), return null for imageUrl
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { imageUrl: null };
    }
    console.error('Error fetching profile image:', error);
    throw error;
  }
}

// Get room thumbnail
export async function getRoomThumbnail(roomId: number): Promise<{ imageUrl: string | null, image_id?: number }> {
  try {
    const response = await axios.get(`/api/images/room-thumbnail/${roomId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY
      }
    });
    
    if (response.data && response.data.imageUrl) {
      return {
        imageUrl: response.data.imageUrl,
        image_id: response.data.image_id
      };
    }
    
    return { imageUrl: null };
  } catch (error) {
    // If 404 (image not found), return null for imageUrl
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { imageUrl: null };
    }
    console.error('Error fetching room thumbnail:', error);
    throw error;
  }
}

// Get room preview images
export async function getRoomPreviewImages(roomId: number): Promise<Array<{ imageUrl: string, image_id: number }>> {
  try {
    const response = await axios.get(`/api/images/room-previews/${roomId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY
      }
    });
    
    if (response.data && response.data.images && response.data.images.length > 0) {
      return response.data.images.map((image: any) => ({
        imageUrl: image.imageUrl,
        image_id: image.image_id
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching room preview images:', error);
    return [];
  }
}

// Delete image
export async function deleteImage(imageId: number, token: string): Promise<boolean> {
  try {
    await axios.delete(`/api/images/${imageId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

// Combined function for uploading profile image + saving metadata in one step
export async function uploadProfileImage(file: File, guestId: number, token: string): Promise<string | null> {
  try {
    console.log(`Starting profile image upload process for guest ${guestId}`);
    
    // 1. Upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(file);
    console.log('Successfully uploaded to Cloudinary', cloudinaryResponse.secure_url);
    
    // 2. Save metadata to backend
    const metadataResponse = await saveProfileImage(guestId, cloudinaryResponse, token);
    console.log('Successfully saved image metadata', metadataResponse);
    
    // 3. Return the image URL for immediate display
    return cloudinaryResponse.secure_url;
  } catch (error) {
    console.error('Error in profile image upload process:', error);
    
    if (error instanceof Error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
    
    throw new Error('Image upload failed due to an unknown error');
  }
}

export async function uploadRoomThumbnail(file: File, roomId: number, token: string): Promise<string | null> {
  try {
    const cloudinaryResponse = await uploadToCloudinary(file);
    await saveRoomThumbnail(roomId, cloudinaryResponse, token);
    return cloudinaryResponse.secure_url;
  } catch (error) {
    console.error('Error in room thumbnail upload process:', error);
    return null;
  }
}

export async function uploadRoomPreviewImage(file: File, roomId: number, token: string): Promise<string | null> {
  try {
    const cloudinaryResponse = await uploadToCloudinary(file);
    await saveRoomPreviewImage(roomId, cloudinaryResponse, token);
    return cloudinaryResponse.secure_url;
  } catch (error) {
    console.error('Error in room preview image upload process:', error);
    return null;
  }
} 