const translations: Record<string, Record<string, string>> = {
  fr: {
    "email.subjects.verification": "Vérification de votre adresse email",
    "email.subjects.verify-new-email":
      "Vérification de votre nouvelle adresse email",
    "email.subjects.reset-password": "Réinitialisation de votre mot de passe",
    "email.subjects.account-deleted": "Votre compte a été supprimé",
  },
  en: {
    "email.subjects.verification": "Verify your email address",
    "email.subjects.verify-new-email": "Verify your new email address",
    "email.subjects.reset-password": "Reset your password",
    "email.subjects.account-deleted": "Your account has been deleted",
  },
};

export function t(key: string, lang = "fr"): string {
  return translations[lang]?.[key] || translations["fr"]?.[key] || key;
}
