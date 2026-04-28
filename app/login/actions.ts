'use server'

import { redirect } from "next/navigation";
import { authenticateUser, createSessionToken, setSessionCookie } from "@/lib/auth";
import { getDefaultRoute } from "@/lib/rbac";
import { loginSchema } from "@/lib/validators";

export type LoginActionState = {
  error: string;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const payload = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!payload.success) {
    return { error: payload.error.issues[0]?.message ?? "Data login tidak valid." };
  }

  const session = await authenticateUser(payload.data.identifier, payload.data.password);
  if (!session) {
    return { error: "Username/email atau password tidak sesuai." };
  }

  const token = await createSessionToken(session);
  await setSessionCookie(token);

  redirect(session.mustChangePassword ? "/change-password" : getDefaultRoute(session.role));
}
