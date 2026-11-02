import { createClient } from "@supabase/supabase-js";
import {
  assertBootstrapSecretConfigured,
  bootstrapAdminRequestSchema,
  mapBootstrapErrorMessage,
  secretsMatch,
} from "@klimacin/shared";
import { NextResponse } from "next/server";

/**
 * Secure first-admin bootstrap.
 * - Requires ADMIN_BOOTSTRAP_SECRET + SUPABASE_SERVICE_ROLE_KEY (server only)
 * - Calls bootstrap_first_platform_admin (refuses if admin already exists)
 * - No public admin signup; missing secrets → honest 503, not fake success
 */
export async function POST(request: Request) {
  const secretCheck = assertBootstrapSecretConfigured(
    process.env.ADMIN_BOOTSTRAP_SECRET,
  );
  if (!secretCheck.ok) {
    return NextResponse.json(
      { ok: false, error: secretCheck.error },
      { status: 503 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY / URL yok. Bootstrap bağlanmadan tamamlanmış sayılmaz.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Geçersiz JSON gövde." },
      { status: 400 },
    );
  }

  const parsed = bootstrapAdminRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Geçersiz istek",
      },
      { status: 400 },
    );
  }

  if (!secretsMatch(parsed.data.bootstrapSecret, secretCheck.secret)) {
    return NextResponse.json(
      {
        ok: false,
        error: mapBootstrapErrorMessage({
          message: "BOOTSTRAP_SECRET_INVALID",
        }),
      },
      { status: 403 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc("bootstrap_first_platform_admin", {
    p_profile_id: parsed.data.profileId,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: mapBootstrapErrorMessage(error) },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      profileId: (data as { profile_id?: string } | null)?.profile_id ??
        parsed.data.profileId,
      role: "platform_admin",
    },
  });
}
