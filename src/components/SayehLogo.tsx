import React from 'react';

interface SayehLogoProps {
  className?: string;
  size?: number;
}

/**
 * SayehLogo: Official calligraphic "س" emblem
 * - Deep sage/olive green calligraphic letter Seen
 * - Lower stroke transitions into digital QR Code matrix dispersion
 * - Two coral/terracotta diamond dots underneath
 */
export const SayehLogo: React.FC<SayehLogoProps> = ({ className = 'w-10 h-10', size = 48 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 270"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="لوگوی سامانه سایه"
    >
      <defs>
        <linearGradient id="seen-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a6348" />
          <stop offset="50%" stopColor="#3d563b" />
          <stop offset="100%" stopColor="#2f462e" />
        </linearGradient>
      </defs>

      {/* Main Calligraphic Stroke of "س" */}
      {/* Upper pointed ascender curving down into the sweeping loop */}
      <path
        d="M 85 10 
           C 84 35, 78 60, 60 82 
           C 42 104, 30 115, 30 125
           C 30 133, 40 130, 48 122
           C 65 105, 80 80, 85 55
           C 87 75, 95 95, 110 108
           C 128 122, 160 125, 178 140
           C 192 152, 194 172, 185 186
           C 172 204, 142 208, 115 198
           C 95 190, 82 178, 65 174
           C 80 180, 105 190, 130 190
           C 160 190, 182 176, 178 158
           C 174 142, 145 132, 118 122
           C 92 112, 70 98, 55 78
           C 72 58, 82 35, 85 10 Z"
        fill="url(#seen-grad)"
      />

      {/* Lower curve of Seen connecting to QR dispersion */}
      <path
        d="M 65 174
           C 78 178, 95 190, 115 198
           C 100 195, 85 188, 72 180
           Z"
        fill="#3d563b"
      />

      {/* Digital QR Code Dispersion Matrix on the lower left tail */}
      {/* Main QR Corner Finder Square */}
      <rect x="38" y="172" width="16" height="16" rx="2" fill="#3d563b" />
      <rect x="42" y="176" width="8" height="8" rx="1" fill="#ffffff" />
      <rect x="44.5" y="178.5" width="3" height="3" fill="#3d563b" />

      {/* Second Mini QR Pattern */}
      <rect x="28" y="196" width="12" height="12" rx="1.5" fill="#3d563b" />
      <rect x="31" y="199" width="6" height="6" rx="0.5" fill="#ffffff" />
      <rect x="33" y="201" width="2" height="2" fill="#3d563b" />

      {/* Dispersed Pixel Bits */}
      <rect x="58" y="170" width="4.5" height="4.5" fill="#3d563b" />
      <rect x="65" y="171" width="4.5" height="4.5" fill="#3d563b" />
      <rect x="72" y="173" width="4" height="4" fill="#3d563b" />
      <rect x="78" y="176" width="4" height="4" fill="#3d563b" />
      <rect x="84" y="180" width="3.5" height="3.5" fill="#3d563b" />

      <rect x="58" y="177" width="4.5" height="4.5" fill="#3d563b" />
      <rect x="64" y="178" width="4" height="4" fill="#3d563b" />
      <rect x="70" y="180" width="4" height="4" fill="#3d563b" />
      <rect x="76" y="183" width="3.5" height="3.5" fill="#3d563b" />

      <rect x="56" y="184" width="4.5" height="4.5" fill="#3d563b" />
      <rect x="62" y="185" width="4" height="4" fill="#3d563b" />
      <rect x="68" y="187" width="4" height="4" fill="#3d563b" />
      <rect x="74" y="190" width="3.5" height="3.5" fill="#3d563b" />
      <rect x="80" y="193" width="3.5" height="3.5" fill="#3d563b" />

      <rect x="58" y="191" width="4.5" height="4.5" fill="#3d563b" />
      <rect x="64" y="192" width="4" height="4" fill="#3d563b" />
      <rect x="70" y="194" width="3.5" height="3.5" fill="#3d563b" />
      <rect x="76" y="197" width="3.5" height="3.5" fill="#3d563b" />

      {/* Floating Leftward Pixels */}
      <rect x="29" y="172" width="4" height="4" fill="#3d563b" />
      <rect x="20" y="176" width="4" height="4" fill="#3d563b" />
      <rect x="15" y="181" width="3.5" height="3.5" fill="#3d563b" />
      <rect x="10" y="185" width="3.5" height="3.5" fill="#3d563b" />
      <rect x="22" y="186" width="3.5" height="3.5" fill="#3d563b" />
      <rect x="17" y="192" width="3" height="3" fill="#3d563b" />
      <rect x="23" y="195" width="3" height="3" fill="#3d563b" />
      <rect x="24" y="202" width="2.5" height="2.5" fill="#3d563b" />

      {/* Two Terracotta / Coral Diamond Dots Underneath */}
      {/* Top Diamond Dot */}
      <g transform="translate(48, 222) rotate(45)">
        <rect x="-8.5" y="-8.5" width="17" height="17" rx="1.5" fill="#e07a5f" />
      </g>

      {/* Bottom Diamond Dot */}
      <g transform="translate(48, 248) rotate(45)">
        <rect x="-8.5" y="-8.5" width="17" height="17" rx="1.5" fill="#e07a5f" />
      </g>
    </svg>
  );
};
