"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Forcefully clears all possible NextAuth/Auth.js cookies.
 * This is used to break out of "ghost session" loops where client-side 
 * signOut() fails due to CSRF issues.
 */
export async function forceLogout() {
  const cookieStore = await cookies();
  
  const authCookies = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token", 
    "__Secure-next-auth.session-token",
    "authjs.csrf-token",
    "__Secure-authjs.csrf-token",
    "authjs.callback-url",
    "authjs.state",
    "next-auth.callback-url",
    "next-auth.csrf-token"
  ];

  authCookies.forEach((name) => {
    cookieStore.delete(name);
  });

  console.log("[auth-actions] Force-cleared all auth cookies.");
  
  // Redirect back to login with a 'cleared' flag to show a fresh state
  redirect("/login?cleared=true");
}
