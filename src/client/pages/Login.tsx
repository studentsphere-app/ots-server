import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";
import { signIn } from "../lib/auth-client";

export default function Login() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const getRedirectTarget = () => {
    const clientId = searchParams.get("client_id");
    const returnTo = searchParams.get("returnTo");
    const error = searchParams.get("error");

    // If there's an OAuth error in the URL, don't try to resume the flow,
    // just go back to the app or homepage to avoid loops.
    if (error && !clientId) {
      return "/";
    }

    if (clientId) {
      // If we have clientId, we are in an OAuth flow.
      // Redirect back to authorize to resume.
      const authorizeParams = new URLSearchParams();
      for (const [key, value] of searchParams.entries()) {
        if (key !== "returnTo") {
          authorizeParams.set(key, value);
        }
      }
      return `/api/auth/oauth2/authorize?${authorizeParams.toString()}`;
    }

    return returnTo || searchParams.get("callbackURL") || "/";
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: _data, error: signInError } = await signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || t("login.error_invalid"));
      } else {
        // Connexion réussie, on redirige vers l'accueil
        window.location.href = getRedirectTarget();
      }
      // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
    } catch (err: any) {
      setError(err.message || t("login.error_unexpected"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col items-center">
          <Link to="/">
            <img
              src="/logo.png"
              alt="Open Timetable Scraper Logo"
              className="h-16 w-auto"
            />
          </Link>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            {t("login.title")}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                {t("login.email")}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  {t("login.password")}
                </label>
                <a
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#37B7D5] hover:text-[#2A9CB8]"
                >
                  {t("login.forgot_password")}
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("login.loading") : t("login.submit")}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <a
            href="/register"
            className="text-sm font-semibold text-[#37B7D5] hover:text-[#2A9CB8]"
          >
            {t("login.no_account")}
          </a>
        </div>
      </div>
      <div className="mt-8">
        <Footer />
      </div>
    </div>
  );
}
