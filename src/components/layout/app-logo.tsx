// src/components/layout/app-logo.tsx
import React from 'react';

interface AppLogoProps extends React.SVGProps<SVGSVGElement> {
  // You can add specific props for the logo if needed
}

export function AppLogo({ className, ...props }: AppLogoProps) {
  return (
    <svg
      id="katman_1"
      data-name="katman 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 827.68 250.55"
      className={className}
      {...props}
    >
      <defs>
        <style>
          {`.cls-1 { fill: currentColor; fill-rule: evenodd; }`}
        </style>
      </defs>
      <polygon className="cls-1" points="437.31 0 615.68 250.55 607.7 250.55 437.31 49.03 266.91 250.55 258.93 250.55 437.31 0"/>
      <path className="cls-1" d="M827.68,177.4C459.07,289.37,417.87-39.58,113.64,102.07c303.88-119.46,307.01,217.51,714.04,75.33Z"/>
      <path className="cls-1" d="M519.57,198.81C251.35,280.29,221.37,40.93,0,144c221.12-86.92,223.39,158.27,519.57,54.81Z"/>
    </svg>
  );
}
