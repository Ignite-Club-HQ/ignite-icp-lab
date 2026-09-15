// The second production Supabase client is also disabled.
export { supabase as websiteSupabase } from '@/integrations/supabase/client';

export interface MemberCheckoutParams {
  club_id: string;
  title: string;
  amount_cents: number;
  type: 'event' | 'subscription';
  interval?: 'week' | 'month' | 'year';
  payer_email?: string;
  description?: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
}

export interface MemberCheckoutResult {
  url?: string;
  payment_id: string;
  error?: string;
}

export const createMemberCheckout = async (
  _params: MemberCheckoutParams,
): Promise<MemberCheckoutResult> => {
  throw new Error('Checkout is not enabled in the lab');
};
export const listenForPaymentStatus = (
  _paymentId: string,
  _onStatus: (status: string) => void,
  _timeoutMs?: number,
): (() => void) => { throw new Error('Payment status updates are not enabled in the lab'); };
