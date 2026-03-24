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

  try {
    // Test 1: Basic connectivity with explicit API version
    const stripe = new Stripe(key, {
      apiVersion: "2025-12-18.acacia" as any,
      maxNetworkRetries: 1,
      timeout: 10000,
    });

    const balance = await stripe.balance.retrieve();

    return NextResponse.json({
      status: "connected",
      keyPrefix: key.substring(0, 15) + "...",
      balanceAvailable: balance.available.length > 0,
      currency: balance.available[0]?.currency,
    });
  } catch (error: any) {
    // Test 2: Try without specifying API version
    try {
      const stripe2 = new Stripe(key, {
        maxNetworkRetries: 1,
        timeout: 10000,
      });
      const balance2 = await stripe2.balance.retrieve();

      return NextResponse.json({
        status: "connected_without_explicit_version",
        keyPrefix: key.substring(0, 15) + "...",
        balanceAvailable: balance2.available.length > 0,
        firstError: error.message,
      });
    } catch (error2: any) {
      return NextResponse.json({
        status: "failed",
        keyPrefix: key.substring(0, 15) + "...",
        error1: error.message,
        error1Type: error.type,
        error1Code: error.code,
        error2: error2.message,
        error2Type: error2.type,
        error2Code: error2.code,
        nodeVersion: process.version,
      });
    }
  }
}
