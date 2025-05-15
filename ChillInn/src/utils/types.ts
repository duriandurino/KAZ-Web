// User roles
export type UserRole = 'admin' | 'guest';

// Review status
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// Review interface
export interface Review {
  review_id: number;
  booking_id: number;
  guest_id: number;
  room_id: number;
  rating: number;
  comment: string;
  review_date: string; // ISO date string
  is_approved: boolean;
  guest_fullname?: string;
  guest_email?: string;
  room_number?: string;
}

// ReviewSubmission interface for creating new reviews
export interface ReviewSubmission {
  booking_id: string | number;
  rating: number;
  comment: string;
}

// ReviewResponse interface for API responses
export interface ReviewResponse {
  reviews: Review[];
  totalCount: number;
}

// Booking status
export type BookingStatus = 'Pending' | 'Confirmed' | 'Checked-in' | 'Checked-out' | 'Cancelled';

// Payment status
export enum PaymentStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  REFUNDED = 'Refunded'
}

// Payment methods
export enum PaymentMethod {
  CREDIT_CARD = 'Credit Card',
  DEBIT_CARD = 'Debit Card',
  BANK_TRANSFER = 'Bank Transfer',
  CASH = 'Cash',
  PAYPAL = 'PayPal',
  MOBILE_PAYMENT = 'Mobile Payment',
  OTHER = 'Other'
}

// Payment interface
export interface Payment {
  payment_id: number;
  booking_id: number;
  amount: number;
  method: string;
  payment_date: string;
  status?: PaymentStatus;
  transaction_id?: string;
  notes?: string;
  recorded_by?: number; // User ID who recorded this payment
  receipt_url?: string;
  is_deposit?: boolean;
}

// PaymentSubmission interface for creating a new payment
export interface PaymentSubmission {
  booking_id: string | number;
  amount: number;
  method: string;
  transaction_id?: string;
  notes?: string;
  is_deposit?: boolean;
}

// PaymentResponse interface for API responses
export interface PaymentResponse {
  payments: Payment[];
  totalCount: number;
}

// Booking interface
export interface Booking {
  booking_id: number;
  guest_id: number;
  room_id: number;
  room_name: string;
  room_type: string;
  room_image: string;
  images?: string[];
  check_in: string;
  check_out: string;
  guests: number;
  status: BookingStatus;
  total_price: number;
  created_at: string;
  payments: Payment[];
  has_review?: boolean;
  guest_fullname?: string;
  guest_email?: string;
}

// Room amenity interface
export interface Amenity {
  amenity_id: number;
  name: string;
  description: string;
  icon?: React.ReactNode; // For frontend representation
  icon_name?: string; // Name of the icon for storage
  category?: string;
  is_active?: boolean;
}

// AmenityCategory enum
export enum AmenityCategory {
  BASIC = 'Basic',
  COMFORT = 'Comfort',
  LUXURY = 'Luxury',
  ACCESSIBILITY = 'Accessibility',
  ENTERTAINMENT = 'Entertainment',
  VIEW = 'View',
  TECHNOLOGY = 'Technology',
  BATHROOM = 'Bathroom',
  KITCHEN = 'Kitchen',
  OUTDOOR = 'Outdoor',
  SERVICE = 'Service',
  OTHER = 'Other'
}

// AmenitySubmission interface for creating/updating amenities
export interface AmenitySubmission {
  name: string;
  description: string;
  icon_name: string;
  category: string;
  is_active?: boolean;
}

// AmenityResponse interface for API responses
export interface AmenityResponse {
  amenities: Amenity[];
  totalCount: number;
}

// Service interface
export interface Service {
  service_id: number;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  icon?: React.ReactNode; // For frontend representation
  icon_name?: string; // Name of the icon for storage
  category?: string;
  is_active?: boolean;
}

// ServiceCategory enum
export enum ServiceCategory {
  CLEANING = 'Cleaning',
  MAINTENANCE = 'Maintenance',
  FOOD = 'Food & Beverage',
  WELLNESS = 'Wellness & Spa',
  TRANSPORT = 'Transportation',
  ENTERTAINMENT = 'Entertainment',
  BUSINESS = 'Business',
  CONCIERGE = 'Concierge',
  CHILDCARE = 'Childcare',
  PERSONALIZED = 'Personalized',
  OTHER = 'Other'
}

// ServiceSubmission interface for creating/updating services
export interface ServiceSubmission {
  name: string;
  description: string;
  price: number;
  duration: number;
  icon_name: string;
  category: string;
  is_active?: boolean;
}

// ServiceResponse interface for API responses
export interface ServiceResponse {
  services: Service[];
  totalCount: number;
}

// Room type interface
export interface RoomType {
  room_type_id: number;
  name: string;
  price: number;
  capacity: number;
  amenities: Amenity[];
}

// Room service interface for displaying room-service relationship
export interface RoomService {
  service: Service;
  included: boolean;
  discount_percentage: number;
}

// Room interface
export interface Room {
  room_id: number | string;
  room_number: string;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Cleaning';
  room_type: {
    room_type_id: number | string;
    name: string;
    price: number;
    capacity: number;
    description?: string;
    amenities?: Amenity[];
    size?: number;
    beds?: number;
    category?: string;
  };
  images: string[];
  description?: string;
  average_rating?: number;
  review_count?: number;
  services?: RoomService[];
}

// API response interfaces
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
} 