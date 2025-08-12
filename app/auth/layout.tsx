"use client";
import { useEffect } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#18181b";
    return () => {
      document.body.style.background = prevBg;
    };
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  );
}
