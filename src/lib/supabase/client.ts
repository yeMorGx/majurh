'use client';

import { createBrowserClient } from '@supabase/ssr';

import { getPublicEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  browserClient = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);

  return browserClient;
}
