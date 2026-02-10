import React from 'react';

export default function UnitLogo({ size = 32, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="unitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      
      {/* Left block */}
      <rect x="10" y="40" width="20" height="50" rx="4" fill="url(#unitGradient)" opacity="0.9"/>
      
      {/* Bottom block */}
      <rect x="35" y="70" width="30" height="20" rx="4" fill="url(#unitGradient)" opacity="0.9"/>
      
      {/* Right block */}
      <rect x="70" y="40" width="20" height="50" rx="4" fill="url(#unitGradient)" opacity="0.9"/>
      
      {/* Top connecting blocks - forming U shape */}
      <rect x="10" y="20" width="20" height="15" rx="4" fill="url(#unitGradient)"/>
      <rect x="70" y="20" width="20" height="15" rx="4" fill="url(#unitGradient)"/>
      
      {/* Center accent dot */}
      <circle cx="50" cy="50" r="6" fill="#ec4899" opacity="0.8"/>
    </svg>
  );
}