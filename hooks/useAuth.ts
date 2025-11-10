"use client";

import { useAuthContext } from "@/components/providers/AuthProvider";

export function useAuth() {
  return useAuthContext();
}
