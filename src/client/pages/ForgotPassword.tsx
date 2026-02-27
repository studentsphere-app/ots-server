import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import { forgetPassword } from "../lib/auth-client";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const { data: _data, error: resetError } = await forgetPassword({
        email,
        redirectTo: "/reset-password",
      });

      if (resetError) {
        setError(
          resetError.message || t("forgot_password.error_sending_email")
        );
      } else {
        setSuccess(true);
      }
      // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
    } catch (err: any) {
      setError(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
            {t("forgot_password.title")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("forgot_password.description")}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg text-sm">
              {t("forgot_password.success")}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("forgot_password.email")}
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
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? t("forgot_password.sending")
                : t("forgot_password.submit")}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <a
            href="/login"
            className="text-sm font-semibold text-[#37B7D5] hover:text-[#2A9CB8]"
          >
            &larr; {t("forgot_password.back_to_login")}
          </a>
        </div>
      </div>
      <div className="mt-8">
        <Footer />
      </div>
    </div>
  );
}
