import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function renderEmail(
  templateName:
    | "verification"
    | "reset-password"
    | "approve-email-change"
    | "verify-new-email"
    | "delete-account"
    | "account-deleted",
  placeholders: Record<string, string>,
  lang = "fr"
): Promise<string> {
  const templateWithLang =
    lang !== "fr" ? `${templateName}.${lang}` : templateName;
  const possiblePaths = [
    path.join(__dirname, "../templates/emails", `${templateWithLang}.html`),
    path.join(__dirname, "templates/emails", `${templateWithLang}.html`),
    // Fallback aux versions françaises si la langue demandée n'existe pas
    path.join(__dirname, "../templates/emails", `${templateName}.html`),
    path.join(__dirname, "templates/emails", `${templateName}.html`),
  ];

  let templatePath = possiblePaths[0];
  let content = "";
  let loaded = false;

  for (const p of possiblePaths) {
    try {
      content = await fs.readFile(p, "utf-8");
      templatePath = p;
      loaded = true;
      break;
    } catch {
      continue;
    }
  }

  try {
    if (!loaded) {
      throw new Error(
        `Template not found in any of the search paths: ${possiblePaths.join(", ")}`
      );
    }

    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      content = content.replace(regex, value);
    }

    return content;
  } catch (error) {
    console.error(`Error loading email template ${templateName}:`, error);
    // Fallback simple si le template ne peut être chargé
    const title =
      templateName === "verification"
        ? "Vérification"
        : templateName === "reset-password"
          ? "Réinitialisation"
          : templateName === "approve-email-change"
            ? "Approuver le changement d'email"
            : templateName === "delete-account"
              ? "Confirmer la suppression du compte"
              : templateName === "account-deleted"
                ? "Compte supprimé"
                : "Vérifier votre nouvel email";

    return `
      <div>
        <h1>${title}</h1>
        <p>Bonjour ${placeholders.name || ""},</p>
        <p><a href="${placeholders.url}">Cliquez ici</a></p>
      </div>
    `;
  }
}
