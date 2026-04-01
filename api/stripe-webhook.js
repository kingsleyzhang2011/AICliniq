import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// We need the service role key to bypass RLS and update user_profiles securely
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// IMPORTANT: In production, supply SUPABASE_SERVICE_ROLE_KEY to bypass RLS! 
// If missing, falling back to ANON_KEY will likely fail the update due to RLS restricting modifications without a user session.

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  api: {
    bodyParser: false, // Disallow Vercel from parsing body to JSON so we can construct raw buffer for Stripe signature verification
  },
};

// Helper to get raw body
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).send('Server configuration missing: STRIPE_WEBHOOK_SECRET');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful subscription
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const customerId = session.customer;

    if (userId) {
      console.log(`Upgrading user ${userId} to Pro with Stripe Customer ID ${customerId}`);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          plan_type: 'pro',
          stripe_customer_id: customerId
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update user profile to Pro:', error);
        return res.status(500).send('Database Update Failed');
      }
    }
  }

  // Handle cancelled or expired subscription
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    if (customerId) {
        console.log(`Downgrading subscription for customer ${customerId}`);
        const { error } = await supabase
        .from('user_profiles')
        .update({ plan_type: 'free' })
        .eq('stripe_customer_id', customerId);

        if (error) {
            console.error('Failed to downgrade user profile:', error);
            // Don't fail the webhook on this so Stripe knows it was received
        }
    }
  }

  res.status(200).json({ received: true });
}
