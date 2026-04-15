import { apiKeyClient as separateApiKeyClient } from "@better-auth/api-key/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import type { auth } from "../../auth";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [
    oauthProviderClient(),
    separateApiKeyClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const {
  signIn,
  signUp,
  useSession,
  signOut,
  requestPasswordReset: forgetPassword,
  resetPassword,
} = authClient;
