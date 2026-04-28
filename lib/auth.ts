import { compareSync } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { findUserById, findUserByIdentifier, initializeData } from "@/lib/data";
import type { SessionPayload } from "@/lib/types";

export const AUTH_COOKIE_NAME = "wcf_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-secret-change-this-in-production",
);

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return null;
  }

  const user = await findUserById(session.userId);
  if (!user || !user.isActive) {
    return null;
  }

  return {
    userId: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    partnerId: user.partnerId,
    department: user.department,
    mustChangePassword: session.impersonatorId ? false : user.mustChangePassword,
    impersonatorId: session.impersonatorId,
    impersonatorName: session.impersonatorName,
    impersonatorRole: session.impersonatorRole,
    impersonatorDepartment: session.impersonatorDepartment,
  } satisfies SessionPayload;
}

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIE_NAME);
}

export async function authenticateUser(identifier: string, password: string) {
  await initializeData();
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    return null;
  }

  if (!user.isActive) {
    return null;
  }

  const matches = compareSync(password, user.passwordHash);
  if (!matches) {
    return null;
  }

  const { id, name, role, mustChangePassword, department, partnerId } = user;

  return {
    userId: id,
    name,
    username: user.username,
    email: user.email,
    role,
    partnerId,
    department,
    mustChangePassword,
  } satisfies SessionPayload;
}
