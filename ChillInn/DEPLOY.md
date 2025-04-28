# Deployment Guide

This document provides instructions for deploying the ChillInn application to a production environment and setting up Cloudinary for image storage.

## Building for Production

To build the application for production:

```bash
npm run build
# or
yarn build
```

This will create a `dist` directory with optimized production files.

## Deploying to a Web Server

The built application can be deployed to any static web server:

1. Copy the contents of the `dist` directory to your web server's public directory
2. Configure your web server to serve the application
3. If using a router like React Router, configure the server to redirect all requests to `index.html`

## Setting Up Cloudinary

### 1. Create a Cloudinary Account

If you don't already have a Cloudinary account, sign up at [https://cloudinary.com](https://cloudinary.com).

### 2. Create an Upload Preset

1. Go to the Cloudinary Management Console
2. Navigate to Settings > Upload
3. Scroll down to "Upload presets"
4. Click "Add upload preset"
5. Set the following:
   - Name: Choose a name (you'll use this in your environment variables)
   - Signing Mode: "Unsigned" (for direct browser uploads)
   - Folder: "chillinn" (or customize in the code)
   - Optional: Configure auto-tagging, moderation, etc.
6. Save the preset

### 3. Configure Environment Variables

In your production environment, set the following environment variables:

```
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

Where:
- `your_cloud_name` is the Cloud Name from your Cloudinary dashboard
- `your_upload_preset` is the name of the upload preset you created

### 4. Security Considerations

- The application uses unsigned uploads for simplicity, which allows direct browser-to-Cloudinary uploads
- For better security in production:
  - Consider using signed uploads (requires server-side processing)
  - Set up a server-side proxy for uploads
  - Configure your upload preset with stricter settings (file size limits, allowed formats, etc.)
  - Set up proper CORS settings in your Cloudinary account

## Environment Configuration

Create a `.env.production` file in the root directory with the following variables:

```
VITE_API_KEY=your_production_api_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
VITE_API_URL=https://your-production-api-url.com
```

## Continuous Integration/Deployment

For CI/CD setups:

1. Build the application
2. Run tests
3. Deploy the built files to your hosting provider
4. Ensure environment variables are properly set in your CI/CD environment

## Troubleshooting

If you encounter issues with image uploads in production:

1. Check the browser console for error messages
2. Verify your Cloudinary credentials are correctly set in your environment
3. Check CORS settings in your Cloudinary account
4. Verify your upload preset is configured correctly
5. Test the upload directly using the Cloudinary Upload API

## Content Delivery Network (CDN)

For better performance, consider serving your application through a CDN like Cloudflare, AWS CloudFront, or Netlify. 