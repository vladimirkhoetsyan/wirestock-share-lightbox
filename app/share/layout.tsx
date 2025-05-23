"use client";
import { Toaster } from "@/components/ui/toaster";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
} 