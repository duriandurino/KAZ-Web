import axios from 'axios';
import { Payment, PaymentSubmission, PaymentResponse } from '../utils/types';
import mongoAdapter from '../utils/mongoAdapter';
import apiClient from '../utils/apiClient';

// Extended options interface for MongoDB specifics
interface MongoPaymentOptions {
  limit?: number;
  offset?: number;
  booking_id?: string | number;
  method?: string;
  min_amount?: number;
  max_amount?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

// Extended payment interface for MongoDB responses
interface MongoPayment extends Payment {
  id?: string;
  _id?: string;
  booking?: string | object;
}

/**
 * Get payments with filtering options
 * @param token - Authentication token
 * @param options - Filtering and pagination options
 * @returns Promise with payment data and total count
 */
export async function getPayments(
  token: string,
  options: {
    limit?: number;
    offset?: number;
    booking_id?: string | number;
    method?: string;
    min_amount?: number;
    max_amount?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<PaymentResponse> {
  try {
    // Format options for MongoDB
    const mongoOptions: MongoPaymentOptions = { ...options };
    
    // Format booking_id if provided
    if (options.booking_id) {
      mongoOptions.booking_id = mongoAdapter.formatId(options.booking_id);
    }
    
    const response = await axios.get('/payments/admin/all', {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      },
      params: mongoAdapter.formatQueryParams(mongoOptions)
    });

    // Transform MongoDB response
    const payments = Array.isArray(response.data) 
      ? response.data.map(mongoAdapter.adaptPayment)
      : (response.data.payments || []).map(mongoAdapter.adaptPayment);
    
    const totalCount = response.data.totalCount || payments.length;

    return {
      payments,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
}

/**
 * Get payments for a specific booking
 * @param bookingId - The ID of the booking
 * @param token - Authentication token
 * @returns Promise with payment data and summary
 */
export async function getBookingPayments(
  bookingId: string | number,
  token: string
): Promise<{
  payments: MongoPayment[];
  payment_summary: {
    total_price: number;
    total_paid: number;
    balance: number;
    fully_paid: boolean;
  }
}> {
  try {
    const formattedId = mongoAdapter.formatId(bookingId);
    console.log(`Fetching payments for booking ${formattedId}`);
    
    // Use the endpoint defined in payment.js (router.get('/bookings/:booking_id/payments', ...))
    const response = await apiClient.get(`/payments/bookings/${formattedId}/payments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Received payment data for booking ${formattedId}:`, response.data);

    // Transform MongoDB response
    const payments = Array.isArray(response.data.payments)
      ? response.data.payments.map(mongoAdapter.adaptPayment)
      : [];
    
    return {
      payments,
      payment_summary: response.data.payment_summary || {
        total_price: 0,
        total_paid: 0,
        balance: 0,
        fully_paid: false
      }
    };
  } catch (error) {
    console.error(`Error fetching payments for booking ${bookingId}:`, error);
    
    if (axios.isAxiosError(error)) {
      console.error('Payment API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    throw error;
  }
}

/**
 * Get a specific payment by ID
 * @param paymentId - The ID of the payment
 * @param token - Authentication token
 * @returns Promise with payment data
 */
export async function getPaymentById(
  paymentId: string | number,
  token: string
): Promise<Payment> {
  try {
    const formattedId = mongoAdapter.formatId(paymentId);
    const response = await axios.get(`/payments/${formattedId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    return mongoAdapter.adaptPayment(response.data);
  } catch (error) {
    console.error(`Error fetching payment ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Record a new payment
 * @param paymentData - The payment data to submit
 * @param token - Authentication token
 * @returns Promise with the recorded payment
 */
export async function recordPayment(
  paymentData: PaymentSubmission,
  token: string
): Promise<Payment> {
  try {
    // Format for MongoDB
    const mongoData = {
      booking_id: mongoAdapter.formatId(paymentData.booking_id),
      amount: paymentData.amount,
      method: paymentData.method,
      transaction_id: paymentData.transaction_id,
      notes: paymentData.notes,
      is_deposit: paymentData.is_deposit
    };
    
    console.log('Recording payment with data:', mongoData);
    
    const response = await apiClient.post(
      '/payments', // This matches the endpoint in the backend (router.post('/', ...))
      mongoData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Payment API response:', response.data);
    return mongoAdapter.adaptPayment(response.data.payment || response.data);
  } catch (error) {
    console.error('Error recording payment:', error);
    if (axios.isAxiosError(error)) {
      console.error('Payment API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    throw error;
  }
}

/**
 * Update a payment's status
 * @param paymentId - The ID of the payment
 * @param status - The new payment status
 * @param token - Authentication token
 * @returns Promise with the updated payment
 */
export async function updatePaymentStatus(
  paymentId: string | number,
  status: string,
  token: string
): Promise<Payment> {
  try {
    const formattedId = mongoAdapter.formatId(paymentId);
    const response = await axios.put(
      `/payments/${formattedId}/status`,
      { status },
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return mongoAdapter.adaptPayment(response.data.payment || response.data);
  } catch (error) {
    console.error(`Error updating payment status for ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Delete a payment record (admin only)
 * @param paymentId - The ID of the payment to delete
 * @param token - Authentication token
 * @returns Promise with success status
 */
export async function deletePayment(
  paymentId: string | number,
  token: string
): Promise<boolean> {
  try {
    const formattedId = mongoAdapter.formatId(paymentId);
    await axios.delete(`/payments/${formattedId}`, {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    return true;
  } catch (error) {
    console.error(`Error deleting payment ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Get payment statistics for admin dashboard
 * @param token - Authentication token
 * @param period - The time period for statistics (day, week, month, year)
 * @returns Promise with payment statistics
 */
export async function getPaymentStatistics(
  token: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<{
  total_payments: number;
  total_amount: number;
  payment_methods: { method: string; count: number; amount: number }[];
  daily_totals: { date: string; amount: number; count: number }[];
}> {
  try {
    const response = await axios.get('/payments/admin/statistics', {
      headers: {
        'x-api-key': import.meta.env.VITE_API_KEY,
        'Authorization': `Bearer ${token}`
      },
      params: { period }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    throw error;
  }
}

/**
 * Generate a payment receipt
 * @param paymentId - The ID of the payment
 * @param token - Authentication token
 * @returns Promise with receipt URL
 */
export async function generatePaymentReceipt(
  paymentId: string | number,
  token: string
): Promise<{ receipt_url: string }> {
  try {
    const formattedId = mongoAdapter.formatId(paymentId);
    const response = await axios.post(
      `/payments/${formattedId}/receipt`,
      {},
      {
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error generating receipt for payment ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Update a payment record
 * @param paymentId - The ID of the payment to update
 * @param paymentData - The updated payment data
 * @param token - Authentication token
 * @returns Promise with the updated payment
 */
export async function updatePayment(
  paymentId: string | number,
  paymentData: Partial<Payment>,
  token: string
): Promise<Payment> {
  try {
    const formattedId = mongoAdapter.formatId(paymentId);
    
    // Format data for MongoDB
    const mongoData = {
      amount: paymentData.amount,
      method: paymentData.method,
      transaction_id: paymentData.transaction_id,
      notes: paymentData.notes,
      is_deposit: paymentData.is_deposit,
      status: paymentData.status
    };
    
    console.log(`Updating payment ${formattedId} with data:`, mongoData);
    
    const response = await apiClient.put(
      `/payments/${formattedId}`,
      mongoData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Payment update API response:', response.data);
    return mongoAdapter.adaptPayment(response.data.payment || response.data);
  } catch (error) {
    console.error(`Error updating payment ${paymentId}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Payment API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    throw error;
  }
} 