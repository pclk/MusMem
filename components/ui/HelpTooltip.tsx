"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HelpTooltipProps {
  content: string;
  label?: string;
  className?: string;
}

export default function HelpTooltip({
  content,
  label = "Help",
  className = "",
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    placement: "top" | "bottom";
  }>({ left: 12, top: 12, placement: "bottom" });
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isPinned) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setIsPinned(false);
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsPinned(false);
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPinned]);

  useLayoutEffect(() => {
    if (!isOpen || !isMounted) {
      setIsPositioned(false);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current || !tooltipRef.current) return;

      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = tooltipRef.current.offsetWidth || 288;
      const tooltipHeight = tooltipRef.current.offsetHeight || 0;
      const margin = 12;
      const gap = 8;
      const maxLeft = Math.max(margin, window.innerWidth - tooltipWidth - margin);
      const centeredLeft = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;
      const left = Math.min(Math.max(centeredLeft, margin), maxLeft);

      let top = buttonRect.bottom + gap;
      let placement: "top" | "bottom" = "bottom";
      const wouldOverflowBottom = top + tooltipHeight > window.innerHeight - margin;
      const canPlaceAbove = buttonRect.top - gap - tooltipHeight >= margin;

      if (wouldOverflowBottom && canPlaceAbove) {
        top = buttonRect.top - tooltipHeight - gap;
        placement = "top";
      }

      setPosition({ left, top: Math.max(top, margin), placement });
      setIsPositioned(true);
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isMounted, isOpen, content]);

  const openTooltip = () => {
    setIsOpen(true);
  };

  const closeTooltip = () => {
    if (isPinned) return;
    setIsOpen(false);
  };

  const toggleTooltip = () => {
    if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
      return;
    }

    setIsPinned(true);
    setIsOpen(true);
  };

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        onClick={toggleTooltip}
        className="inline-flex items-center text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus:text-zinc-200"
      >
        (?)
      </button>
      {isMounted &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
            className={`pointer-events-none fixed z-[9999] w-72 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-xs leading-relaxed text-zinc-200 shadow-lg transition-[opacity,transform] duration-150 ${
              isOpen && isPositioned
                ? "visible translate-y-0 opacity-100"
                : `invisible opacity-0 ${
                    position.placement === "top" ? "-translate-y-1" : "translate-y-1"
                  }`
            }`}
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  );
}
