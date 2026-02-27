import type React from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "../lib/auth-client";

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;

    // Change language instantly in UI
    i18n.changeLanguage(newLang);

    // Sync to backend in background
    (async () => {
      try {
        await (authClient as any).updateUser({
          language: newLang,
        });
      } catch (error) {
        console.error("Failed to sync language to backend:", error);
      }
    })();
  };

  // i18n.language might be 'fr-FR' or 'en-US' depending on the detector,
  // so we extract the base language code.
  const currentLang = i18n.language?.split("-")[0] || "fr";

  return (
    <div className="flex items-center justify-center">
      <select
        value={currentLang}
        onChange={handleChange}
        className=" text-gray-700 text-sm block outline-none cursor-pointer transition-all bg-transparent"
      >
        <option value="fr">Français</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
