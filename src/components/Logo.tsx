import React from 'react';

interface LogoProps {
  className?: string; // Standard sizing class, e.g. "w-8 h-8", "w-12 h-12", "w-16 h-16"
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      className={`${className} text-purple-500 transition-transform duration-300 hover:scale-110 active:scale-95`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Syncou Logo"
    >
      <defs>
        {/* Dynamic Glowing Violet Gradient */}
        <linearGradient id="logoGradient" x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#a855f7" /> {/* Tailwind purple-500 */}
          <stop offset="50%" stopColor="#7c3aed" /> {/* Tailwind violet-650 */}
          <stop offset="100%" stopColor="#6366f1" /> {/* Tailwind indigo-500 */}
        </linearGradient>

        {/* Ambient Drop Shadow Filter inside the SVG */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Styled Synchronized "S" / Infinite Loops Pattern */}
      <g filter="url(#glow)">
        {/* Top Orbit Loop */}
        <path
          d="M35,25 C55,10 85,25 85,50 C85,70 70,80 50,85 C40,87.5 30,80 30,70 C30,60 40,55 50,55 C65,55 70,45 70,38 C70,28 50,23 38,32 C34,35 30,32 30,27 Z"
          fill="url(#logoGradient)"
          fillRule="evenodd"
          clipRule="evenodd"
          opacity="0.95"
        />
        
        {/* Intersecting Sync Loop */}
        <path
          d="M65,75 C45,90 15,75 15,50 C15,30 30,20 50,15 C60,12.5 70,20 70,30 C70,40 60,45 50,45 C35,45 30,55 30,62 C30,72 50,77 62,68 C66,65 70,68 70,73 Z"
          fill="url(#logoGradient)"
          fillRule="evenodd"
          clipRule="evenodd"
          opacity="0.8"
          className="mix-blend-screen"
        />

        {/* Synced Target Core Pulse (Small Center Node) */}
        <circle cx="50" cy="50" r="7" fill="#ffffff" className="animate-pulse shadow-xl" />
      </g>
    </svg>
  );
};
