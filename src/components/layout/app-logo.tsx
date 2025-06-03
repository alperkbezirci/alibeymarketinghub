
// src/components/layout/app-logo.tsx
import React from 'react';

interface AppLogoProps extends React.SVGProps<SVGSVGElement> {
  // You can add specific props for the logo if needed
}

export function AppLogo({ className, ...props }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 70 35" // Adjusted viewBox for better aspect ratio
      fill="none" // Default fill to none, paths will specify
      stroke="currentColor" // Default stroke
      strokeWidth="2" // Default stroke width
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Simplified 'A' shape - filled */}
      <path
        d="M15 33 L35 3 L55 33 L49 33 L35 13 L21 33 Z"
        fill="currentColor"
        stroke="none" // 'A' is filled, no additional stroke needed for the shape itself
      />
      {/* Upper Swoosh - stroked path */}
      <path
        d="M5 13 C 23 6, 47 6, 65 13"
        strokeWidth="3.5"
        fill="none"
      />
      {/* Lower Swoosh - stroked path */}
      <path
        d="M5 20 C 23 27, 47 27, 65 20"
        strokeWidth="3.5"
        fill="none"
      />
    </svg>
  );
}
