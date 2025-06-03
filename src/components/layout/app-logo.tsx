
// src/components/layout/app-logo.tsx
import React from 'react';

interface AppLogoProps extends React.SVGProps<SVGSVGElement> {
  // You can add specific props for the logo if needed
}

export function AppLogo({ className, ...props }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 70 35" // Adjusted viewBox for a 2:1 aspect ratio suitable for headers
      fill="none" // Default fill to none; paths will specify their own fill or stroke
      stroke="currentColor" // Default stroke color for paths that use stroke
      strokeWidth="2" // Default stroke width for paths that use stroke
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Simplified 'A' shape - This will be filled with the current text color */}
      <path
        d="M15 33 L35 3 L55 33 L49 33 L35 13 L21 33 Z"
        fill="currentColor" // The 'A' shape is filled
        stroke="none" // No additional stroke on the 'A' shape itself
      />
      {/* Upper Swoosh - This will be a stroked path */}
      <path
        d="M5 13 C 23 6, 47 6, 65 13" // Curve control points for the upper swoosh
        strokeWidth="3.5" // Make the swoosh line thicker
        fill="none" // The swoosh is a line, not a filled shape
      />
      {/* Lower Swoosh - This will also be a stroked path */}
      <path
        d="M5 20 C 23 27, 47 27, 65 20" // Curve control points for the lower swoosh
        strokeWidth="3.5" // Make the swoosh line thicker
        fill="none" // The swoosh is a line, not a filled shape
      />
    </svg>
  );
}
