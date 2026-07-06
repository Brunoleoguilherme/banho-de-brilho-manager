"use client";

import { useState } from "react";

/**
 * Logo oficial (arquivo em /public/images/logo-banho-de-brilho.png).
 * Se o arquivo não existir, cai no desenho SVG equivalente.
 */
export function SiteLogo({ className = "h-10" }: { className?: string }) {
  const [fallback, setFallback] = useState(false);

  if (!fallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/images/logo-banho-de-brilho.png"
        alt="Banho de Brilho"
        className={`${className} w-auto`}
        onError={() => setFallback(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 250 84"
      className={className}
      role="img"
      aria-label="Banho de Brilho"
    >
      <g>
        <path d="M22 4 A18 18 0 0 1 40 22 L22 22 Z" fill="#69A9CF" />
        <path d="M20 24 L20 42 A18 18 0 0 1 2 24 Z" fill="#69A9CF" />
        <path d="M22 44 A18 18 0 0 1 40 62 L22 62 Z" fill="#A8CF00" />
        <path d="M20 64 L20 82 A18 18 0 0 1 2 64 Z" fill="#A8CF00" />
        <path d="M42 24 A18 18 0 0 1 60 42 L42 42 Z" fill="#69A9CF" />
        <path d="M42 44 L60 44 A18 18 0 0 1 42 62 Z" fill="#A8CF00" />
      </g>
      <text x="72" y="40" fontFamily="Inter, sans-serif" fontSize="30" fontWeight="800" fill="#69A9CF">
        banho
      </text>
      <text x="72" y="72" fontFamily="Inter, sans-serif" fontSize="30" fontWeight="800" fill="#94A3B8">
        de{" "}
      </text>
      <text x="116" y="72" fontFamily="Inter, sans-serif" fontSize="30" fontWeight="800" fill="#A8CF00">
        brilho
      </text>
    </svg>
  );
}
