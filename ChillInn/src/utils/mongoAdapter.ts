/**
 * MongoDB adapter utility functions
 * 
 * This file contains utility functions to adapt MongoDB responses
 * to the format expected by the frontend. It handles differences like:
 * - Converting _id to id fields
 * - Managing MongoDB ObjectId strings vs. numeric IDs
 * - Normalizing nested references
 * - Handling date formats
 */

// Type for MongoDB documents that may have _id field
interface MongoDocument {
  _id?: string | { toString(): string };
  [key: string]: any;
}

/**
 * Adapts MongoDB document ID fields to the format expected by the frontend
 * @param doc MongoDB document or response
 * @returns Adapted document with consistent ID fields
 */
export function adaptId<T extends MongoDocument>(doc: T): T & { id: string } {
  if (!doc) return doc as T & { id: string };
  
  // Create a new object to avoid mutating the original
  const adapted = { ...doc } as T & { id: string };
  
  // If MongoDB _id exists, add an id field with the same value
  if (doc._id) {
    adapted.id = typeof doc._id === 'string' ? doc._id : doc._id.toString();
  }
  
  // If the document has a specific entity ID (like user_id, room_id), use that for id as well
  const entityIdKey = Object.keys(doc).find(key => key.endsWith('_id') && key !== '_id');
  if (entityIdKey && doc[entityIdKey]) {
    const entityId = doc[entityIdKey];
    adapted.id = typeof entityId === 'string' ? entityId : entityId.toString();
  }
  
  return adapted;
}

/**
 * Adapts an array of MongoDB documents to have consistent ID fields
 * @param docs Array of MongoDB documents
 * @returns Adapted array with consistent ID fields
 */
export function adaptIds<T extends MongoDocument>(docs: T[]): (T & { id: string })[] {
  if (!docs || !Array.isArray(docs)) return [];
  return docs.map(doc => adaptId(doc));
}

/**
 * Transforms MongoDB response to match the service interface
 * @param doc MongoDB service document
 * @returns Transformed service object
 */
export function adaptService(doc: MongoDocument): any {
  if (!doc) return null;
  
  const adapted = adaptId(doc);
  
  return {
    ...adapted,
    service_id: adapted._id?.toString() || adapted.id,
    is_active: adapted.status === 'Active'
  };
}

/**
 * Transforms MongoDB response to match the amenity interface
 * @param doc MongoDB amenity document
 * @returns Transformed amenity object
 */
export function adaptAmenity(doc: MongoDocument): any {
  if (!doc) return null;
  
  const adapted = adaptId(doc);
  
  return {
    ...adapted,
    amenity_id: adapted._id?.toString() || adapted.id,
    is_active: adapted.status === 'Active'
  };
}

/**
 * Transforms MongoDB response to match the review interface
 * @param doc MongoDB review document
 * @returns Transformed review object
 */
export function adaptReview(doc: MongoDocument): any {
  if (!doc) return null;
  
  const adapted = adaptId(doc);
  
  return {
    ...adapted,
    review_id: adapted._id?.toString() || adapted.id,
    booking_id: adapted.booking?.toString() || adapted.booking_id,
    guest_id: adapted.guest?.toString() || adapted.guest_id,
    room_id: adapted.room?.toString() || adapted.room_id,
    review_date: adapted.review_date || adapted.created_at
  };
}

/**
 * Transforms MongoDB response to match the booking interface
 * @param doc MongoDB booking document
 * @returns Transformed booking object
 */
export function adaptBooking(doc: MongoDocument): any {
  if (!doc) return null;
  
  const adapted = adaptId(doc);
  
  return {
    ...adapted,
    booking_id: adapted._id?.toString() || adapted.id,
    guest_id: adapted.guest?.toString() || adapted.guest_id,
    room_id: adapted.room?.toString() || adapted.room_id
  };
}

/**
 * Transforms MongoDB response to match the payment interface
 * @param doc MongoDB payment document
 * @returns Transformed payment object
 */
export function adaptPayment(doc: MongoDocument): any {
  if (!doc) return null;
  
  const adapted = adaptId(doc);
  
  return {
    ...adapted,
    payment_id: adapted._id?.toString() || adapted.id,
    booking_id: adapted.booking?.toString() || adapted.booking_id
  };
}

/**
 * Helper function to ensure MongoDB query parameters are properly formatted
 * @param params Query parameters object
 * @returns Formatted query parameters
 */
export function formatQueryParams(params: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {};
  
  // Handle each parameter type appropriately
  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined/null values
    if (value === undefined || value === null) return;
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      formatted[key] = value;
      return;
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      formatted[key] = value;
      return;
    }
    
    // Handle string values
    if (typeof value === 'string' && value.trim() !== '') {
      formatted[key] = value;
      return;
    }
    
    // Handle arrays
    if (Array.isArray(value) && value.length > 0) {
      formatted[key] = value;
      return;
    }
    
    // Handle date objects
    if (value instanceof Date) {
      formatted[key] = value.toISOString();
      return;
    }
  });
  
  return formatted;
}

/**
 * Formats an ID for use in MongoDB queries (handles both string and number IDs)
 * Ensures the ID is in a format that can be converted to a MongoDB ObjectId
 * 
 * @param id The ID to format
 * @returns Formatted ID string that's compatible with MongoDB ObjectId or null if invalid
 */
export function formatId(id: string | number | null | undefined): string {
  // Handle empty, null or undefined values
  if (id === null || id === undefined || id === '') {
    console.warn('formatId received empty, null or undefined ID');
    return '';
  }
  
  const idString = String(id).trim();
  
  // Return empty string if ID is empty after trimming
  if (!idString) {
    console.warn('formatId received ID that is empty after trimming');
    return '';
  }
  
  // Check if already a valid MongoDB ObjectId format (24 hex chars)
  if (/^[0-9a-fA-F]{24}$/.test(idString)) {
    return idString;
  }
  
  // If it's a numeric ID, we need special handling since MongoDB expects ObjectIds
  if (/^\d+$/.test(idString)) {
    console.log(`Converting numeric ID ${idString} to ObjectId-compatible format`);
    
    // To handle numeric IDs consistently, we can:
    // 1. If 12 characters or less, pad with leading zeros to create a valid ObjectId
    // 2. If more than 12 characters, truncate to 12 characters
    // 3. Convert to hex
    
    // MongoDB ObjectIds are 12 bytes (24 hex chars)
    if (idString.length <= 12) {
      // Pad with zeros to 12 characters
      const paddedId = idString.padStart(12, '0');
      
      // Convert to hex representation (24 characters)
      let hexId = '';
      for (let i = 0; i < 12; i += 2) {
        const charCode = parseInt(paddedId.substring(i, i+2), 10);
        hexId += (charCode < 16 ? '0' : '') + charCode.toString(16);
      }
      
      // Ensure we have a valid ObjectId length
      hexId = hexId.padEnd(24, '0');
      
      console.log(`Converted ID ${idString} to hex format: ${hexId}`);
      return hexId;
    }
  }
  
  // If it's not a valid ObjectId format and not a numeric ID,
  // log a warning and return the original string
  console.warn(`ID format may not be compatible with MongoDB ObjectId: ${idString}`);
  return idString;
}

export default {
  adaptId,
  adaptIds,
  adaptService,
  adaptAmenity,
  adaptReview,
  adaptBooking,
  adaptPayment,
  formatQueryParams,
  formatId
}; 