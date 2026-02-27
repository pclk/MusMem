import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
