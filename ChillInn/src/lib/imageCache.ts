/**
 * Simple cache for storing and retrieving images
 * This helps reduce bandwidth usage and improves loading times
 * for frequently accessed images
 */

// In-memory cache for images
const imageCache = new Map<string, string>();

// Cache expiration time in milliseconds (default: 24 hours)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// Cache size limit (number of items)
const CACHE_SIZE_LIMIT = 100;

// Cache timestamp to track when items were added
const cacheTimes = new Map<string, number>();

/**
 * Get image from cache or load from URL
 * @param url The image URL to load
 * @returns Promise resolving to the cached image URL (data URL or original URL)
 */
export async function getCachedImage(url: string): Promise<string> {
  // Return cached version if available
  if (imageCache.has(url)) {
    // Update the timestamp to mark this as recently used
    cacheTimes.set(url, Date.now());
    return imageCache.get(url)!;
  }
  
  try {
    // Fetch the image and convert to data URL
    const response = await fetch(url, { cache: 'force-cache' });
    const blob = await response.blob();
    
    // Skip caching for large images
    if (blob.size > 1024 * 1024) { // 1MB
      console.log(`Image too large to cache: ${url} (${Math.round(blob.size / 1024)} KB)`);
      return url;
    }
    
    // Convert to data URL
    const dataUrl = await blobToDataURL(blob);
    
    // Manage cache size
    if (imageCache.size >= CACHE_SIZE_LIMIT) {
      removeOldestItem();
    }
    
    // Add to cache
    imageCache.set(url, dataUrl);
    cacheTimes.set(url, Date.now());
    
    return dataUrl;
  } catch (error) {
    console.error('Error caching image:', error);
    return url; // Fall back to original URL if caching fails
  }
}

/**
 * Check if the cache has a valid entry for the URL
 * @param url Image URL to check
 * @returns true if a valid cached version exists
 */
export function hasCachedImage(url: string): boolean {
  if (!imageCache.has(url)) return false;
  
  // Check if cache is expired
  const timestamp = cacheTimes.get(url) || 0;
  if (Date.now() - timestamp > CACHE_EXPIRATION) {
    // Clear expired item
    imageCache.delete(url);
    cacheTimes.delete(url);
    return false;
  }
  
  return true;
}

/**
 * Preload an image into the cache
 * @param url The image URL to preload
 */
export function preloadImage(url: string): void {
  if (!hasCachedImage(url)) {
    getCachedImage(url).catch(error => {
      console.warn('Failed to preload image:', error);
    });
  }
}

/**
 * Clear the entire image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
  cacheTimes.clear();
}

/**
 * Remove specific URL from cache
 * @param url The image URL to remove
 */
export function removeCachedImage(url: string): void {
  imageCache.delete(url);
  cacheTimes.delete(url);
}

/**
 * Get cache statistics
 * @returns Object with cache stats
 */
export function getCacheStats(): { size: number, items: number, oldestTimestamp: number } {
  let totalSize = 0;
  let oldestTimestamp = Date.now();
  
  // Calculate total size in bytes (approximately)
  imageCache.forEach(dataUrl => {
    totalSize += dataUrl.length * 0.75; // Base64 is ~4/3 of the actual size
  });
  
  // Find oldest item
  cacheTimes.forEach(timestamp => {
    if (timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp;
    }
  });
  
  return {
    size: Math.round(totalSize / 1024), // Size in KB
    items: imageCache.size,
    oldestTimestamp
  };
}

// Helper function to convert blob to data URL
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Remove the oldest item from the cache
function removeOldestItem(): void {
  let oldestTimestamp = Date.now();
  let oldestUrl: string | null = null;
  
  cacheTimes.forEach((timestamp, url) => {
    if (timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp;
      oldestUrl = url;
    }
  });
  
  if (oldestUrl) {
    imageCache.delete(oldestUrl);
    cacheTimes.delete(oldestUrl);
  }
} 