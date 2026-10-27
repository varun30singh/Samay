'use client';

import React from 'react';

interface CuteRobotIconProps {
  size?: number;
  className?: string;
  showHalo?: boolean;
}

export default function CuteRobotIcon({
  size = 36,
  className = '',
  showHalo = false
}: CuteRobotIconProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Optional gentle soft background halo (no neon, soft warm light yellow) */}
      {showHalo && (
        <span
          className="absolute -inset-1 rounded-full bg-amber-100/60 blur-xs -z-10 pointer-events-none"
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full select-none overflow-visible"
      >
        <defs>
          {/* Head Body Gradient: Crisp White to Soft Light Yellow */}
          <linearGradient id="robotHeadGrad" x1="24" y1="8" x2="24" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#FFFDF7" />
            <stop offset="100%" stopColor="#FEF9C3" />
          </linearGradient>

          {/* Ears Golden Accent */}
          <linearGradient id="robotGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Eye Glow Gradient (Warm Sunny Yellow) */}
          <radialGradient id="robotEyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="70%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EAB308" />
          </radialGradient>

          <style>{`
            /* Whole Robot Head Friendly Bob */
            @keyframes robotHeadFloat {
              0%, 100% {
                transform: translateY(0px);
              }
              50% {
                transform: translateY(-1.5px);
              }
            }

            /* Antenna Friendly Sway */
            @keyframes cuteAntennaSway {
              0%, 100% {
                transform: rotate(0deg);
              }
              25% {
                transform: rotate(-10deg);
              }
              75% {
                transform: rotate(10deg);
              }
            }

            /* Eye Rolling Effect */
            @keyframes eyesRollAround {
              0%, 14% {
                transform: translate(0px, 0px);
              }
              18% {
                transform: translate(-1.8px, -2px); /* look top-left */
              }
              24% {
                transform: translate(0px, -2.8px); /* look straight up */
              }
              30% {
                transform: translate(2px, -2px); /* look top-right */
              }
              36% {
                transform: translate(2px, 1.2px); /* look bottom-right */
              }
              42% {
                transform: translate(-1.5px, 1.2px); /* look bottom-left */
              }
              48%, 52% {
                transform: translate(0px, 0px); /* return to center */
              }
              53%, 75% {
                transform: translate(0px, 0px); /* hold center during wink */
              }
              80%, 100% {
                transform: translate(0px, 0px);
              }
            }

            /* Left Eye reaction during wink */
            @keyframes leftEyeWinkReaction {
              0%, 51% {
                transform: scale(1);
              }
              54%, 73% {
                transform: scale(1.15); /* joyful wide pupil */
              }
              76%, 100% {
                transform: scale(1);
              }
            }

            /* Right Eye: Closes, then Opens (The Wink!) */
            @keyframes rightEyeWinkOpen {
              0%, 51% {
                opacity: 1;
                transform: scaleY(1);
              }
              53% {
                opacity: 0.3;
                transform: scaleY(0.2);
              }
              54%, 73% {
                opacity: 0;
                transform: scaleY(0);
              }
              75% {
                opacity: 0.5;
                transform: scaleY(0.4);
              }
              77%, 100% {
                opacity: 1;
                transform: scaleY(1);
              }
            }

            /* Right Eye Winking Curved Arc */
            @keyframes rightEyeWinkArc {
              0%, 51% {
                opacity: 0;
                transform: scale(0.6);
              }
              54%, 73% {
                opacity: 1;
                transform: scale(1);
              }
              75%, 100% {
                opacity: 0;
                transform: scale(0.6);
              }
            }

            /* Mouth Smile widens during wink */
            @keyframes cuteSmileWidening {
              0%, 51% {
                transform: scale(1);
              }
              54%, 73% {
                transform: scale(1.18) translateY(0.4px);
              }
              76%, 100% {
                transform: scale(1);
              }
            }

            /* Cheeks blush brighter during wink */
            @keyframes cuteCheekBlush {
              0%, 51% {
                opacity: 0.45;
              }
              54%, 73% {
                opacity: 0.85;
              }
              76%, 100% {
                opacity: 0.45;
              }
            }

            .cute-robot-float {
              animation: robotHeadFloat 3.6s ease-in-out infinite;
              transform-origin: 24px 24px;
            }

            .cute-robot-antenna {
              animation: cuteAntennaSway 3s ease-in-out infinite;
              transform-origin: 24px 9px;
            }

            .cute-robot-eyes-roll {
              animation: eyesRollAround 6.5s ease-in-out infinite;
              transform-origin: 24px 21px;
            }

            .cute-robot-left-eye {
              animation: leftEyeWinkReaction 6.5s ease-in-out infinite;
              transform-origin: 17.5px 21px;
            }

            .cute-robot-right-open {
              animation: rightEyeWinkOpen 6.5s ease-in-out infinite;
              transform-origin: 30.5px 21px;
            }

            .cute-robot-right-wink {
              animation: rightEyeWinkArc 6.5s ease-in-out infinite;
              transform-origin: 30.5px 21px;
            }

            .cute-robot-mouth {
              animation: cuteSmileWidening 6.5s ease-in-out infinite;
              transform-origin: 24px 26.5px;
            }

            .cute-robot-cheeks {
              animation: cuteCheekBlush 6.5s ease-in-out infinite;
            }
          `}</style>
        </defs>

        <g className="cute-robot-float">
          {/* Antenna */}
          <g className="cute-robot-antenna">
            <line
              x1="24"
              y1="9"
              x2="24"
              y2="4"
              stroke="#D97706"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx="24"
              cy="3.2"
              r="2.8"
              fill="#F59E0B"
              stroke="#B45309"
              strokeWidth="0.8"
            />
            <circle cx="23.2" cy="2.4" r="0.8" fill="#FEF3C7" />
          </g>

          {/* Ears / Side Headset Caps */}
          <rect
            x="3.5"
            y="17"
            width="3"
            height="10"
            rx="1.5"
            fill="url(#robotGoldGrad)"
          />
          <rect
            x="41.5"
            y="17"
            width="3"
            height="10"
            rx="1.5"
            fill="url(#robotGoldGrad)"
          />

          {/* Head Body */}
          <rect
            x="6"
            y="8.5"
            width="36"
            height="29"
            rx="12"
            fill="url(#robotHeadGrad)"
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />

          {/* Screen Visor */}
          <rect
            x="10.5"
            y="12.5"
            width="27"
            height="21"
            rx="8"
            fill="#18181B"
          />

          {/* Glass Visor Glare/Reflect line */}
          <path
            d="M 14 14.5 L 22 14.5 Q 18 17.5 14 14.5 Z"
            fill="#FFFFFF"
            opacity="0.12"
          />

          {/* Eyes Group (With Eye Rolling Animation) */}
          <g className="cute-robot-eyes-roll">
            {/* Left Eye (Stays open, looks around & widens happily) */}
            <g className="cute-robot-left-eye">
              <ellipse
                cx="17.5"
                cy="21"
                rx="3.4"
                ry="3.8"
                fill="url(#robotEyeGlow)"
              />
              {/* Highlight Glint */}
              <circle cx="18.6" cy="19.6" r="1.1" fill="#FFFFFF" />
              <circle cx="16.5" cy="22.2" r="0.6" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Right Eye - Normal Open State */}
            <g className="cute-robot-right-open">
              <ellipse
                cx="30.5"
                cy="21"
                rx="3.4"
                ry="3.8"
                fill="url(#robotEyeGlow)"
              />
              {/* Highlight Glint */}
              <circle cx="31.6" cy="19.6" r="1.1" fill="#FFFFFF" />
              <circle cx="29.5" cy="22.2" r="0.6" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Right Eye - Winking Curved Smile State (one eye closing then opening) */}
            <g className="cute-robot-right-wink">
              <path
                d="M 27.5 21.8 Q 30.5 18 33.5 21.8"
                fill="none"
                stroke="#FACC15"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* Cheeks Blush */}
          <g className="cute-robot-cheeks">
            <ellipse
              cx="13.5"
              cy="27"
              rx="2"
              ry="1.1"
              fill="#FB7185"
            />
            <ellipse
              cx="34.5"
              cy="27"
              rx="2"
              ry="1.1"
              fill="#FB7185"
            />
          </g>

          {/* Cute Smile Mouth */}
          <g className="cute-robot-mouth">
            <path
              d="M 21 26.2 Q 24 29.8 27 26.2"
              fill="none"
              stroke="#FACC15"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Sweet Tongue / Happy Open Lip Highlight */}
            <path
              d="M 22.3 26.8 Q 24 29.2 25.7 26.8"
              fill="#F43F5E"
              opacity="0.85"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
