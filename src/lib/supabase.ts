/**
 * Supabase Client Configuration
 * Matches the setup from sacvpn-web for consistent authentication
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create a singleton Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Desktop app doesn't use URL-based auth
  },
});

// Database types for type safety
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: "personal" | "business";
}

export interface Subscription {
  id: string;
  user_id: string | null;
  org_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan: string;
  status: "active" | "trialing" | "past_due" | "canceled";
  current_period_start: string;
  current_period_end: string;
  renews_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string | null;
  org_id: string | null;
  name: string;
  platform: "ios" | "android" | "macos" | "windows" | "linux" | "router" | "other";
  is_active: boolean;
  created_at: string;
}

export interface DeviceConfig {
  id: string;
  device_id: string;
  client_ip: string;
  is_active: boolean;
  created_at: string;
}

export interface VpsHost {
  id: string;
  name: string;
  ip: string;
  ssh_user: string;
  ssh_port: number;
}

export interface VpsMetrics {
  host_id: string;
  ts: string;
  cpu: number;
  mem_used: number;
  mem_total: number;
  disk_used: number;
  disk_total: number;
  load1: number;
  load5: number;
  load15: number;
}

// Plan configuration matching sacvpn-web
export const PLAN_DEVICE_LIMITS: Record<string, number> = {
  personal: 5,
  gaming: 5,
  business10: 10,
  business50: 50,
  business100: 100,
  business500: 1500,
  business1k: 3000,
  business2500: 7500,
  business5k: 15000,
  business10k: 30000,
};

export function getDeviceLimitForPlan(plan: string): number {
  return PLAN_DEVICE_LIMITS[plan] || 5;
}
