import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    return NextResponse.json({
      error: "STRIPE_SECRET_KEY not set",
      allEnvKeys: Object.keys(process.env).filter(
        (k) => k.includes("STRIPE") || k.includes("SUPABASE")
      ),
    });
  }

  const results: Record<string, any> = {
    keyPrefix: key.substring(0, 15) + "...",
    nodeVersion: process.version,
  };

  // Test 1: Raw fetch to Stripe API
  try {
    const rawRes = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    const rawBody = await rawRes.text();
    results.rawFetch = {
      status: rawRes.status,
      ok: rawRes.ok,
      bodyPreview: rawBody.substring(0, 200),
    };
  } catch (fetchErr: any) {
    results.rawFetch = {
      error: fetchErr.message,
      cause: fetchErr.cause?.message,
    };
  }

  // Test 2: Stripe SDK with fetch override
  try {
    const stripe = new Stripe(key, {
      maxNetworkRetries: 0,
      timeout: 15000,
      httpClient: Stripe.createFetchHttpClient(),
    });
    const balance = await stripe.balance.retrieve();
    results.sdkFetch = {
      status: "ok",
      currency: balance.available[0]?.currency,
    };
  } catch (sdkErr: any) {
    results.sdkFetch = {
      error: sdkErr.message,
      type: sdkErr.type,
      code: sdkErr.code,
    };
  }

  // Test 3: Stripe SDK default (Node http)
  try {
    const stripe2 = new Stripe(key, {
      maxNetworkRetries: 0,
      timeout: 15000,
    });
    const balance2 = await stripe2.balance.retrieve();
    results.sdkDefault = {
      status: "ok",
      currency: balance2.available[0]?.currency,
    };
  } catch (sdkErr2: any) {
    results.sdkDefault = {
      error: sdkErr2.message,
      type: sdkErr2.type,
      code: sdkErr2.code,
    };
  }

  return NextResponse.json(results);
}
