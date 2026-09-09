// The second production Supabase client is also disabled.
export { supabase as websiteSupabase } from '@/integrations/supabase/client';
export const createMemberCheckout = () => { throw new Error('Checkout is not enabled in the lab'); };
