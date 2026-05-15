"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface RelationTooltipProps {
  hint: string;
  children: React.ReactNode;
}

/**
 * Wraps children with a hover tooltip showing the relation type hint.
 * Uses a portal so it renders into document.body, escaping any overflow
 * or backdrop-filter stacking contexts in ancestor elements.
 */
export function RelationTooltip({ hint, children }: RelationTooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onEnter = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const onMove = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const onLeave = useCallback(() => setPos(null), []);

  return (
    <>
      <span
        style={{ display: "contents" }}
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {children}
      </span>
      {pos && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: pos.x + 14,
              top: pos.y - 42,
              zIndex: 99999,
              pointerEvents: "none",
              background: "var(--le-surface)",
              border: "1px solid color-mix(in srgb, var(--le-border) 45%, transparent)",
              borderRadius: "6px",
              padding: "4px 9px",
              fontFamily: "var(--font-sans)",
              fontSize: "11px",
              color: "var(--le-text-muted)",
              maxWidth: "220px",
              lineHeight: 1.4,
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            {hint}
          </div>,
          document.body
        )}
    </>
  );
}
