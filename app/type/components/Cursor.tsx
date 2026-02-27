"use client";

import { useEffect, useState } from "react";

interface CursorProps {
  isActive: boolean;
}

export default function Cursor({ isActive }: CursorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      return;
    }

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 530);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <span
      className={`inline-block w-0.5 h-6 bg-emerald-400 transition-opacity duration-100 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    />
  );
}
