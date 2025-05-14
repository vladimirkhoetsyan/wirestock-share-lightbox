"use client";
import { Toaster } from "@/components/ui/toaster";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
} 