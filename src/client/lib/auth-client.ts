import { apiKeyClient, oidcClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [oidcClient(), apiKeyClient()],
  user: {
    additionalFields: {
      language: {
        type: "string",
        defaultValue: "fr",
      },
    },
  },
});

export const { signIn, signUp, useSession, signOut } = authClient;

// biome-ignore lint/suspicious/noExplicitAny: library type mismatch
export const forgetPassword = (authClient as any).forgetPassword;
// biome-ignore lint/suspicious/noExplicitAny: library type mismatch
export const resetPassword = (authClient as any).resetPassword;
// biome-ignore lint/suspicious/noExplicitAny: library type mismatch
export const sendVerificationEmail = (authClient as any).sendVerificationEmail;
