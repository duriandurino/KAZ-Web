import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getCachedImage, preloadImage } from '../lib/imageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
  preload?: boolean;
  lazy?: boolean;
  threshold?: number;
  placeholderColor?: string;
}

/**
 * CachedImage component that uses our image caching system
 * - Caches images to improve loading time for frequently accessed images
 * - Supports lazy loading to improve performance
 * - Shows a placeholder while loading
 * - Supports fallback image for error handling
 */
const CachedImage: React.FC<CachedImageProps> = ({
  src,
  fallback = 'https://via.placeholder.com/300x200?text=Image+Not+Available',
  preload = false,
  lazy = true,
  threshold = 0.1,
  placeholderColor = '#f5f5f5',
  alt = 'Image',
  className = '',
  style = {},
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholderColor); 
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(!lazy);

  useEffect(() => {
    // If preloaded, try to get the image right away
    if (preload) {
      preloadImage(src);
    }

    // If not using lazy loading or element is visible, load the image
    if (isVisible) {
      loadImage();
    }
  }, [src, isVisible]);

  useEffect(() => {
    // Set up intersection observer for lazy loading
    if (lazy && !isVisible) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          });
        },
        { threshold }
      );

      // Get the current element to observe
      const element = document.querySelector(`[data-image-id="${src}"]`);
      if (element) {
        observer.observe(element);
      }

      return () => {
        observer.disconnect();
      };
    }
  }, [lazy, src, threshold]);

  const loadImage = async () => {
    setLoading(true);
    setError(false);

    try {
      const cachedSrc = await getCachedImage(src);
      setImageSrc(cachedSrc);
      setLoading(false);
    } catch (err) {
      console.error('Error loading image:', err);
      setError(true);
      setImageSrc(fallback);
      setLoading(false);
    }
  };

  const handleError = () => {
    setError(true);
    setImageSrc(fallback);
  };

  const placeholderStyle: React.CSSProperties = {
    backgroundColor: placeholderColor,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style
  };

  return (
    <div
      data-image-id={src}
      className={`cached-image-container ${className}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {loading ? (
        <div style={placeholderStyle}>
          <Spin size="small" />
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          onError={handleError}
          className={`cached-image ${className}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
};

export default CachedImage; 