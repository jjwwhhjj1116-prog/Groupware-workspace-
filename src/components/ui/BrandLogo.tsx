import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '' }) => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/workspace';
  const logoSrc = `${basePath}/brand/con-cost-logo.png`;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <Image
        src={logoSrc}
        alt="(주)컨코스트"
        width={482}
        height={112}
        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
        priority
      />
    </div>
  );
};
