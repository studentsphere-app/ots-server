import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";
import { resetPassword } from "../lib/auth-client";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const criteria = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);
  const doPasswordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError(t("reset_password.error_invalid_password"));
      return;
    }

    if (!doPasswordsMatch) {
      setError(t("reset_password.error_passwords_dont_match"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { data: _data, error: resetError } = await resetPassword({
        newPassword: password,
        token: token || undefined,
      });

      if (resetError) {
        setError(resetError.message || t("reset_password.error_unexpected"));
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
      }
      // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
    } catch (err: any) {
      setError(err.message || t("reset_password.error_unexpected"));
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
            {t("reset_password.title")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("reset_password.description")}
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-6 rounded-lg text-center">
            <p className="font-medium mb-2">
              {t("reset_password.success_title")}
            </p>
            <p className="text-sm">{t("reset_password.success_redirect")}</p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("reset_password.password")}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("reset_password.confirm_password")}
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {/* Password strength indicator */}
              <div className="text-xs space-y-2 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-700 mb-1">
                  {t("settings.password_requirements")}
                </p>
                <ul className="space-y-1">
                  <li
                    className={`flex items-center gap-2 ${criteria.length ? "text-green-600" : "text-gray-500"}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {criteria.length ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      )}
                    </svg>
                    {t("settings.password_min_length")}
                  </li>
                  <li
                    className={`flex items-center gap-2 ${criteria.uppercase ? "text-green-600" : "text-gray-500"}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {criteria.uppercase ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      )}
                    </svg>
                    {t("settings.password_uppercase")}
                  </li>
                  <li
                    className={`flex items-center gap-2 ${criteria.lowercase ? "text-green-600" : "text-gray-500"}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {criteria.lowercase ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      )}
                    </svg>
                    {t("settings.password_lowercase")}
                  </li>
                  <li
                    className={`flex items-center gap-2 ${criteria.number ? "text-green-600" : "text-gray-500"}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {criteria.number ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      )}
                    </svg>
                    {t("settings.password_number")}
                  </li>
                  <li
                    className={`flex items-center gap-2 ${criteria.special ? "text-green-600" : "text-gray-500"}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {criteria.special ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      )}
                    </svg>
                    {t("settings.password_special")}
                  </li>
                  <li
                    className={`flex items-center gap-2 ${doPasswordsMatch ? "text-green-600" : "text-gray-500"}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {doPasswordsMatch ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      )}
                    </svg>
                    {t("settings.password_match")}
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !isPasswordValid || !doPasswordsMatch}
                className="w-full inline-flex justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? t("reset_password.loading")
                  : t("reset_password.submit")}
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-4">
          <a
            href="/login"
            className="text-sm font-semibold text-[#37B7D5] hover:text-[#2A9CB8]"
          >
            &larr; {t("reset_password.back_to_login")}
          </a>
        </div>
      </div>
      <div className="mt-8">
        <Footer />
      </div>
    </div>
  );
}
