import type Stripe from "stripe";

export const STRIPE_SUCCESSFUL_EVENT_TYPES: Stripe.Event.Type[] = [
  "checkout.session.completed",
];

export const STRIPE_FAILED_EVENT_TYPES: Stripe.Event.Type[] = [
  "checkout.session.expired",
];

export const STRIPE_REFUNDED_EVENT_TYPES: Stripe.Event.Type[] = [
  "charge.refunded",
];
