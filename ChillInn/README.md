# ChillInn - Hotel Management System

A modern hotel management system built with React, TypeScript, and Ant Design.

## Features

- User management (admin and guest roles)
- Room management
- Booking system
- Profile management with image upload
- Responsive design for all devices

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Copy the `.env.example` file to `.env.local` and update with your configuration values:
   ```bash
   cp .env.example .env.local
   ```
4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Cloudinary Integration

This application uses Cloudinary for image storage. To configure Cloudinary:

1. Create a Cloudinary account at [https://cloudinary.com](https://cloudinary.com)

2. Create an upload preset:
   - Go to Settings > Upload
   - Scroll down to "Upload presets"
   - Click "Add upload preset"
   - Set "Signing Mode" to "Unsigned"
   - Set folder to "chillinn" (or customize in the code)
   - Save the preset name

3. Add your Cloudinary credentials to `.env.local`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```

## File Structure

- `/components` - Reusable UI components
- `/pages` - Application pages
- `/lib` - Utility functions and services
- `/assets` - Static assets like images

## Image Upload

The application supports uploading profile images, room thumbnails, and room preview images. 
The image upload process:

1. Image is uploaded directly to Cloudinary
2. After successful upload, image metadata is saved to the backend
3. The image URL is returned for immediate display

## Troubleshooting

If you encounter issues with image uploads:

1. Check browser console for detailed error messages
2. Verify your Cloudinary credentials in `.env.local`
3. Ensure your upload preset is configured correctly (unsigned)
4. Check network requests to see if the Cloudinary API is responding

## License

This project is licensed under the MIT License - see the LICENSE file for details.
