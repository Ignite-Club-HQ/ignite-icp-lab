// The second production Supabase client is also disabled.
export { supabase as websiteSupabase } from '@/integrations/supabase/client';
export const createMemberCheckout = () => { throw new Error('Checkout is not enabled in the lab'); };
export const listenForPaymentStatus = (
  _paymentId: string,
  _onStatus: (status: string) => void,
  _timeoutMs?: number,
): (() => void) => { throw new Error('Payment status updates are not enabled in the lab'); };
