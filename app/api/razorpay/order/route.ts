import Razorpay from "razorpay";
import { NextResponse } from "next/server";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: Request) {
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay credentials are not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const { amount, currency = "INR", notes } = await request.json();

    if (!amount || typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount,
      currency,
      notes,
      receipt: `bhukkadbox_${Date.now()}`,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to create Razorpay order", error);
    return NextResponse.json({ error: "Unable to create payment order." }, { status: 500 });
  }
}
