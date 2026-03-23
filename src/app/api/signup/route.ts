import { NextRequest, NextResponse } from "next/server";

interface SignupData {
  name: string;
  email: string;
  phone: string;
}

function validateSignup(data: unknown): { valid: true; data: SignupData } | { valid: false; errors: Record<string, string> } {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: { form: "Invalid request body" } };
  }

  const { name, email, phone } = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.name = "Name is required";
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Invalid email address";
  }
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    errors.phone = "Phone is required";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name: (name as string).trim(),
      email: (email as string).trim(),
      phone: (phone as string).trim(),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validateSignup(body);

    if (!result.valid) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 400 });
    }

    // TODO: Store the lead — options:
    // - Resend email notification
    // - Supabase row insert
    // - Webhook to CRM
    // For now, log and return success
    console.log("New signup lead:", result.data);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, errors: { form: "Server error" } }, { status: 500 });
  }
}
