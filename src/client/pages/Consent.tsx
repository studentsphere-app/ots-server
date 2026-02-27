import { Clock, Info, Shield, TriangleAlert } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";
import {
  authClient,
  sendVerificationEmail,
  useSession,
} from "../lib/auth-client";
import NotFound from "./NotFound";

interface AppInfo {
  name: string | null;
  icon: string | null;
  metadata: string | null;
  isInternal?: boolean;
}

interface AppMetadata {
  website?: string;
  developerContact?: string;
  tosLink?: string;
  privacyPolicyLink?: string;
  requestedPermissions?: string[];
}

export default function Consent() {
  const { t, i18n } = useTranslation();

  // Parse scope string into human-readable labels
  const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
    openid: {
      label: t("consent.openid_scope"),
      description: t("consent.desc_openid"),
    },
    profile: {
      label: t("consent.profile_scope"),
      description: t("consent.desc_profile"),
    },
    email: {
      label: t("consent.email_scope"),
      description: t("consent.desc_email"),
    },
    timetable: {
      label: t("consent.timetable_scope"),
      description: t("consent.desc_timetable"),
    },
    offline_access: {
      label: t("consent.offline_access_scope"),
      description: t("consent.desc_offline_access"),
    },
  };

  const { data: session, isPending } = useSession();

  const [langInitialized, setLangInitialized] = useState(false);

  // Sync language with user preference only once on load
  useEffect(() => {
    const user = session?.user as any;
    const sessionLang = user?.language;
    if (sessionLang && !langInitialized) {
      i18n.changeLanguage(sessionLang);
      setLangInitialized(true);
    }
  }, [(session?.user as any)?.language, i18n, langInitialized, session?.user]);
  const [searchParams] = useSearchParams();
  const consentCode = searchParams.get("consent_code");
  const clientId = searchParams.get("client_id");
  const scope = searchParams.get("scope");
  const hasTimetableScope = (scope || "")
    .split(/[\s,+]+/)
    .includes("timetable");

  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [appInfoLoading, setAppInfoLoading] = useState(true);
  const [isValidatingCode, setIsValidatingCode] = useState(true);
  const [isCodeValid, setIsCodeValid] = useState(false);

  // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
  const [timetables, setTimetables] = useState<any[]>([]);
  // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedTimetables, setSelectedTimetables] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState<{
    coursesCount: number;
  } | null>(null);

  // Form state for modal
  const [providerId, setProviderId] = useState("");
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [syncInterval, setSyncInterval] = useState(60);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
  const selectedProvider = providers.find((p: any) => p.id === providerId);

  // Auto-select first school when provider changes
  useEffect(() => {
    if (selectedProvider?.schools && selectedProvider.schools.length > 0) {
      setSchoolId(selectedProvider.schools[0].id);
    } else {
      setSchoolId("");
    }
  }, [selectedProvider?.schools?.length, selectedProvider?.schools]);

  // Fetch OAuth app info
  useEffect(() => {
    if (!clientId) {
      setAppInfoLoading(false);
      return;
    }
    fetch(`/api/oauth/client-info/${clientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAppInfo(data))
      .catch(() => setAppInfo(null))
      .finally(() => setAppInfoLoading(false));
  }, [clientId]);

  // Validate consent code
  useEffect(() => {
    if (!consentCode) {
      setIsValidatingCode(false);
      setIsCodeValid(false);
      return;
    }

    fetch(`/api/oauth/validate-consent?consent_code=${consentCode}`)
      .then((res) => {
        if (res.ok) {
          setIsCodeValid(true);
        } else {
          setIsCodeValid(false);
        }
      })
      .catch(() => {
        setIsCodeValid(false);
      })
      .finally(() => {
        setIsValidatingCode(false);
      });
  }, [consentCode]);

  const fetchTimetables = useCallback(async () => {
    try {
      const res = await fetch("/api/timetables");
      if (res.ok) {
        const data = await res.json();
        setTimetables(data);
        // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
        setSelectedTimetables(data.map((t: any) => t.id));
      }
    } catch (err) {
      console.error("Failed to fetch timetables", err);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
        if (data.length > 0) setProviderId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch providers", err);
    }
  }, []);

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendStatus(null);
    try {
      if (!session?.user?.email) return;
      const { error } = await sendVerificationEmail({
        email: session.user.email,
        callbackURL: window.location.origin,
      });

      if (error) {
        setResendStatus({
          type: "error",
          message: error.message || t("home.resend_error"),
        });
      } else {
        setResendStatus({
          type: "success",
          message: t("home.resend_success"),
        });
      }
    } catch (err: any) {
      setResendStatus({
        type: "error",
        message: err.message || t("home.resend_error"),
      });
    } finally {
      setResendingEmail(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTimetables();
      fetchProviders();
    }
  }, [session, fetchProviders, fetchTimetables]);

  const handleAddTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSyncSuccess(null);

    try {
      const res = await fetch("/api/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          schoolId,
          identifier,
          password,
          syncInterval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t("consent.error"));
      }

      setIsModalOpen(false);
      setIdentifier("");
      setPassword("");
      setSchoolId("");

      const fetchRes = await fetch("/api/timetables");
      if (fetchRes.ok) {
        const newData = await fetchRes.json();
        setTimetables(newData);
        setSelectedTimetables((prev) => [...prev, data.timetable.id]);
      }
      // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConsent = async (accept: boolean) => {
    setLoading(true);
    setError("");
    try {
      if (accept && hasTimetableScope) {
        const res = await fetch("/api/oauth/timetable-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, timetableIds: selectedTimetables }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(
            data.message || "Erreur lors de la sauvegarde des accès"
          );
        }
      }

      const response = await authClient.oauth2.consent({
        accept,
        consent_code: consentCode || undefined,
      });

      if (response?.error) {
        throw new Error(response.error.message);
      }

      if (response?.data?.redirectURI) {
        // Redirect to callback
        window.location.href = response.data.redirectURI;
      }
      // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleTimetable = (id: string) => {
    setSelectedTimetables((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  // Derive initials from app name for fallback avatar
  const appInitials = appInfo?.name
    ? appInfo.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Parse scopes into readable list, ignoring unknown ones
  const scopeList = (scope || "")
    .split(/[\s,+]+/)
    .filter((s) => !!SCOPE_LABELS[s])
    .map((s) => ({ id: s, ...SCOPE_LABELS[s] }));

  const metadata: AppMetadata | null = appInfo?.metadata
    ? JSON.parse(appInfo.metadata)
    : null;

  const unauthorizedScopes = scopeList.filter(
    (s) => !metadata?.requestedPermissions?.includes(s.id)
  );

  if (!consentCode) {
    return <NotFound />;
  }

  if (isPending || appInfoLoading || isValidatingCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">{t("consent.loading")}</p>
      </div>
    );
  }

  if (!isCodeValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-12 px-4 shadow-sm border border-gray-200 sm:rounded-xl sm:px-10 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              role="img"
              aria-label="Error"
            >
              <title>Error</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t("consent.invalid_code_title")}
          </h1>
          <p className="text-gray-500 mb-8">
            {t("consent.invalid_code_desc")}
          </p>
        </div>
        <div className="mt-8 pb-8">
          <Footer />
        </div>
      </div>
    );
  }

  if (unauthorizedScopes.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-12 px-4 shadow-sm border border-gray-200 sm:rounded-xl sm:px-10 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              role="img"
              aria-label="Error"
            >
              <title>Error</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t("consent.unauthorized_scopes_title")}
          </h1>
          <p className="text-gray-500 mb-8">
            {t("consent.unauthorized_scopes_desc")}
          </p>
        </div>
        <div className="mt-8 pb-8">
          <Footer />
        </div>
      </div>
    );
  }

  // Find requested timetables matching user's accounts
  if (!session) {
    const loginUrl = new URL(`${window.location.origin}/login`);
    searchParams.forEach((value, key) => {
      loginUrl.searchParams.set(key, value);
    });
    // Also set returnTo just in case
    loginUrl.searchParams.set(
      "returnTo",
      window.location.pathname + window.location.search
    );

    return (
      <Navigate to={`/login?${loginUrl.searchParams.toString()}`} replace />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header with logo animation */}
      <div className="mb-12 w-full max-w-md flex items-center justify-center relative">
        <div className="flex items-center justify-between w-56 relative z-10">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center p-3">
            {appInfo?.icon ? (
              <img
                src={appInfo.icon}
                alt={appInfo.name || "App"}
                className="w-full h-full object-contain text-transparent border-0"
              />
            ) : (
              <div className="w-full h-full bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                {appInitials}
              </div>
            )}
          </div>

          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center p-3">
            <img
              src="/logo-short.png"
              alt="Open Timetable Scraper Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Animated connection line */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 border-t-2 border-dashed border-gray-300 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {!session?.user?.emailVerified ? (
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-4 shadow-sm border border-gray-200 sm:rounded-xl sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t("consent.unverified_title")}
            </h1>
            <p className="text-gray-500 mb-8">{t("consent.unverified_desc")}</p>

            {resendStatus && (
              <div
                className={`mb-6 p-4 rounded-xl text-sm font-medium ${
                  resendStatus.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-red-50 text-red-700 border border-red-100"
                }`}
              >
                {resendStatus.message}
              </div>
            )}

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="w-full flex items-center justify-center rounded-xl px-6 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all disabled:opacity-50"
            >
              {resendingEmail
                ? t("home.resending")
                : t("consent.unverified_button")}
            </button>
          </div>
        </div>
      ) : (
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-xl sm:px-10">
            <div className="text-center mb-4">
              <h1 className="text-xl font-medium text-gray-900 leading-tight mb-4">
                {t("consent.authorize_title_start")}{" "}
                <span className="text-[#37B7D5] font-bold">
                  @{appInfo?.name || clientId}
                </span>{" "}
                {t("consent.authorize_title_end")}{" "}
                <span className="font-bold">Open Timetable Scraper</span>
              </h1>
              {appInfo && (
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${appInfo.isInternal ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                    {appInfo.isInternal ? (
                      <>
                        <Info className="w-3.5 h-3.5" />
                        {t("consent.internal_app")}
                      </>
                    ) : (
                     <>
                        <TriangleAlert className="w-3.5 h-3.5" />
                        {t("consent.external_app")}
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm flex gap-3">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-red-400 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* Permissions section - GitHub style */}
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-100">
                {t("consent.app_can")}
              </h2>
              <ul className="space-y-4">
                {scopeList.map((s) => (
                  <li key={s.id} className="flex gap-4">
                    <div className="shrink-0 w-5 h-5 mt-0.5 text-gray-400">
                      {s.id === "openid" && (
                        <svg
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                      )}
                      {s.id === "profile" && (
                        <svg
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      )}
                      {s.id === "email" && (
                        <svg
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                      {s.id === "timetable" && (
                        <svg
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                      {s.id === "offline_access" && (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {s.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Timetable selection */}
            {hasTimetableScope && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                  {t("consent.timetables_to_share")}
                </h3>

                {timetables.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-4">
                      {t("consent.no_timetables")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                    >
                      + {t("consent.add_timetable")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                      {timetables.map((timetable) => {
                        const provider = providers.find(
                          // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
                          (p: any) => p.id === timetable.providerId
                        );
                        const school = provider?.schools?.find(
                          // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
                          (s: any) => s.id === timetable.schoolId
                        );
                        return (
                          <label
                            key={timetable.id}
                            className="flex items-start gap-3 p-4 bg-white border-gray-200 rounded-lg cursor-pointer hover:border-[#37B7D5] border transition-colors"
                          >
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={selectedTimetables.includes(
                                  timetable.id
                                )}
                                onChange={() => toggleTimetable(timetable.id)}
                                className="h-5 w-5 text-[#37B7D5] border-gray-300 rounded focus:ring-[#37B7D5]"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                {provider?.logo && (
                                  <img
                                    src={provider.logo}
                                    alt={provider.name}
                                    className="w-6 h-6 rounded object-contain bg-gray-50 p-0.5 border border-gray-100 shrink-0"
                                  />
                                )}
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {provider?.name || timetable.providerId}
                                </p>
                              </div>

                              <div className="text-xs text-gray-500 space-y-2">
                                {school && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">
                                      {t("home.school")}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-medium text-gray-700 text-right">
                                      {school.logo && (
                                        <img
                                          src={school.logo}
                                          alt={school.name}
                                          className="w-3.5 h-3.5 rounded object-contain"
                                        />
                                      )}
                                      <span
                                        className="truncate max-w-[120px]"
                                        title={school.name}
                                      >
                                        {school.name}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <p className="flex justify-between">
                                  <span className="text-gray-400">
                                    {t("home.sync_interval")}
                                  </span>
                                  <span className="font-medium text-gray-700">
                                    {timetable.syncInterval} min
                                  </span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-gray-400">
                                    {t("home.last_sync")}
                                  </span>
                                  <span className="font-medium text-gray-700">
                                    {timetable.lastSyncedAt
                                      ? new Date(
                                          timetable.lastSyncedAt
                                        ).toLocaleString()
                                      : t("home.never")}
                                  </span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-gray-400">
                                    {t("home.courses_fetched")}
                                  </span>
                                  <span className="font-medium text-gray-700">
                                    {timetable.courses?.length || 0}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs text-[#37B7D5] hover:text-[#2A9CB8] font-medium"
                    >
                      + {t("consent.add_another_timetable")}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* User profile footer */}
            <div className="mb-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    className="w-8 h-8 rounded-full border border-gray-200"
                    alt=""
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#E6F7FA] flex items-center justify-center text-[#2A9CB8] font-bold text-xs uppercase">
                    {(session.user.name || session.user.email).slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {session.user.name || "Utilisateur"}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 text-right italic">
                {t("consent.connected_via")}
              </div>
            </div>

            {/* App Metadata Links and Info */}
            {metadata &&
              (metadata.website ||
                metadata.developerContact ||
                metadata.tosLink ||
                metadata.privacyPolicyLink) && (
                <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    {t("consent.app_information", "Informations de l'application")}
                  </h3>
                  <div className="space-y-3 text-sm">
                    {metadata.website && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">
                          {t("consent.app_website")}
                        </span>
                        <a
                          href={metadata.website}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#37B7D5] hover:text-[#2A9CB8] truncate max-w-[180px]"
                        >
                          {new URL(metadata.website).hostname}
                        </a>
                      </div>
                    )}
                    {metadata.developerContact && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">
                          {t("consent.developer_contact")}
                        </span>
                        <a
                          href={`mailto:${metadata.developerContact}`}
                          className="font-medium text-gray-700 hover:text-gray-900 truncate max-w-[180px]"
                        >
                          {metadata.developerContact}
                        </a>
                      </div>
                    )}
                    {metadata.tosLink && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">
                          {t("consent.tos")}
                        </span>
                        <a
                          href={metadata.tosLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#37B7D5] hover:text-[#2A9CB8] text-right"
                        >
                          {t("consent.tos")} &rarr;
                        </a>
                      </div>
                    )}
                    {metadata.privacyPolicyLink && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">
                          {t("consent.privacy_policy")}
                        </span>
                        <a
                          href={metadata.privacyPolicyLink}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#37B7D5] hover:text-[#2A9CB8] text-right"
                        >
                          {t("consent.privacy_policy")} &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => handleConsent(true)}
                disabled={
                  loading ||
                  (hasTimetableScope &&
                    timetables.length > 0 &&
                    selectedTimetables.length === 0)
                }
                className="w-full h-11 flex items-center justify-center rounded-lg bg-[#37B7D5] text-white font-semibold text-sm hover:bg-[#2A9CB8] shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? t("consent.authorizing")
                  : t("consent.authorize_button", {
                      app: appInfo?.name || t("consent.default_app_name"),
                    })}
              </button>
              <button
                type="button"
                onClick={() => handleConsent(false)}
                disabled={loading}
                className="w-full h-11 flex items-center justify-center rounded-lg bg-gray-50 text-gray-700 border border-gray-200 font-semibold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {t("consent.cancel")}
              </button>
            </div>

            <p className="mt-6 text-[11px] text-gray-400 text-center px-4 leading-relaxed">
              {t("consent.redirect_warning_start")}{" "}
              <span className="font-semibold text-gray-600 block my-1">
                {appInfo?.name ? appInfo.name : t("consent.redirect_app")}
              </span>
            </p>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-800 flex items-center justify-center gap-1.5 mb-2">
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {t("consent.security_warning_title")}
              </h4>
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                {t("consent.security_warning_desc", {
                  app: appInfo?.name || t("consent.default_app_name"),
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Timetable Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => {
                if (!loading) {
                  setIsModalOpen(false);
                  setSyncSuccess(null);
                }
              }}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddTimetable}>
                <div className="bg-white px-8 pt-8 pb-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      {t("home.add_timetable_title")}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (!loading) {
                          setIsModalOpen(false);
                          setSyncSuccess(null);
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      disabled={loading}
                    >
                      <svg
                        aria-hidden="true"
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  {syncSuccess ? (
                    <div className="py-8 text-center">
                      <div
                        className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${syncSuccess.coursesCount === 0 ? "bg-red-100" : "bg-green-100"}`}
                      >
                        {syncSuccess.coursesCount === 0 ? (
                          <svg
                            aria-hidden="true"
                            className="h-8 w-8 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        ) : (
                          <svg
                            aria-hidden="true"
                            className="h-8 w-8 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {syncSuccess.coursesCount === 0
                          ? t("home.sync_failed")
                          : t("home.sync_success")}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                        {syncSuccess.coursesCount === 0
                          ? t("home.sync_no_courses")
                          : t("home.sync_courses_fetched", {
                              count: syncSuccess.coursesCount,
                            })}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          setSyncSuccess(null);
                        }}
                        className="inline-flex justify-center rounded-xl px-6 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] shadow-sm transition-all"
                      >
                        {t("home.finish")}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          {t("home.platform_provider")}
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              setIsProviderDropdownOpen(!isProviderDropdownOpen)
                            }
                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all flex items-center justify-between ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <div className="flex items-center gap-3">
                              {selectedProvider?.logo ? (
                                <img
                                  src={selectedProvider.logo}
                                  alt={selectedProvider.name}
                                  className="w-6 h-6 rounded-md object-contain bg-white p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-md bg-gray-200 shrink-0"></div>
                              )}
                              <span className="font-medium text-gray-700">
                                {selectedProvider?.name ||
                                  t("home.select_platform")}
                              </span>
                            </div>
                            <svg
                              aria-hidden="true"
                              className={`w-5 h-5 text-gray-400 transition-transform ${isProviderDropdownOpen ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {isProviderDropdownOpen && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                              {/* biome-ignore lint/suspicious/noExplicitAny: error type is unknown */}
                              {providers.map((p: any) => (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => {
                                    setProviderId(p.id);
                                    setIsProviderDropdownOpen(false);
                                  }}
                                  className={`w-full text-left flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                    providerId === p.id
                                      ? "bg-[#E6F7FA]"
                                      : "hover:bg-gray-50"
                                  }`}
                                >
                                  {p.logo ? (
                                    <img
                                      src={p.logo}
                                      alt={p.name}
                                      className="w-8 h-8 rounded-lg border border-gray-100 object-contain bg-white p-1 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0"></div>
                                  )}
                                  <span
                                    className={`text-sm font-medium ${providerId === p.id ? "text-[#1E7A91]" : "text-gray-700"}`}
                                  >
                                    {p.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedProvider?.schools &&
                        selectedProvider.schools.length > 0 && (
                          <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                              {t("home.school_label")}
                            </span>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                              {/* biome-ignore lint/suspicious/noExplicitAny: error type is unknown */}
                              {selectedProvider.schools.map((school: any) => (
                                <button
                                  type="button"
                                  disabled={loading}
                                  key={school.id}
                                  onClick={() => setSchoolId(school.id)}
                                  className={`w-full text-left flex items-center p-3 rounded-xl transition-all ${
                                    schoolId === school.id
                                      ? "border-2 border-[#37B7D5] bg-[#E6F7FA] shrink-0"
                                      : "border-2 border-gray-200 hover:border-gray-300 bg-white"
                                  } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                  {school.logo && (
                                    <img
                                      src={school.logo}
                                      alt={school.name}
                                      className="w-10 h-10 rounded-md mr-3 object-contain bg-white p-1"
                                    />
                                  )}
                                  <span
                                    className={`text-sm font-medium ${schoolId === school.id ? "text-[#1E7A91]" : "text-gray-700"}`}
                                  >
                                    {school.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="identifier"
                            className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                          >
                            {t("home.identifier")}
                          </label>
                          <input
                            id="identifier"
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="password"
                            className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                          >
                            {t("home.password")}
                          </label>
                          <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="sync-interval"
                          className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                        >
                          {t("home.sync_interval_label")}
                        </label>
                        <div className="relative">
                          <input
                            id="sync-interval"
                            type="number"
                            min="15"
                            value={syncInterval}
                            onChange={(e) =>
                              setSyncInterval(parseInt(e.target.value, 10))
                            }
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                            disabled={loading}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                            MIN
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {!syncSuccess && (
                  <div className="bg-gray-50 px-8 py-6 flex flex-row-reverse gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] shadow-sm transition-all disabled:opacity-50"
                    >
                      {loading
                        ? t("home.syncing_in_progress")
                        : t("home.add_timetable_submit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setSyncSuccess(null);
                      }}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-white border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      {t("home.cancel")}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
      <div className="mt-8 pb-8">
        <Footer />
      </div>
    </div>
  );
}
