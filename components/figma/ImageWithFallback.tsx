'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

type ImageWithFallbackProps = ImageProps & { fallbackAlt?: string };

export function ImageWithFallback({
  src,
  alt,
  onError,
  fallbackAlt = 'Error loading image',
  ...rest
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError: ImageProps['onError'] = (event) => {
    setDidError(true);
    onError?.(event);
  };

  if (didError) {
    return <Image src={ERROR_IMG_SRC} alt={fallbackAlt} {...rest} />;
  }

  return <Image src={src} alt={alt} {...rest} onError={handleError} />;
}
