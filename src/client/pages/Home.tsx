import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Eye,
  Globe,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import Footer from "../components/Footer";
import TimetablePreviewModal from "../components/TimetablePreviewModal";
import { sendVerificationEmail } from "../lib/auth-client";

export default function Home() {
  const { t, i18n } = useTranslation();
  // biome-ignore lint/suspicious/noExplicitAny: state
  const [session, setSession] = useState<any>(null);

  const [langInitialized, setLangInitialized] = useState(false);

  // Sync language with user preference only once on load
  useEffect(() => {
    const sessionLang = session?.user?.language;
    if (sessionLang && !langInitialized) {
      i18n.changeLanguage(sessionLang);
      setLangInitialized(true);
    }
  }, [session?.user?.language, i18n, langInitialized]);
  const [isPending, setIsPending] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: state
  const [timetables, setTimetables] = useState<any[]>([]);
  // biome-ignore lint/suspicious/noExplicitAny: state
  const [providers, setProviders] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnverifiedModalOpen, setIsUnverifiedModalOpen] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: state
  const [previewTimetable, setPreviewTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState<{
    coursesCount: number;
  } | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch session manually instead of using better-auth hook
  useEffect(() => {
    let mounted = true;
    setIsPending(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn(
          "[Home] Session fetch timeout - treating as not logged in"
        );
        setSession(null);
        setIsPending(false);
      }
      controller.abort();
    }, 3000); // 3 second timeout

    fetch("/api/auth/get-session", {
      signal: controller.signal,
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Session fetch failed");
        }
        return res.json();
      })
      .then((data) => {
        clearTimeout(timeoutId);
        if (mounted) {
          setSession(data);
          setIsPending(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[Home] Failed to fetch session:", err);
        }
        clearTimeout(timeoutId);
        if (mounted) {
          // Don't treat as error, just not logged in
          setSession(null);
          setIsPending(false);
        }
      });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      try {
        controller.abort();
      } catch (_e) {
        // Ignore abort errors
      }
    };
  }, []);

  // Form state
  const [providerId, setProviderId] = useState("");
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [syncInterval, setSyncInterval] = useState(60);

  const fetchTimetables = useCallback(async () => {
    try {
      const res = await fetch("/api/timetables");
      if (res.ok) {
        const data = await res.json();
        setTimetables(data);
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
        if (data.length > 0) {
          setProviderId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch providers", err);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchTimetables();
      fetchProviders();

      // Poll timetables every minute to update sync status and courses count
      const interval = setInterval(() => {
        fetchTimetables();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [session, fetchProviders, fetchTimetables]);

  const selectedProvider = providers.find((p) => p.id === providerId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset schoolId when providerId changes
  useEffect(() => {
    setSchoolId("");
  }, [providerId]);

  const handleAddTimetable = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      selectedProvider?.schools &&
      selectedProvider.schools.length > 0 &&
      !schoolId
    ) {
      setError(t("home.select_school"));
      return;
    }

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
        throw new Error(data.message || "Une erreur est survenue");
      }

      const newTimetableId = data.timetable.id;

      // Poll until sync finishes
      let isSyncFinished = false;
      let finalCoursesCount = 0;

      while (!isSyncFinished) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const listRes = await fetch("/api/timetables");
        if (listRes.ok) {
          const listData = await listRes.json();
          // biome-ignore lint/suspicious/noExplicitAny: error
          const updatedTimetable = listData.find(
            // biome-ignore lint/suspicious/noExplicitAny: error
            (t: any) => t.id === newTimetableId
          );

          if (updatedTimetable) {
            if (!updatedTimetable.isSyncing && updatedTimetable.lastSyncedAt) {
              isSyncFinished = true;
              finalCoursesCount = updatedTimetable.courses?.length || 0;
            }
          } else {
            // Timetable was deleted or not found (e.g., if syncFailed and it got removed, though we decided not to remove it. Still good practice to check logic)
            throw new Error("L'emploi du temps a disparu pendant la synchronisation.");
          }
        }
      }

      setSyncSuccess({ coursesCount: finalCoursesCount });
      setIdentifier("");
      setPassword("");
      setSchoolId("");
      fetchTimetables();
      // biome-ignore lint/suspicious/noExplicitAny: error
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimetable = async (id: string) => {
    if (!window.confirm(t("home.delete_confirm"))) {
      return;
    }

    try {
      const res = await fetch(`/api/timetables/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTimetables();
      } else {
        const data = await res.json();
        alert(data.message || t("home.delete_error"));
      }
    } catch (err) {
      console.error("Failed to delete timetable", err);
      alert(t("home.network_error"));
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendStatus(null);
    try {
      const { error } = await sendVerificationEmail({
        email: session.user.email,
        callbackURL: window.location.origin,
      });
      if (error) {
        setResendStatus({ type: "error", message: t("home.resend_error") });
      } else {
        setResendStatus({ type: "success", message: t("home.resend_success") });
      }
    } catch (err) {
      console.error("Failed to resend verification email", err);
      setResendStatus({ type: "error", message: t("home.resend_error") });
    } finally {
      setResendingEmail(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#2A9CB8] border-r-transparent mb-4"></div>
          <p className="text-gray-500 text-lg">{t("home.loading")}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white">
        {/* Navigation/Header - kept minimal */}
        <div className="border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2 group">
                <img
                  src="/logo.png"
                  alt="Open Timetable Scraper Logo"
                  className="h-8 w-auto group-hover:opacity-90 transition-opacity"
                />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/studentsphere-app/ots-server"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  className="w-4 h-4"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span>GitHub</span>
              </a>
              <a
                href="/login"
                className="text-sm font-medium border border-gray-200 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all"
              >
                {t("home.login")}
              </a>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight max-w-4xl mx-auto">
            <Trans i18nKey="landing.hero.title">
              L'agrégateur d'emploi du temps Open-Source qui
              <span className="text-[#2A9CB8]">
                {" "}
                centralise vos cours à la source
              </span>
            </Trans>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            <Trans i18nKey="landing.hero.subtitle">
              Un outil conçu pour <strong>automatiser la récupération</strong>{" "}
              de vos emplois du temps à la source. Centralisez vos cours via un
              collecteur performant et connectez votre planning à
              <strong> n'importe quelle application</strong> grâce à une API.
            </Trans>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a
              href="/register"
              className="px-8 py-3.5 bg-[#37B7D5] text-white font-semibold rounded-lg hover:bg-[#2A9CB8] transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {t("landing.hero.cta_start")}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/studentsphere-app/ots-server"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 bg-white text-gray-700 border border-gray-200 font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Code2 className="w-4 h-4 text-gray-500" />
              {t("landing.hero.cta_docs")}
            </a>
          </div>

          {/* Code Preview / Tech Stack visualization */}
          {/* Code Preview / White Theme */}
          <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-3xl mx-auto border border-gray-200 text-left">
            <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="text-xs text-gray-500 font-mono">
                timetable.ts
              </div>
            </div>
            <div className="p-6 font-mono text-sm overflow-x-auto leading-relaxed">
              <div className="text-gray-800">
                <div>
                  <span className="text-purple-600">const</span> response ={" "}
                  <span className="text-blue-600">await</span>{" "}
                  <span className="text-indigo-500">fetch</span>(
                  <span className="text-emerald-600">
                    "http://ots.studentsphere.app/api/v1/timetables/
                    <span className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700 text-xs font-bold mx-0.5">
                      ID
                    </span>
                    "
                  </span>
                  , {"{"}
                </div>

                <div className="pl-6">
                  <span className="text-gray-700">headers</span>: {"{"}
                </div>

                <div className="pl-12">
                  <span className="text-emerald-600">"x-api-key"</span>:{" "}
                  <span className="text-emerald-600">
                    "
                    <span className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-700 text-xs font-bold mx-0.5">
                      API_KEY
                    </span>
                    "
                  </span>
                </div>

                <div className="pl-6">{"}"}</div>
                <div>{"}"});</div>

                <div className="mt-3">
                  <span className="text-purple-600">const</span>{" "}
                  <span className="text-gray-900 font-semibold">
                    school_timetable
                  </span>{" "}
                  = <span className="text-blue-600">await</span> response.
                  <span className="text-indigo-500">json</span>();
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="bg-gray-50 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {t("landing.features.title")}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {t("landing.features.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-6">
                  <Zap className="w-5 h-5 text-[#37B7D5]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t("landing.features.auto_collect.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t("landing.features.auto_collect.desc")}
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-6">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t("landing.features.open_source.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t("landing.features.open_source.desc")}
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-6">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t("landing.features.multi_platform.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {t("landing.features.multi_platform.desc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How it Works / Steps */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            {t("landing.steps.title")}
          </h2>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#37B7D5] font-bold text-sm">
                  1
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">
                  {t("landing.steps.step1.title")}
                </h4>
                <p className="text-gray-600 text-sm">
                  {t("landing.steps.step1.desc")}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#37B7D5] font-bold text-sm">
                  2
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">
                  {t("landing.steps.step2.title")}
                </h4>
                <p className="text-gray-600 text-sm">
                  {t("landing.steps.step2.desc")}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#37B7D5] font-bold text-sm">
                  3
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">
                  {t("landing.steps.step3.title")}
                </h4>
                <p className="text-gray-600 text-sm">
                  {t("landing.steps.step3.desc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gray-900 text-white py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              <Trans i18nKey="landing.deploy.title">
                Prêt à déployer votre propre instance
                <br />
                Open Timetable Scraper ?
              </Trans>
            </h2>
            <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
              {t("landing.deploy.desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/studentsphere-app/ots-server"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-all border border-gray-700"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  className="w-4 h-4"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                {t("landing.deploy.cta")}
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <Footer />
          </div>
        </div>

        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {!session.user.emailVerified && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-amber-800">
                {t("home.verify_email_banner")}
              </p>
            </div>
            {resendStatus?.type !== "success" && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="whitespace-nowrap px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {resendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
                    {t("home.resending")}
                  </>
                ) : (
                  t("home.resend_verification")
                )}
              </button>
            )}
            {resendStatus?.type === "success" && (
              <div className="whitespace-nowrap px-4 py-2 bg-amber-100/50 text-amber-800/70 text-sm font-semibold rounded-lg flex items-center gap-2 cursor-default">
                <CheckCircle2 className="w-4 h-4" />
                {t("home.resend_success")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-gray-100 pb-6 gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
              <Link to="/">
                <img
                  src="/logo.png"
                  alt="Open Timetable Scraper Logo"
                  className="h-12 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/settings"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t("home.settings")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  fetch("/api/auth/sign-out", {
                    method: "POST",
                    credentials: "include",
                  })
                    .then(() => {
                      window.location.href = "/login";
                    })
                    .catch(() => {
                      window.location.href = "/login";
                    });
                }}
                className="px-4 py-2 bg-white text-red-600 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t("home.logout")}
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-medium text-gray-800">
                {t("home.welcome", {
                  name: session.user.name || session.user.email.split("@")[0],
                })}
              </h2>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {t("home.your_timetables")}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (session?.user?.emailVerified) {
                      setIsModalOpen(true);
                    } else {
                      setIsUnverifiedModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#37B7D5] hover:bg-[#2A9CB8] transition-colors"
                >
                  {t("home.add_timetable")}
                </button>
              </div>

              {timetables.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-12 text-center border border-dashed border-gray-300">
                  <svg
                    aria-hidden="true"
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {t("home.no_timetable")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("home.no_timetable_desc")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {timetables.map((timetable) => {
                    const provider = providers.find(
                      (p) => p.id === timetable.providerId
                    );
                    const school = provider?.schools?.find(
                      // biome-ignore lint/suspicious/noExplicitAny: map
                      (s: any) => s.id === timetable.schoolId
                    );
                    return (
                      <div
                        key={timetable.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {provider?.logo && (
                              <img
                                src={provider.logo}
                                alt={provider.name}
                                className="w-8 h-8 rounded-lg object-contain bg-gray-50 p-1 border border-gray-100"
                              />
                            )}
                            <h4 className="text-base font-semibold text-gray-900">
                              {provider?.name || timetable.providerId}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {!timetable.isSyncing ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                {t("home.active")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 max-w-30">
                                <div className="size-3 flex shrink-0 animate-spin rounded-full border-2 border-solid border-blue-700 border-r-transparent mr-1.5"></div>
                                <span className="truncate">
                                  {timetable.lastSyncedAt
                                    ? t("home.syncing")
                                    : t("home.first_sync")}
                                </span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPreviewTimetable(timetable)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title={t("home.preview") || "Preview"}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteTimetable(timetable.id)
                              }
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title={t("home.delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 space-y-2">
                          {school && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">
                                {t("home.school")}
                              </span>
                              <div className="flex items-center gap-2 font-medium text-gray-700 text-right">
                                {school.logo && (
                                  <img
                                    src={school.logo}
                                    alt={school.name}
                                    className="w-4 h-4 rounded object-contain"
                                  />
                                )}
                                <span
                                  className="truncate max-w-37.5"
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
                              {timetable.syncInterval} minutes
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Footer />
      </div>

      <TimetablePreviewModal
        isOpen={!!previewTimetable}
        onClose={() => setPreviewTimetable(null)}
        courses={previewTimetable?.courses || []}
        title={
          previewTimetable
            ? `${providers.find((p) => p.id === previewTimetable.providerId)?.name || previewTimetable.providerId}`
            : ""
        }
      />

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
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
                        className="inline-flex justify-center rounded-xl px-6 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all"
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
                            onClick={() =>
                              !loading &&
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
                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl max-h-60 overflow-y-auto">
                              {/* biome-ignore lint/suspicious/noExplicitAny: map */}
                              {providers.map((p: any) => (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => {
                                    setProviderId(p.id);
                                    setIsProviderDropdownOpen(false);
                                  }}
                                  className={`flex items-center gap-3 p-3 w-full text-left cursor-pointer transition-colors ${
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
                              {/* biome-ignore lint/suspicious/noExplicitAny: school */}
                              {selectedProvider.schools.map((school: any) => (
                                <button
                                  type="button"
                                  disabled={loading}
                                  key={school.id}
                                  onClick={() => setSchoolId(school.id)}
                                  className={`flex items-center p-3 rounded-xl transition-all ${
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
                      className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all disabled:opacity-50"
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
      {isUnverifiedModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setIsUnverifiedModalOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-8 pt-8 pb-6 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t("home.unverified_modal_title")}
                </h3>
                <p className="text-sm text-gray-500 mb-8">
                  {t("home.unverified_modal_desc")}
                </p>

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

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="w-full flex items-center justify-center rounded-xl px-6 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all disabled:opacity-50"
                  >
                    {resendingEmail
                      ? t("home.resending")
                      : t("home.unverified_modal_button")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUnverifiedModalOpen(false)}
                    className="w-full flex items-center justify-center rounded-xl px-6 py-3 bg-white border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    {t("home.cancel")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Outlet />
    </div>
  );
}
