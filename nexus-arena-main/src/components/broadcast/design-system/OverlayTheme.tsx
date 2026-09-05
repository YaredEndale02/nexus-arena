import React from "react";

export interface OverlayThemeProps {
  primaryColor?: string; // hex without #, e.g. "d2ff0d"
  bgColor?: string; // hex without #, e.g. "050505"
  children: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

/**
 * OverlayTheme Injector
 * Establishes uniform CSS variables, skew angles, keyframes, and typography
 * across all broadcast overlays matching the reference design.
 */
export function OverlayTheme({
  primaryColor = "d2ff0d",
  bgColor = "050505",
  children,
  className = "",
  transparent = false,
}: OverlayThemeProps) {
  const primaryHex = primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`;
  const bgHex = bgColor.startsWith("#") ? bgColor : `#${bgColor}`;

  return (
    <div
      className={`fixed inset-0 overflow-hidden font-heading select-none text-white ${className}`}
      style={
        {
          "--overlay-primary": primaryHex,
          "--overlay-bg": bgHex,
          "--overlay-card": "#111111",
          "--overlay-card-subtle": "#161616",
          "--overlay-border": "rgba(255, 255, 255, 0.08)",
          backgroundColor: transparent ? "transparent" : bgHex,
        } as React.CSSProperties
      }
    >
      <style>{`
        /* Dynamic Slanted Geometry (-12deg) */
        .volt-skew {
          transform: skewX(-12deg);
        }
        .volt-unskew {
          transform: skewX(12deg);
        }

        /* Subtle 45-degree geometric background pattern */
        .volt-pattern {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.018) 0px,
            rgba(255, 255, 255, 0.018) 2px,
            transparent 2px,
            transparent 12px
          );
        }

        /* Ambient Glow */
        .volt-glow {
          position: absolute;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, var(--overlay-primary) 0%, transparent 70%);
          opacity: 0.04;
          filter: blur(120px);
          pointer-events: none;
          border-radius: 9999px;
        }

        /* Smooth Entrance Keyframes */
        @keyframes volt-fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(24px) skewX(-12deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) skewX(-12deg);
          }
        }
        .volt-anim-1 { animation: volt-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.05s; }
        .volt-anim-2 { animation: volt-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.15s; }
        .volt-anim-3 { animation: volt-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.25s; }
        .volt-anim-4 { animation: volt-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.35s; }

        @keyframes shimmer-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .volt-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(210, 255, 13, 0.25) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer-sweep 1s ease-in-out;
        }
      `}</style>

      {/* Global Background Texture & Glow */}
      {!transparent && (
        <>
          <div className="absolute inset-0 volt-pattern opacity-60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--overlay-bg)] via-transparent to-transparent opacity-85 pointer-events-none" />
          <div className="volt-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </>
      )}

      {/* Content */}
      <div className={`relative z-10 w-full h-full flex flex-col justify-between ${transparent ? "pointer-events-none" : ""}`}>
        {children}
      </div>
    </div>
  );
}
