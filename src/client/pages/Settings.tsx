import {
  AlertTriangle,
  AppWindow,
  CircleUserRound,
  Key,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { authClient, useSession } from "../lib/auth-client";

const appUrlSchema = z
  .string()
  .url("URL invalide")
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        if (
          url.hostname === "localhost" ||
          url.hostname === "127.0.0.1" ||
          url.hostname === "[::1]"
        )
          return true;
        const isIpV4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname);
        const isIpV6 =
          url.hostname.startsWith("[") && url.hostname.endsWith("]");
        return !isIpV4 && !isIpV6;
      } catch {
        return false;
      }
    },
    {
      message:
        "Les adresses IP ne sont pas autorisées (utilisez un nom de domaine ou localhost/127.0.0.1)",
    }
  );

const devAppSchema = z.object({
  name: z
    .string()
    .min(3, "Le nom doit contenir au moins 3 caractères")
    .max(50, "Le nom est trop long"),
  website: z.union([appUrlSchema, z.literal(""), z.undefined()]).optional(),
  icon: z
    .union([
      appUrlSchema.refine(
        (val) =>
          val.startsWith("https://") || val.startsWith("http://localhost"),
        "L'URL de l'icône doit être sécurisée (HTTPS)"
      ),
      z.literal(""),
      z.undefined(),
    ])
    .optional(),
  redirectUrls: z
    .array(appUrlSchema)
    .min(1, "Au moins une URI de redirection est requise")
    .refine((urls) => new Set(urls).size === urls.length, {
      message: "Les URIs de redirection doivent être uniques",
    }),
  developerContact: z
    .union([
      z.string().email("Adresse email invalide"),
      z.literal(""),
      z.undefined(),
    ])
    .optional(),
  tosLink: z.union([appUrlSchema, z.literal(""), z.undefined()]).optional(),
  privacyPolicyLink: z
    .union([appUrlSchema, z.literal(""), z.undefined()])
    .optional(),
});

const AVAILABLE_SCOPES_KEYS = [
  {
    id: "openid",
    labelKey: "dev_apps.scopes.openid",
    descriptionKey: "dev_apps.scopes.openid_desc",
    required: true,
  },
  {
    id: "profile",
    labelKey: "dev_apps.scopes.profile",
    descriptionKey: "dev_apps.scopes.profile_desc",
  },
  {
    id: "email",
    labelKey: "dev_apps.scopes.email",
    descriptionKey: "dev_apps.scopes.email_desc",
  },
  {
    id: "timetable",
    labelKey: "dev_apps.scopes.timetable",
    descriptionKey: "dev_apps.scopes.timetable_desc",
  },
  {
    id: "offline_access",
    labelKey: "dev_apps.scopes.offline_access",
    descriptionKey: "dev_apps.scopes.offline_access_desc",
  },
];

