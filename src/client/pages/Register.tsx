import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import { signUp } from "../lib/auth-client";

export default function Register() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const criteria = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Veuillez respecter tous les critères du mot de passe.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { data: _data, error: signUpError } = await (signUp.email as any)({
        email,
        password,
        name,
        language: i18n.language.split("-")[0] || "fr",
      });

      if (signUpError) {
        setError(
          signUpError.message ||
            "Une erreur est survenue lors de l'inscription."
        );
      } else {
        // Inscription réussie, on redirige vers l'accueil
        window.location.href = "/";
      }
      // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
    } catch (err: any) {
      setError(err.message || "Une erreur inattendue est survenue.");
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
            {t("home.register")}
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
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("settings.username")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-gray-700 mb-1"
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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("login.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              </ul>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full inline-flex justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Chargement..." : "S'inscrire"}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <a
            href="/login"
            className="text-sm font-semibold text-[#37B7D5] hover:text-[#2A9CB8]"
          >
            Déjà un compte ? Connectez-vous
          </a>
        </div>
      </div>
      <div className="mt-8">
        <Footer />
      </div>
    </div>
  );
}
