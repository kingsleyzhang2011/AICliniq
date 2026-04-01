import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use a stable API version
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, email } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      client_reference_id: userId,
      customer_email: email || undefined,
      line_items: [
        {
          price: process.env.VITE_STRIPE_PRICE_ID, // User will configure this in Vercel Env
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.VITE_BASE_URL || req.headers.origin}/#/home?session_id={CHECKOUT_SESSION_ID}&upgraded=true`,
      cancel_url: `${process.env.VITE_BASE_URL || req.headers.origin}/#/pricing?canceled=true`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout Error:', err);
    res.status(500).json({ error: err.message, detailed: "If price not found, ensure VITE_STRIPE_PRICE_ID is set via environment variable." });
  }
}