export default function Settings() {
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<
    "account" | "apps" | "apikeys" | "devapps"
  >("account");

  // Apps state
  // biome-ignore lint/suspicious/noExplicitAny: apps state
  const [apps, setApps] = useState<any[]>([]);
  // biome-ignore lint/suspicious/noExplicitAny: providers state
  const [providers, setProviders] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  // API Keys state
  // biome-ignore lint/suspicious/noExplicitAny: api keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  // biome-ignore lint/suspicious/noExplicitAny: timetables state
  const [timetables, setTimetables] = useState<any[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [apiKeysError, setApiKeysError] = useState("");
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showDeleteKeyModal, setShowDeleteKeyModal] = useState<string | null>(
    null
  );
  const [showKeyDisplayModal, setShowKeyDisplayModal] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: new key data state
  const [newKeyData, setNewKeyData] = useState<any>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Form state for API key creation
  const [keyName, setKeyName] = useState("");
  const [keyExpiration, setKeyExpiration] = useState<number>(
    60 * 60 * 24 * 365
  ); // 1 year
  const [selectedTimetables, setSelectedTimetables] = useState<string[]>([]);

  // Developer Apps state
  const [devApps, setDevApps] = useState<any[]>([]);
  const [loadingDevApps, setLoadingDevApps] = useState(false);
  const [devAppsError, setDevAppsError] = useState("");
  const [showCreateDevAppModal, setShowCreateDevAppModal] = useState(false);
  const [showEditDevAppModal, setShowEditDevAppModal] = useState<any>(null);
  const [showDevAppSecretModal, setShowDevAppSecretModal] = useState<{
    clientId: string;
    clientSecret: string;
    name: string;
    action: "create" | "regenerate";
  } | null>(null);
  const [showDeleteDevAppModal, setShowDeleteDevAppModal] = useState<
    string | null
  >(null);
  const [showRegenerateSecretModal, setShowRegenerateSecretModal] = useState<
    string | null
  >(null);
  const [showRevokeTokensModal, setShowRevokeTokensModal] = useState<
    string | null
  >(null);
  const [isSavingDevApp, setIsSavingDevApp] = useState(false);

  // Form state for creating/editing dev app
  const [devAppName, setDevAppName] = useState("");
  const [devAppWebsite, setDevAppWebsite] = useState("");
  const [devAppIcon, setDevAppIcon] = useState("");
  const [devAppRedirects, setDevAppRedirects] = useState<string[]>([]);
  const [devAppRedirectInput, setDevAppRedirectInput] = useState("");
  const [devAppPermissions, setDevAppPermissions] = useState<string[]>([]);
  const [devAppDeveloperContact, setDevAppDeveloperContact] = useState("");
  const [devAppTosLink, setDevAppTosLink] = useState("");
  const [devAppPrivacyPolicyLink, setDevAppPrivacyPolicyLink] = useState("");
  const [devAppFormErrors, setDevAppFormErrors] = useState<
    Record<string, string>
  >({});

  // Account state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<string | null>(null);

  const criteria = {
    length: newPassword.length >= 12,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  const fetchApps = useCallback(async () => {
    try {
      setLoadingApps(true);
      setAppsError("");
      const [appsRes, providersRes] = await Promise.all([
        fetch("/api/oauth/authorized-apps"),
        fetch("/api/providers"),
      ]);
      if (!appsRes.ok) {
        throw new Error(t("authorized_apps.fetch_error"));
      }
      const appsData = await appsRes.json();
      setApps(appsData);

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setProviders(providersData);
      }
    } catch (err) {
      setAppsError((err as Error).message);
    } finally {
      setLoadingApps(false);
    }
  }, [t]);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (err) {
      console.error("Failed to fetch providers", err);
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      setLoadingApiKeys(true);
      setApiKeysError("");
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = await res.json();
      setApiKeys(data);
    } catch (err) {
      setApiKeysError((err as Error).message);
    } finally {
      setLoadingApiKeys(false);
    }
  }, []);

  const fetchTimetables = useCallback(async () => {
    try {
      const res = await fetch("/api/timetables");
      if (!res.ok) throw new Error("Failed to fetch timetables");
      const data = await res.json();
      setTimetables(data);
    } catch (err) {
      console.error("Failed to fetch timetables", err);
    }
  }, []);

  const fetchDevApps = useCallback(async () => {
    try {
      setLoadingDevApps(true);
      setDevAppsError("");
      const res = await fetch("/api/oauth/developer/applications");
      if (!res.ok) throw new Error("Failed to fetch developer apps");
      const data = await res.json();
      setDevApps(data);
    } catch (err) {
      setDevAppsError((err as Error).message);
    } finally {
      setLoadingDevApps(false);
    }
  }, []);

  const resetDevAppForm = () => {
    setDevAppName("");
    setDevAppWebsite("");
    setDevAppIcon("");
    setDevAppRedirects([]);
    setDevAppRedirectInput("");
    setDevAppPermissions([]);
    setDevAppDeveloperContact("");
    setDevAppTosLink("");
    setDevAppPrivacyPolicyLink("");
    setDevAppFormErrors({});
  };

  const handleCreateDevApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevAppsError("");
    setDevAppFormErrors({});

    const formData = {
      name: devAppName,
      website: devAppWebsite,
      icon: devAppIcon,
      redirectUrls: devAppRedirects,
      developerContact: devAppDeveloperContact,
      tosLink: devAppTosLink,
      privacyPolicyLink: devAppPrivacyPolicyLink,
    };

    const result = devAppSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err: z.ZodIssue) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setDevAppFormErrors(fieldErrors);
      return;
    }

    setIsSavingDevApp(true);
    try {
      const res = await fetch("/api/oauth/developer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: devAppName,
          website: devAppWebsite,
          icon: devAppIcon,
          redirectUrls: devAppRedirects,
          requestedPermissions: devAppPermissions,
          developerContact: devAppDeveloperContact,
          tosLink: devAppTosLink,
          privacyPolicyLink: devAppPrivacyPolicyLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create app");

      setShowCreateDevAppModal(false);
      setShowDevAppSecretModal({
        clientId: data.application.clientId,
        clientSecret: data.application.clientSecret,
        name: data.application.name,
        action: "create",
      });
      fetchDevApps();
      resetDevAppForm();
    } catch (err) {
      setDevAppsError((err as Error).message);
    } finally {
      setIsSavingDevApp(false);
    }
  };

  const handleEditDevApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditDevAppModal) return;
    setDevAppsError("");
    setDevAppFormErrors({});

    const formData = {
      name: devAppName,
      website: devAppWebsite,
      icon: devAppIcon,
      redirectUrls: devAppRedirects,
      developerContact: devAppDeveloperContact,
      tosLink: devAppTosLink,
      privacyPolicyLink: devAppPrivacyPolicyLink,
    };

    const result = devAppSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err: z.ZodIssue) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setDevAppFormErrors(fieldErrors);
      return;
    }

    setIsSavingDevApp(true);
    try {
      const res = await fetch(
        `/api/oauth/developer/applications/${showEditDevAppModal.clientId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: devAppName,
            website: devAppWebsite,
            icon: devAppIcon,
            redirectUrls: devAppRedirects,
            requestedPermissions: devAppPermissions,
            developerContact: devAppDeveloperContact,
            tosLink: devAppTosLink,
            privacyPolicyLink: devAppPrivacyPolicyLink,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to edit app");
      }
      setShowEditDevAppModal(null);
      fetchDevApps();
      resetDevAppForm();
    } catch (err) {
      setDevAppsError((err as Error).message);
    } finally {
      setIsSavingDevApp(false);
    }
  };

  const handleRegenerateSecret = async (clientId: string) => {
    setIsSavingDevApp(true);
    setDevAppsError("");
    try {
      const res = await fetch(
        `/api/oauth/developer/applications/${clientId}/reset-secret`,
        {
          method: "POST",
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to regenerate secret");

      setShowEditDevAppModal(null);
      setShowRegenerateSecretModal(null);
      setShowDevAppSecretModal({
        clientId: clientId,
        clientSecret: data.clientSecret,
        name: showEditDevAppModal?.name || "Application",
        action: "regenerate",
      });
    } catch (err) {
      setDevAppsError((err as Error).message);
    } finally {
      setIsSavingDevApp(false);
    }
  };

  const handleRevokeTokens = async (clientId: string) => {
    setIsSavingDevApp(true);
    setDevAppsError("");
    try {
      const res = await fetch(
        `/api/oauth/developer/applications/${clientId}/revoke-all`,
        {
          method: "POST",
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to revoke tokens");

      setShowRevokeTokensModal(null);
    } catch (err) {
      setDevAppsError((err as Error).message);
    } finally {
      setIsSavingDevApp(false);
    }
  };

  const handleDeleteDevApp = async (clientId: string) => {
    setIsSavingDevApp(true);
    setDevAppsError("");
    try {
      const res = await fetch(`/api/oauth/developer/applications/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete app");
      }
      setShowDeleteDevAppModal(null);
      if (showEditDevAppModal?.clientId === clientId) {
        setShowEditDevAppModal(null);
      }
      fetchDevApps();
    } catch (err) {
      setDevAppsError((err as Error).message);
    } finally {
      setIsSavingDevApp(false);
    }
  };

  useEffect(() => {
    if (session && activeTab === "apps") {
      fetchApps();
    }
    if (session && activeTab === "apikeys") {
      fetchApiKeys();
      fetchTimetables();
      fetchProviders();
    }
    if (session && activeTab === "devapps") {
      fetchDevApps();
    }
  }, [
    session,
    activeTab,
    fetchApps,
    fetchApiKeys,
    fetchTimetables,
    fetchProviders,
    fetchDevApps,
  ]);

  const handleRevoke = async (clientId: string) => {
    try {
      setRevoking(clientId);
      setAppsError("");
      const res = await fetch(`/api/oauth/authorized-apps/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t("authorized_apps.revoke_error"));
      setApps(apps.filter((a) => a.app.clientId !== clientId));
      setShowRevokeModal(null);
    } catch (err) {
      setAppsError((err as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName || selectedTimetables.length === 0) {
      setApiKeysError(t("api_keys.error_missing_info"));
      return;
    }

    setIsCreatingKey(true);
    setApiKeysError("");

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName,
          expiresIn: keyExpiration,
          timetableIds: selectedTimetables,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create API key");
      }

      setNewKeyData(data.apiKey);
      setShowKeyDisplayModal(true);
      setShowCreateKeyModal(false);
      setKeyName("");
      setSelectedTimetables([]);
      fetchApiKeys();
    } catch (err) {
      setApiKeysError((err as Error).message);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      setApiKeysError("");
      const res = await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete API key");
      }

      fetchApiKeys();
      setShowDeleteKeyModal(null);
    } catch (err) {
      setApiKeysError((err as Error).message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError("");
    setAccountSuccess("");
    setIsUpdating(true);
    try {
      if (name !== session?.user.name) {
        const { error } = await authClient.updateUser({ name });
        if (error)
          throw new Error(
            error.message || "Erreur lors de la mise à jour du nom"
          );
      }
      if (email !== session?.user.email) {
        const { error } = await authClient.changeEmail({
          newEmail: email,
          callbackURL: "/settings",
        });
        if (error)
          throw new Error(
            error.message || "Erreur lors de la mise à jour de l'email"
          );
        setAccountSuccess(t("settings.success_email"));
      } else {
        setAccountSuccess(t("settings.success_profile"));
      }
    } catch (err) {
      setAccountError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError("");
    setAccountSuccess("");
    setIsUpdating(true);
    try {
      const { error } = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      });
      if (error)
        throw new Error(
          error.message || "Erreur lors du changement de mot de passe"
        );
      setAccountSuccess(t("settings.success_password"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setAccountError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await authClient.deleteUser();
      if (error)
        throw new Error(
          error.message || "Erreur lors de la suppression du compte"
        );
      window.location.href = "/login";
    } catch (err) {
      setAccountError((err as Error).message);
      setShowDeleteModal(false);
    }
  };

  if (isPending) {
    return null;
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <Link to="/">
            <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
          </Link>
        </div>
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          <div className="flex flex-col md:flex-row min-h-[700px] md:h-[700px]">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-6 flex flex-col shrink-0">
              <div className="mb-6 flex items-center justify-between md:block">
                <h2 className="text-xl font-bold text-gray-900">
                  {t("settings.title")}
                </h2>
                <Link
                  to="/"
                  className="text-gray-400 hover:text-gray-600 md:hidden"
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
                </Link>
              </div>
              <nav className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("account")}
                  className={`flex gap-2 items-center w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === "account"
                      ? "bg-[#37B7D5] text-white"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <CircleUserRound className="size-4" />
                  {t("settings.tab_account")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("apps")}
                  className={`flex gap-2 items-center w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === "apps"
                      ? "bg-[#37B7D5] text-white"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <AppWindow className="size-4" />
                  {t("settings.tab_apps")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("apikeys")}
                  className={`flex gap-2 items-center w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === "apikeys"
                      ? "bg-[#37B7D5] text-white"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Key className="size-4" />
                  {t("api_keys.title")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("devapps")}
                  className={`flex gap-2 items-center w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === "devapps"
                      ? "bg-[#37B7D5] text-white"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <AppWindow className="size-4" />{" "}
                  {/* Reuse AppWindow icon for now */}
                  Applications
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white px-8 pt-8 pb-8 overflow-y-auto">
              <div className="hidden md:flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {activeTab === "account"
                    ? t("settings.account_title")
                    : activeTab === "apps"
                      ? t("authorized_apps.title")
                      : activeTab === "devapps"
                        ? "Applications"
                        : t("api_keys.title")}
                </h2>
                <Link
                  to="/"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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
                </Link>
              </div>
              <div className="md:hidden mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {activeTab === "account"
                    ? t("settings.account_title")
                    : activeTab === "apps"
                      ? t("authorized_apps.title")
                      : t("api_keys.title")}
                </h2>
              </div>

              {activeTab === "account" && (
                <div>
                  {accountError && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {accountError}
                    </div>
                  )}
                  {accountSuccess && (
                    <div className="mb-6 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
                      {accountSuccess}
                    </div>
                  )}

                  <form
                    onSubmit={handleUpdateProfile}
                    className="space-y-4 mb-8"
                  >
                    <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
                      {t("settings.profile")}
                    </h3>
                    <div>
                      <label
                        htmlFor="username"
                        className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                      >
                        {t("settings.username")}
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                      >
                        {t("settings.email")}
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isUpdating}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex items-center justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all disabled:opacity-50"
                    >
                      {isUpdating
                        ? t("settings.updating")
                        : t("settings.update_profile")}
                    </button>
                  </form>

                  <form
                    onSubmit={handleChangePassword}
                    className="space-y-4 mb-8"
                  >
                    <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
                      {t("settings.password_title")}
                    </h3>
                    <div>
                      <label
                        htmlFor="current-password"
                        className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                      >
                        {t("settings.current_password")}
                      </label>
                      <input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="new-password"
                        className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
                      >
                        {t("settings.new_password")}
                      </label>
                      <input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                        disabled={isUpdating}
                      />
                    </div>

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
                              <circle
                                cx="12"
                                cy="12"
                                r="3"
                                fill="currentColor"
                              />
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
                              <circle
                                cx="12"
                                cy="12"
                                r="3"
                                fill="currentColor"
                              />
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
                              <circle
                                cx="12"
                                cy="12"
                                r="3"
                                fill="currentColor"
                              />
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
                              <circle
                                cx="12"
                                cy="12"
                                r="3"
                                fill="currentColor"
                              />
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
                              <circle
                                cx="12"
                                cy="12"
                                r="3"
                                fill="currentColor"
                              />
                            )}
                          </svg>
                          {t("settings.password_special")}
                        </li>
                      </ul>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex items-center justify-center rounded-xl px-4 py-3 bg-gray-800 text-sm font-bold text-white hover:bg-gray-900 transition-all disabled:opacity-50"
                    >
                      {isUpdating
                        ? t("settings.updating")
                        : t("settings.change_password")}
                    </button>
                  </form>

                  <div className="space-y-4 pt-6 border-t border-red-100">
                    <h3 className="text-lg font-bold text-red-600">
                      {t("settings.danger_zone")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t("settings.danger_desc")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all"
                    >
                      {t("settings.delete_account")}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "apps" && (
                <div>
                  <p className="text-sm text-gray-500 mb-6">
                    {t("authorized_apps.subtitle")}
                  </p>

                  {appsError && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {appsError}
                    </div>
                  )}

                  {loadingApps ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        {t("authorized_apps.loading_apps")}
                      </p>
                    </div>
                  ) : apps.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-12 text-center border border-dashed border-gray-300">
                      <AppWindow className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-sm font-bold text-gray-900">
                        {t("authorized_apps.no_apps")}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("authorized_apps.no_apps_desc")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {apps.map((item) => (
                        <div
                          key={item.app.clientId}
                          className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-6 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 w-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-4 mb-2">
                                {item.app.icon ? (
                                  <img
                                    src={item.app.icon}
                                    alt="App Icon"
                                    className="w-12 h-12 rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center font-bold">
                                    {item.app.name
                                      ? item.app.name.charAt(0).toUpperCase()
                                      : "?"}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <h3 className="text-base font-bold text-gray-900">
                                    {item.app.name ||
                                      t("authorized_apps.unknown_app")}
                                  </h3>
                                  {item.createdAt && (
                                    <p className="text-xs font-semibold text-gray-500 mt-1">
                                      {t("authorized_apps.authorized_at")}{" "}
                                      {new Date(
                                        item.createdAt
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setShowRevokeModal(item.app.clientId)
                              }
                              disabled={revoking === item.app.clientId}
                              className="flex items-center justify-center rounded-lg px-4 py-2 border border-gray-200 text-sm font-medium text-red-600 bg-white hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50 shrink-0"
                            >
                              {revoking === item.app.clientId
                                ? t("authorized_apps.revoking")
                                : t("authorized_apps.revoke_access")}
                            </button>
                          </div>

                          <div className="w-full">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                              {t("authorized_apps.accessible_timetables")}
                            </p>
                            <div className="flex flex-col w-full gap-4">
                              {/* biome-ignore lint/suspicious/noExplicitAny: timetable type */}
                              {item.timetables.map((timetable: any) => {
                                const provider = providers.find(
                                  // biome-ignore lint/suspicious/noExplicitAny: provider type
                                  (p: any) => p.id === timetable.providerId
                                );
                                const school = provider?.schools?.find(
                                  // biome-ignore lint/suspicious/noExplicitAny: school type
                                  (s: any) => s.id === timetable.schoolId
                                );

                                return (
                                  <div
                                    key={timetable.id}
                                    className="bg-gray-50 w-full border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                  >
                                    <div className="flex items-center gap-3 min-w-[200px]">
                                      {provider?.logo && (
                                        <img
                                          src={provider.logo}
                                          alt={provider.name}
                                          className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-gray-100"
                                        />
                                      )}
                                      <div>
                                        <h4 className="text-base font-semibold text-gray-900">
                                          {provider?.name ||
                                            timetable.providerId}
                                        </h4>
                                        {school && (
                                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                                            {school.logo && (
                                              <img
                                                src={school.logo}
                                                alt={school.name}
                                                className="w-3 h-3 rounded object-contain"
                                              />
                                            )}
                                            <span
                                              className="truncate max-w-[150px]"
                                              title={school.name}
                                            >
                                              {school.name}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-8 text-sm text-gray-500">
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-400">
                                          {t("home.sync_interval")}
                                        </span>
                                        <span className="font-medium text-gray-700">
                                          {timetable.syncInterval} min
                                        </span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-400">
                                          {t("home.last_sync")}
                                        </span>
                                        <span className="font-medium text-gray-700">
                                          {timetable.lastSyncedAt
                                            ? new Date(
                                                timetable.lastSyncedAt
                                              ).toLocaleString()
                                            : t("home.never")}
                                        </span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-400">
                                          {t("home.courses_fetched")}
                                        </span>
                                        <span className="font-medium text-gray-700">
                                          {timetable.courses?.length || 0}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {!timetable.isSyncing ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                          {t("home.active")}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                          <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-blue-700 border-r-transparent mr-1.5"></div>
                                          {timetable.lastSyncedAt
                                            ? t("home.syncing")
                                            : t("home.first_sync")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "devapps" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-gray-500">
                      {t("dev_apps.description")}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        resetDevAppForm();
                        setShowCreateDevAppModal(true);
                      }}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all"
                    >
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      {t("dev_apps.create_button")}
                    </button>
                  </div>

                  {devAppsError && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {devAppsError}
                    </div>
                  )}

                  {loadingDevApps ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        {t("dev_apps.loading")}
                      </p>
                    </div>
                  ) : devApps.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-12 text-center border border-dashed border-gray-300">
                      <AppWindow className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-sm font-bold text-gray-900">
                        {t("dev_apps.no_apps")}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("dev_apps.no_apps_desc")}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {devApps.map((app) => (
                        <div
                          key={app.clientId}
                          className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-4 mb-4">
                            {app.icon ? (
                              <img
                                src={app.icon}
                                alt="App Icon"
                                className="w-12 h-12 rounded"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center font-bold">
                                {app.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-gray-900">
                                {app.name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {t("dev_apps.created_at")}
                                {new Date(app.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditDevAppModal(app);
                              setDevAppFormErrors({});
                              setDevAppName(app.name || "");
                              setDevAppIcon(app.icon || "");
                              setDevAppWebsite(
                                app.metadataParsed?.website || ""
                              );
                              setDevAppRedirects(
                                app.redirectUrls
                                  ? app.redirectUrls
                                      .split(",")
                                      .map((r: string) => r.trim())
                                      .filter(Boolean)
                                  : []
                              );
                              setDevAppPermissions(
                                app.metadataParsed?.requestedPermissions || []
                              );
                              setDevAppDeveloperContact(
                                app.metadataParsed?.developerContact || ""
                              );
                              setDevAppTosLink(
                                app.metadataParsed?.tosLink || ""
                              );
                              setDevAppPrivacyPolicyLink(
                                app.metadataParsed?.privacyPolicyLink || ""
                              );
                            }}
                            className="w-full flex justify-center text-sm font-bold text-gray-600 border border-gray-200 rounded-xl py-2 px-4 hover:bg-gray-50 transition-colors"
                          >
                            {t("dev_apps.edit_app")}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "apikeys" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-gray-500">
                      {t("api_keys.description")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateKeyModal(true)}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all"
                    >
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      {t("api_keys.create")}
                    </button>
                  </div>

                  {apiKeysError && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
                      {apiKeysError}
                    </div>
                  )}

                  {loadingApiKeys ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        {t("authorized_apps.loading")}
                      </p>
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-12 text-center border border-dashed border-gray-300">
                      <Key className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-sm font-bold text-gray-900">
                        {t("api_keys.no_keys")}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("api_keys.no_keys_desc")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {apiKeys.map((key) => {
                        const isExpired =
                          key.expiresAt && new Date(key.expiresAt) < new Date();
                        // biome-ignore lint/suspicious/noExplicitAny: metadata type
                        let metadata = key.metadata as any;
                        if (typeof metadata === "string") {
                          try {
                            metadata = JSON.parse(metadata);
                          } catch (_e) {
                            metadata = {};
                          }
                        }
                        const allowedTimetableIds =
                          metadata?.timetableIds || [];

                        return (
                          <div
                            key={key.id}
                            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-base font-bold text-gray-900">
                                    {key.name}
                                  </h3>
                                  {isExpired ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                      {t("api_keys.expired")}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                      {t("home.active")}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-mono">
                                  <span className="bg-gray-100 px-2 py-1 rounded">
                                    {key.prefix}_••••••••••••••••
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowDeleteKeyModal(key.id)}
                                className="flex items-center justify-center rounded-lg px-3 py-2 border border-gray-200 text-sm font-medium text-red-600 bg-white hover:bg-red-50 hover:border-red-200 transition-all"
                              >
                                {t("api_keys.revoke")}
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-xs text-gray-400 block mb-1">
                                  {t("authorized_apps.authorized_at")}
                                </span>
                                <span className="font-medium text-gray-700">
                                  {new Date(key.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-400 block mb-1">
                                  {t("api_keys.expiration")}
                                </span>
                                <span className="font-medium text-gray-700">
                                  {key.expiresAt
                                    ? new Date(
                                        key.expiresAt
                                      ).toLocaleDateString()
                                    : t("home.never")}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-400 block mb-1">
                                  {t("api_keys.last_used")}
                                </span>
                                <span className="font-medium text-gray-700">
                                  {key.lastUsedAt
                                    ? new Date(
                                        key.lastUsedAt
                                      ).toLocaleDateString()
                                    : t("home.never")}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-400 block mb-1">
                                  {t("api_keys.access")}
                                </span>
                                <span className="font-medium text-gray-700">
                                  {t("api_keys.timetable_count", {
                                    count: allowedTimetableIds.length,
                                  })}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                {t("api_keys.accessible_timetables")}
                              </span>
                              <div className="flex flex-col w-full gap-4">
                                {timetables
                                  .filter((t) =>
                                    allowedTimetableIds.includes(t.id)
                                  )
                                  .map((timetable) => {
                                    const provider = providers.find(
                                      // biome-ignore lint/suspicious/noExplicitAny: provider type
                                      (p: any) => p.id === timetable.providerId
                                    );
                                    const school = provider?.schools?.find(
                                      // biome-ignore lint/suspicious/noExplicitAny: school type
                                      (s: any) => s.id === timetable.schoolId
                                    );

                                    return (
                                      <div
                                        key={timetable.id}
                                        className="bg-gray-50 w-full border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                      >
                                        <div className="flex items-center gap-3 min-w-[200px]">
                                          {provider?.logo && (
                                            <img
                                              src={provider.logo}
                                              alt={provider.name}
                                              className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-gray-100"
                                            />
                                          )}
                                          <div>
                                            <h4 className="text-base font-semibold text-gray-900">
                                              {provider?.name ||
                                                timetable.providerId}
                                            </h4>
                                            {school && (
                                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                                                {school.logo && (
                                                  <img
                                                    src={school.logo}
                                                    alt={school.name}
                                                    className="w-3 h-3 rounded object-contain"
                                                  />
                                                )}
                                                <span
                                                  className="truncate max-w-[150px]"
                                                  title={school.name}
                                                >
                                                  {school.name}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-8 text-sm text-gray-500">
                                          <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">
                                              {t("home.sync_interval")}
                                            </span>
                                            <span className="font-medium text-gray-700">
                                              {timetable.syncInterval} min
                                            </span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">
                                              {t("home.last_sync")}
                                            </span>
                                            <span className="font-medium text-gray-700">
                                              {timetable.lastSyncedAt
                                                ? new Date(
                                                    timetable.lastSyncedAt
                                                  ).toLocaleString()
                                                : t("home.never")}
                                            </span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-xs text-gray-400">
                                              {t("home.courses_fetched")}
                                            </span>
                                            <span className="font-medium text-gray-700">
                                              {timetable.courses?.length || 0}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {!timetable.isSyncing ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                              {t("home.active")}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                              <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-blue-700 border-r-transparent mr-1.5"></div>
                                              {timetable.lastSyncedAt
                                                ? t("home.syncing")
                                                : t("home.first_sync")}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowCreateKeyModal(false)}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form
                onSubmit={handleCreateApiKey}
                className="bg-white px-8 pt-8 pb-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {t("api_keys.create")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateKeyModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
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
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4 mb-6">
                  {apiKeysError && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {apiKeysError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="keyName"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      {t("api_keys.key_name")}
                    </label>
                    <input
                      id="keyName"
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. Mobile App"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="keyExpiration"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      {t("api_keys.expiration")}
                    </label>
                    <div className="relative">
                      <select
                        id="keyExpiration"
                        value={keyExpiration}
                        onChange={(e) =>
                          setKeyExpiration(Number(e.target.value))
                        }
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#37B7D5] focus:border-[#37B7D5] sm:text-sm outline-none transition-all"
                      >
                        <option value={60 * 60 * 24 * 30}>
                          {t("api_keys.days", { count: 30 })}
                        </option>
                        <option value={60 * 60 * 24 * 90}>
                          {t("api_keys.days", { count: 90 })}
                        </option>
                        <option value={60 * 60 * 24 * 180}>
                          {t("api_keys.months", { count: 6 })}
                        </option>
                        <option value={60 * 60 * 24 * 365}>
                          {t("api_keys.years", { count: 1, s: "" })}
                        </option>
                        <option value={60 * 60 * 24 * 365 * 2}>
                          {t("api_keys.years", { count: 2, s: "s" })}
                        </option>
                      </select>
                    </div>
                  </div>
                  <fieldset>
                    <legend className="block text-sm font-bold text-gray-700 mb-2">
                      {t("api_keys.select_timetables")}
                    </legend>
                    <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-4">
                      {timetables.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No timetables available
                        </p>
                      ) : (
                        timetables.map((timetable) => {
                          const provider = providers.find(
                            // biome-ignore lint/suspicious/noExplicitAny: provider type
                            (p: any) => p.id === timetable.providerId
                          );
                          const school = provider?.schools?.find(
                            // biome-ignore lint/suspicious/noExplicitAny: school type
                            (s: any) => s.id === timetable.schoolId
                          );
                          return (
                            <label
                              key={timetable.id}
                              className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:border-[#37B7D5] transition-colors"
                            >
                              <div className="pt-1">
                                <input
                                  type="checkbox"
                                  checked={selectedTimetables.includes(
                                    timetable.id
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTimetables([
                                        ...selectedTimetables,
                                        timetable.id,
                                      ]);
                                    } else {
                                      setSelectedTimetables(
                                        selectedTimetables.filter(
                                          (id) => id !== timetable.id
                                        )
                                      );
                                    }
                                  }}
                                  className="h-5 w-5 text-[#37B7D5] border-gray-300 rounded focus:ring-[#37B7D5]"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
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
                        })
                      )}
                    </div>
                  </fieldset>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateKeyModal(false)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    {t("settings.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingKey}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-[#37B7D5] text-sm font-bold text-white hover:bg-[#2A9CB8] transition-all disabled:opacity-50"
                  >
                    {isCreatingKey
                      ? t("settings.updating")
                      : t("api_keys.create")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* API Key Display Modal (shown only once after creation) */}
      {showKeyDisplayModal && newKeyData && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-8 py-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {t("api_keys.created_success")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("api_keys.copy_warning")}
                </p>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5 text-red-600 mt-0.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-red-800 mb-1">
                        {t("api_keys.security_notice")}
                      </p>
                      <p className="text-sm text-red-700">
                        {t("api_keys.security_notice_desc")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="apiKeyDisplay"
                    className="block text-sm font-bold text-gray-700 mb-2"
                  >
                    {t("api_keys.your_api_key")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="apiKeyDisplay"
                      type="text"
                      value={newKeyData.key}
                      readOnly
                      className="flex-1 px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <p className="text-sm font-bold text-blue-900 mb-2">
                    {t("api_keys.usage_example")}
                  </p>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                    {`curl -H "x-api-key: ${newKeyData.key}" ${window.location.origin}/api/v1/timetables`}
                  </pre>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowKeyDisplayModal(false);
                    setNewKeyData(null);
                  }}
                  className="w-full flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                >
                  {t("api_keys.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete API Key Modal */}
      {showDeleteKeyModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowDeleteKeyModal(null)}
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
              <div className="bg-white px-8 pt-8 pb-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {t("api_keys.revoke")}
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  {t("api_keys.revoke_confirm")}
                </p>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteKeyModal(null)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    {t("settings.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteApiKey(showDeleteKeyModal)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all"
                  >
                    {t("api_keys.revoke")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dev App Modals Placeholder */}
      {(showCreateDevAppModal || showEditDevAppModal) && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => {
                setShowCreateDevAppModal(false);
                setShowEditDevAppModal(null);
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
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
              <div className="bg-white px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {showCreateDevAppModal
                      ? t("dev_apps.modal.create_title")
                      : t("dev_apps.modal.edit_title")}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateDevAppModal(false);
                      setShowEditDevAppModal(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
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

                <form
                  onSubmit={
                    showCreateDevAppModal
                      ? handleCreateDevApp
                      : handleEditDevApp
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {showEditDevAppModal && (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                              {t("dev_apps.modal.app_id")}
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={showEditDevAppModal.id}
                              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl sm:text-sm text-gray-500 font-mono outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                              {t("dev_apps.modal.client_id")}
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={showEditDevAppModal.clientId}
                              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl sm:text-sm text-gray-500 font-mono outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("dev_apps.modal.name_label")}
                        </label>
                        <input
                          type="text"
                          required
                          value={devAppName}
                          onChange={(e) => setDevAppName(e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-50 border ${devAppFormErrors.name ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#37B7D5]"} rounded-xl focus:ring-2 focus:border-transparent sm:text-sm outline-none transition-all`}
                          placeholder={t("dev_apps.modal.name_placeholder")}
                        />
                        {devAppFormErrors.name && (
                          <p className="mt-1.5 text-xs text-red-500 font-bold">
                            {devAppFormErrors.name}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-gray-400">
                          {t("dev_apps.modal.name_helper")}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("dev_apps.modal.website_label")}
                        </label>
                        <input
                          type="url"
                          value={devAppWebsite}
                          onChange={(e) => setDevAppWebsite(e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-50 border ${devAppFormErrors.website ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#37B7D5]"} rounded-xl focus:ring-2 focus:border-transparent sm:text-sm outline-none transition-all`}
                          placeholder={t("dev_apps.modal.website_placeholder")}
                        />
                        {devAppFormErrors.website && (
                          <p className="mt-1.5 text-xs text-red-500 font-bold">
                            {devAppFormErrors.website}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-gray-400">
                          {t("dev_apps.modal.website_helper")}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("dev_apps.modal.icon_label")}
                        </label>
                        <input
                          type="url"
                          value={devAppIcon}
                          onChange={(e) => setDevAppIcon(e.target.value)}
                          className={`w-full px-4 py-3 bg-gray-50 border ${devAppFormErrors.icon ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#37B7D5]"} rounded-xl focus:ring-2 focus:border-transparent sm:text-sm outline-none transition-all`}
                          placeholder={t("dev_apps.modal.icon_placeholder")}
                        />
                        {devAppFormErrors.icon && (
                          <p className="mt-1.5 text-xs text-red-500 font-bold">
                            {devAppFormErrors.icon}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-gray-400">
                          {t("dev_apps.modal.icon_helper")}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("dev_apps.modal.contact_label")}
                        </label>
                        <input
                          type="email"
                          value={devAppDeveloperContact}
                          onChange={(e) =>
                            setDevAppDeveloperContact(e.target.value)
                          }
                          className={`w-full px-4 py-3 bg-gray-50 border ${devAppFormErrors.developerContact ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#37B7D5]"} rounded-xl focus:ring-2 focus:border-transparent sm:text-sm outline-none transition-all`}
                          placeholder={t("dev_apps.modal.contact_placeholder")}
                        />
                        {devAppFormErrors.developerContact && (
                          <p className="mt-1.5 text-xs text-red-500 font-bold">
                            {devAppFormErrors.developerContact}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-gray-400">
                          {t("dev_apps.modal.contact_helper")}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t("dev_apps.modal.tos_label")}
                          </label>
                          <input
                            type="url"
                            value={devAppTosLink}
                            onChange={(e) => setDevAppTosLink(e.target.value)}
                            className={`w-full px-4 py-3 bg-gray-50 border ${devAppFormErrors.tosLink ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#37B7D5]"} rounded-xl focus:ring-2 focus:border-transparent sm:text-sm outline-none transition-all`}
                            placeholder={t("dev_apps.modal.tos_placeholder")}
                          />
                          {devAppFormErrors.tosLink && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                              {devAppFormErrors.tosLink}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-gray-400">
                            {t("dev_apps.modal.tos_helper")}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t("dev_apps.modal.privacy_label")}
                          </label>
                          <input
                            type="url"
                            value={devAppPrivacyPolicyLink}
                            onChange={(e) =>
                              setDevAppPrivacyPolicyLink(e.target.value)
                            }
                            className={`w-full px-4 py-3 bg-gray-50 border ${devAppFormErrors.privacyPolicyLink ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#37B7D5]"} rounded-xl focus:ring-2 focus:border-transparent sm:text-sm outline-none transition-all`}
                            placeholder={t("dev_apps.modal.privacy_placeholder")}
                          />
                          {devAppFormErrors.privacyPolicyLink && (
                            <p className="mt-1.5 text-xs text-red-500 font-bold">
                              {devAppFormErrors.privacyPolicyLink}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-gray-400">
                            {t("dev_apps.modal.privacy_helper")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("dev_apps.modal.redirects_label")}
                        </label>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="url"
                            value={devAppRedirectInput}
                            onChange={(e) =>
                              setDevAppRedirectInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = devAppRedirectInput.trim();
                                if (val) {
                                  const parseResult = appUrlSchema.safeParse(val);
                                  if (!parseResult.success) {
                                    setDevAppFormErrors({ ...devAppFormErrors, redirectUrls: parseResult.error.issues[0].message });
                                  } else if (devAppRedirects.includes(val)) {
                                    setDevAppFormErrors({ ...devAppFormErrors, redirectUrls: t("dev_apps.modal.redirects_error_invalid") });
                                  } else {
                                    setDevAppRedirects([...devAppRedirects, val]);
                                    setDevAppRedirectInput("");
                                    const nextErrors = { ...devAppFormErrors };
                                    delete nextErrors.redirectUrls;
                                    setDevAppFormErrors(nextErrors);
                                  }
                                }
                              }
                            }}
                            className={`flex-1 px-4 py-3 bg-gray-50 border ${devAppFormErrors.redirectUrls ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#37B7D5]"} rounded-xl focus:ring-2 focus:border-transparent sm:text-sm outline-none transition-all`}
                            placeholder={t("dev_apps.modal.redirects_placeholder")}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = devAppRedirectInput.trim();
                              if (val) {
                                const parseResult = appUrlSchema.safeParse(val);
                                if (!parseResult.success) {
                                  setDevAppFormErrors({ ...devAppFormErrors, redirectUrls: parseResult.error.issues[0].message });
                                } else if (devAppRedirects.includes(val)) {
                                  setDevAppFormErrors({ ...devAppFormErrors, redirectUrls: t("dev_apps.modal.redirects_error_invalid") });
                                } else {
                                  setDevAppRedirects([...devAppRedirects, val]);
                                  setDevAppRedirectInput("");
                                  const nextErrors = { ...devAppFormErrors };
                                  delete nextErrors.redirectUrls;
                                  setDevAppFormErrors(nextErrors);
                                }
                              }
                            }}
                            className="px-4 py-3 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {t("dev_apps.modal.redirects_add")}
                          </button>
                        </div>
                        {devAppFormErrors.redirectUrls && (
                          <p className="mb-2 text-xs text-red-500 font-bold">
                            {devAppFormErrors.redirectUrls}
                          </p>
                        )}
                        <div className="space-y-2 mb-1.5 max-h-40 overflow-y-auto pr-1">
                          {devAppRedirects.map((uri, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 group"
                            >
                              <span className="text-sm text-gray-700 truncate font-mono">
                                {uri}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setDevAppRedirects(
                                    devAppRedirects.filter((_, i) => i !== idx)
                                  )
                                }
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {devAppRedirects.length === 0 && (
                            <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-xl">
                              <p className="text-sm text-gray-400">
                                {t("dev_apps.modal.redirects_none")}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {t("dev_apps.modal.redirects_helper")}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("dev_apps.modal.permissions_label")}
                        </label>
                        <p className="mb-3 text-xs text-gray-400">
                          {t("dev_apps.modal.permissions_helper")}
                        </p>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                          {AVAILABLE_SCOPES_KEYS.map((scope) => (
                            <label
                              key={scope.id}
                              className={`flex items-start gap-4 p-4 border rounded-xl transition-all shadow-sm ${
                                scope.required
                                  ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-80"
                                  : "border-gray-200 bg-gray-50 cursor-pointer hover:border-[#37B7D5] hover:bg-white"
                              }`}
                            >
                              <div className="pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={scope.required || devAppPermissions.includes(scope.id)}
                                  disabled={scope.required}
                                  onChange={(e) => {
                                    if (scope.required) return;
                                    if (e.target.checked) {
                                      setDevAppPermissions([
                                        ...devAppPermissions,
                                        scope.id,
                                      ]);
                                    } else {
                                      setDevAppPermissions(
                                        devAppPermissions.filter(
                                          (p) => p !== scope.id
                                        )
                                      );
                                    }
                                  }}
                                  className="h-5 w-5 text-[#37B7D5] border-gray-300 rounded focus:ring-[#37B7D5] focus:ring-offset-2 disabled:cursor-not-allowed"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">
                                  {t(scope.labelKey as any)}{" "}
                                  <span className="font-mono text-xs font-normal bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 ml-2">
                                    {scope.id}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {t(scope.descriptionKey as any)}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {showEditDevAppModal && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-bold text-gray-900 mb-4">
                        {t("dev_apps.modal.danger_zone_title")}
                      </h4>
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <button
                          type="button"
                          onClick={() =>
                            setShowRegenerateSecretModal(
                              showEditDevAppModal.clientId
                            )
                          }
                          className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-amber-500 text-sm font-bold text-white hover:bg-amber-600 transition-all"
                        >
                          {t("dev_apps.modal.regenerate_secret")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setShowRevokeTokensModal(
                              showEditDevAppModal.clientId
                            )
                          }
                          className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all"
                        >
                          {t("dev_apps.modal.revoke_tokens")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setShowDeleteDevAppModal(
                              showEditDevAppModal.clientId
                            )
                          }
                          className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all"
                        >
                          {t("dev_apps.modal.delete_app")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateDevAppModal(false);
                        setShowEditDevAppModal(null);
                        resetDevAppForm();
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                      {t("dev_apps.modal.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingDevApp || !devAppName.trim() || devAppRedirects.length === 0}
                      className="px-6 py-2 bg-[#37B7D5] text-white rounded-xl font-bold hover:bg-[#2A9CB8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingDevApp
                        ? t("dev_apps.modal.saving")
                        : showEditDevAppModal
                          ? t("dev_apps.modal.save")
                          : t("dev_apps.modal.create")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dev App Secret Display Modal */}
      {showDevAppSecretModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowDevAppSecretModal(null)}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-8 py-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {showDevAppSecretModal.action === "create"
                    ? t("dev_apps.secret_modal.created_success")
                    : t("dev_apps.secret_modal.regenerate_success")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("dev_apps.secret_modal.secret_warning")}
                </p>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5 text-red-600 mt-0.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-bold text-red-800 mb-1">
                        {t("dev_apps.secret_modal.security_notice")}
                      </p>
                      <p className="text-sm text-red-700">
                        {t("dev_apps.secret_modal.security_notice_desc")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {t("dev_apps.secret_modal.client_id")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={showDevAppSecretModal.clientId}
                      readOnly
                      className="flex-1 px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {t("dev_apps.secret_modal.your_client_secret")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={showDevAppSecretModal.clientSecret}
                      readOnly
                      className="flex-1 px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDevAppSecretModal(null)}
                  className="w-full flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                >
                  {t("dev_apps.modal.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Secret Modal */}
      {showRegenerateSecretModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowRegenerateSecretModal(null)}
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
              <div className="bg-white px-8 py-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-amber-500"
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
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {t("dev_apps.regenerate_modal.title")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("dev_apps.regenerate_modal.confirm")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegenerateSecretModal(null)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    {t("dev_apps.modal.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingDevApp}
                    onClick={() => handleRegenerateSecret(showRegenerateSecretModal)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-amber-500 text-sm font-bold text-white hover:bg-amber-600 transition-all disabled:opacity-50"
                  >
                    {isSavingDevApp ? t("dev_apps.regenerate_modal.regenerating") : t("dev_apps.regenerate_modal.button")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dev App Modal */}
      {showDeleteDevAppModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowDeleteDevAppModal(null)}
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
              <div className="bg-white px-8 py-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-red-600"
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
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {t("dev_apps.delete_modal.title")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("dev_apps.delete_modal.confirm")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteDevAppModal(null)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    {t("dev_apps.modal.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingDevApp}
                    onClick={() => handleDeleteDevApp(showDeleteDevAppModal)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isSavingDevApp
                      ? t("dev_apps.delete_modal.deleting")
                      : t("dev_apps.delete_modal.button")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Tokens Modal */}
      {showRevokeTokensModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowRevokeTokensModal(null)}
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
              <div className="bg-white px-8 py-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-red-600"
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
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {t("dev_apps.revoke_modal.title")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("dev_apps.revoke_modal.confirm")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRevokeTokensModal(null)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    {t("dev_apps.modal.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingDevApp}
                    onClick={() => handleRevokeTokens(showRevokeTokensModal)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all disabled:opacity-50"
                  >
                    {isSavingDevApp
                      ? t("dev_apps.revoke_modal.revoking")
                      : t("dev_apps.revoke_modal.button")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowDeleteModal(false)}
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
              <div className="bg-white px-8 pt-8 pb-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-red-600"
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
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {t("settings.delete_account")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("settings.delete_confirm")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    {t("settings.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all"
                  >
                    {t("settings.delete")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Access Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowRevokeModal(null)}
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
              <div className="bg-white px-8 pt-8 pb-8">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-red-600"
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
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {t("authorized_apps.revoke_access")}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("authorized_apps.revoke_confirm")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRevokeModal(null)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    {t("settings.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(showRevokeModal)}
                    className="flex-1 flex items-center justify-center rounded-xl px-4 py-3 bg-red-600 text-sm font-bold text-white hover:bg-red-700 transition-all"
                  >
                    {t("settings.revoke")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
