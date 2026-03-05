import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

const resources = {
  fr: {
    translation: {
      login: {
        title: "Connectez-vous",
        email: "Adresse email",
        password: "Mot de passe",
        forgot_password: "Mot de passe oublié ?",
        submit: "Se connecter",
        loading: "Chargement...",
        no_account: "Pas encore de compte ? S'inscrire",
        error_invalid: "Email ou mot de passe incorrect.",
        error_unexpected: "Une erreur inattendue est survenue.",
      },
      home: {
        loading: "Chargement...",
        title:
          "Collectez, centralisez et synchronisez vos emplois du temps scolaire.",
        subtitle: "L'agrégateur d'emplois du temps nouvelle génération.",
        register: "S'inscrire",
        login: "Se connecter",
        authorized_apps: "Applications Autorisées",
        settings: "Paramètres",
        logout: "Se déconnecter",
        welcome: "Bienvenue, {{name}} ! 👋",
        your_timetables: "Vos emplois du temps",
        add_timetable: "+ Ajouter un emploi du temps",
        no_timetable: "Aucun emploi du temps",
        no_timetable_desc:
          "Commencez par configurer vos identifiants scolaires pour récupérer votre emploi du temps.",
        active: "Actif",
        syncing: "Synchronisation en cours",
        first_sync: "Première synchronisation",
        delete: "Supprimer",
        school: "Établissement",
        sync_interval: "Intervalle de sync",
        last_sync: "Dernière sync",
        never: "Jamais",
        courses_fetched: "Cours récupérés",
        delete_confirm:
          "Êtes-vous sûr de vouloir supprimer cet emploi du temps ? Cela révoquera également tous les accès tiers.",
        delete_error: "Erreur lors de la suppression",
        network_error: "Erreur réseau",
        select_school: "Veuillez sélectionner une école.",
        add_timetable_title: "Ajouter un emploi du temps",
        add_timetable_submit: "Ajouter l'emploi du temps",
        cancel: "Annuler",
        provider: "Fournisseur",
        school_label: "Établissement",
        identifier: "Identifiant",
        password: "Mot de passe",
        sync_interval_label: "Intervalle de synchronisation (minutes)",
        sync_failed: "Synchronisation échouée",
        sync_success: "Synchronisation réussie !",
        sync_no_courses:
          "Nous n'avons récupéré aucun cours depuis votre établissement.",
        sync_courses_fetched:
          "Nous avons récupéré {{count}} cours depuis votre établissement.",
        finish: "Terminer",
        platform_provider: "Platforme / Provider",
        select_platform: "Sélectionner une plateforme",
        syncing_in_progress: "Synchronisation en cours...",
        verify_email_banner:
          "Votre compte n'est pas encore vérifié. Certaines fonctionnalités peuvent être limitées.",
        resend_verification: "Renvoyer l'email de vérification",
        resending: "Envoi en cours...",
        resend_success: "Email de vérification envoyé !",
        resend_error: "Erreur lors de l'envoi.",
        unverified_modal_title: "Compte non vérifié",
        unverified_modal_desc:
          "Vous devez vérifier votre adresse email avant de pouvoir ajouter un emploi du temps.",
        unverified_modal_button: "Vérifier mon email",
        edit_interval_title: "Modifier l'intervalle",
        edit_interval_desc:
          "L'intervalle sera mis à jour et la tâche de synchronisation sera reprogrammée.",
        save: "Enregistrer",
        add: "Ajouter",
      },
      authorized_apps: {
        fetch_error: "Erreur lors de la récupération des applications",
        revoke_confirm:
          "Êtes-vous sûr de vouloir révoquer l'accès à cette application ? Elle ne pourra plus accéder à vos emplois du temps.",
        revoke_error: "Erreur lors de la révocation de l'accès",
        loading: "Chargement...",
        back_to_dashboard: "← Retour au tableau de bord",
        title: "Applications Autorisées",
        subtitle:
          "Gérez les applications tierces qui ont accès à vos emplois du temps.",
        loading_apps: "Chargement des applications...",
        no_apps: "Aucune application",
        no_apps_desc:
          "Vous n'avez autorisé aucune application tierce à accéder à vos données.",
        unknown_app: "Application Inconnue",
        accessible_timetables: "Emplois du temps accessibles :",
        authorized_at: "Autorisé le :",
        revoking: "Révocation...",
        revoke_access: "Révoquer l'accès",
      },
      api_keys: {
        title: "Clés API",
        description:
          "Créez et gérez des clés API pour accéder à vos emplois du temps par programmation",
        create: "Créer une clé API",
        no_keys: "Aucune clé API",
        no_keys_desc: "Commencez par créer votre première clé API",
        last_used: "Dernière utilisation",
        access: "Accès",
        timetable_count_one: "{{count}} emploi du temps",
        timetable_count_other: "{{count}} emplois du temps",
        expired: "Expirée",
        accessible_timetables: "Emplois du temps accessibles",
        key_name: "Nom de la clé",
        expiration: "Expiration",
        select_timetables: "Sélectionner les emplois du temps (au moins un)",
        created_success: "Clé API créée avec succès",
        copy_warning:
          "Assurez-vous de copier votre clé API maintenant. Vous ne pourrez plus la voir !",
        usage_example: "Exemple d'utilisation",
        close: "Fermer",
        revoke: "Révoquer",
        revoke_confirm:
          "Êtes-vous sûr de vouloir révoquer cette clé API ? Cette action est irréversible.",
        days: "{{count}} jours",
        months: "{{count}} mois",
        years: "{{count}} an{{s}}",
        error_missing_info:
          "Veuillez fournir un nom et sélectionner au moins un emploi du temps",
        security_notice: "Avis de sécurité important",
        security_notice_desc:
          "C'est la seule fois que vous verrez cette clé API. Stockez-la en lieu sûr !",
        your_api_key: "Votre clé API",
      },
      settings: {
        title: "Paramètres",
        back: "Retour",
        tab_account: "Compte",
        tab_apps: "Autorisations d'app",
        account_title: "Mon Compte",
        profile: "Profil",
        username: "Nom d'utilisateur",
        email: "Email",
        update_profile: "Mettre à jour le profil",
        updating: "Mise à jour...",
        password_title: "Mot de passe",
        current_password: "Mot de passe actuel",
        new_password: "Nouveau mot de passe",
        change_password: "Changer le mot de passe",
        danger_zone: "Zone de danger",
        danger_desc:
          "Une fois que vous supprimez votre compte, il n'y a pas de retour en arrière. Soyez certain.",
        delete_account: "Supprimer le compte",
        delete_confirm:
          "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
        success_profile: "Profil mis à jour avec succès.",
        success_email:
          "Un email de vérification a été envoyé à votre nouvelle adresse.",
        success_password: "Mot de passe mis à jour avec succès.",
        password_requirements: "Le mot de passe doit contenir :",
        password_min_length: "Au moins 12 caractères",
        password_uppercase: "Une majuscule",
        password_lowercase: "Une minuscule",
        password_number: "Un chiffre",
        password_special: "Un caractère spécial",
        cancel: "Annuler",
        delete: "Supprimer",
        revoke: "Révoquer",
        tab_devapps: "Applications",
      },
      dev_apps: {
        tab_title: "Applications",
        description:
          "Gérez vos applications OAuth (Developer Apps) enregistrées sur le serveur.",
        create_button: "Créer une App",
        loading: "Chargement de vos applications...",
        no_apps: "Aucune application",
        no_apps_desc: "Vous n'avez pas encore créé d'application OAuth.",
        create_app: "Créer une Application",
        edit_app: "Éditer l'Application",
        created_at: "Créée le ",

        modal: {
          create_title: "Créer une Application",
          edit_title: "Éditer l'Application",
          app_id: "Application ID",
          client_id: "Client ID",
          name_label: "Nom de l'application *",
          name_placeholder: "Ex: Mon Client Extra",
          name_helper:
            "Le nom public de votre application, visible par vos utilisateurs.",
          website_label: "URL du site web racine (Optionnel)",
          website_placeholder: "https://example.com",
          website_helper:
            "Permet aux utilisateurs de retourner sur votre site web depuis la page d'autorisation.",
          icon_label: "URL de logo (Optionnel)",
          icon_placeholder: "https://example.com/logo.png",
          icon_helper:
            "Le logo affiché sur la page de consentement (doit être une image via HTTPS).",
          contact_label: "Contact développeur (Optionnel)",
          contact_placeholder: "dev@example.com",
          contact_helper:
            "Email utilisé pour vous contacter en cas de problème technique avec l'application.",
          tos_label: "Conditions d'utilisation (Optionnel)",
          tos_placeholder: "https://example.com/tos",
          tos_helper:
            "Lien vers les conditions d'utilisation de l'application.",
          privacy_label: "Politique de confidentialité (Optionnel)",
          privacy_placeholder: "https://example.com/privacy",
          privacy_helper:
            "Lien vers la politique de confidentialité de l'application.",
          redirects_label: "URIs de redirection autorisées *",
          redirects_placeholder: "https://app.example.com/callback",
          redirects_add: "Ajouter",
          redirects_none: "Aucune URI ajoutée pour le moment.",
          redirects_helper:
            "Ces URIs seront utilisées pour rediriger l'utilisateur après l'autorisation de votre application. Elles doivent être exactes. Adresses IP interdites.",
          permissions_label: "Permissions",
          permissions_helper:
            "Permissions accordées à l'application qu'elle peut demander à l'utilisateur.",
          danger_zone_title: "Zone de danger",
          regenerate_secret: "Regénérer le Secret",
          revoke_tokens: "Révoquer les accès actuels",
          delete_app: "Supprimer l'Application",
          cancel: "Annuler",
          save: "Enregistrer",
          saving: "Enregistrement...",
          create: "Créer",
          close: "Fermer",
          redirects_error_invalid: "Cette URI est déjà ajoutée.",
        },

        secret_modal: {
          created_success: "Application créée avec succès",
          regenerate_success: "Secret regénéré avec succès",
          secret_warning:
            "Assurez-vous de copier votre Client Secret maintenant. Vous ne pourrez plus le voir !",
          security_notice: "Avis de sécurité important",
          security_notice_desc:
            "C'est la seule fois que vous verrez ce Client Secret. Stockez-le en lieu sûr !",
          client_id: "Client ID",
          your_client_secret: "Votre Client Secret",
        },

        regenerate_modal: {
          title: "Regénérer le secret",
          confirm:
            "Attention : L'ancien secret sera invalidé immédiatement. Êtes-vous sûr de vouloir continuer ?",
          regenerating: "Regénération...",
          button: "Regénérer le secret",
        },

        delete_modal: {
          title: "Supprimer l'application",
          confirm:
            "Êtes-vous sûr ? Cette action est irréversible et détruira l'accès aux utilisateurs connectés via cette application.",
          deleting: "Suppression...",
          button: "Supprimer définitivement",
        },

        revoke_modal: {
          title: "Révoquer tous les accès",
          confirm:
            "Tous les utilisateurs de cette application devront obligatoirement passer par l'étape d'authentification avant de pouvoir l'utiliser à nouveau. Cette action est irréversible.",
          revoking: "Révocation...",
          button: "Révoquer",
        },

        scopes: {
          openid: "OpenID (Requis)",
          openid_desc:
            "Permet d'authentifier l'utilisateur via OpenID Connect.",
          profile: "Profil public",
          profile_desc:
            "Permet à l'application d'accéder aux informations de base de l'utilisateur (nom, avatar).",
          email: "Adresse e-mail",
          email_desc:
            "Permet à l'application d'accéder à l'adresse e-mail de l'utilisateur.",
          timetable: "Lecture de l'emploi du temps",
          timetable_desc:
            "Permet à l'application de lire l'emploi du temps et les détails des cours de l'utilisateur.",
          offline_access: "Accès hors ligne",
          offline_access_desc:
            "Permet à l'application de maintenir l'accès même lorsque l'utilisateur est inactif.",
        },
      },
      consent: {
        loading: "Chargement...",
        internal_app: "Application tierce interne",
        external_app: "Application tierce externe",
        app_information: "Informations de l'application",
        title: "Autoriser l'application",
        subtitle: "L'application souhaite accéder à votre compte.",
        allow: "Autoriser",
        deny: "Refuser",
        scopes: "Autorisations demandées :",
        timetable_scope: "Accès à vos emplois du temps",
        profile_scope: "Accès à votre profil",
        email_scope: "Accès à votre adresse email",
        openid_scope: "Authentification",
        select_timetables: "Sélectionnez les emplois du temps à partager :",
        timetables_to_share: "Emplois du temps à partager",
        no_timetables: "Vous n'avez aucun emploi du temps configuré.",
        add_timetable: "Ajouter un emploi du temps",
        error: "Une erreur est survenue",
        success: "Autorisation accordée avec succès",
        authorize_title_start: "Autoriser",
        authorize_title_end: "à accéder à votre compte",
        authorizing: "Autorisation...",
        authorize_button: "Autoriser {{app}}",
        default_app_name: "l'application",
        cancel: "Annuler",
        app_can: "Cette application pourra :",
        desc_openid: "Vérifier votre identité",
        desc_profile: "Accéder à votre nom",
        desc_email: "Accéder à votre adresse email",
        desc_timetable: "Accéder à vos emplois du temps en lecture seule",
        offline_access_scope: "Accès prolongé",
        desc_offline_access:
          "Cette application pourra accéder à vos données à tout moment, même lorsque vous n'êtes pas connecté.",
        connected_via: "Connecté via Open Timetable Scraper",
        redirect_warning_start: "En autorisant, vous serez redirigé vers",
        redirect_school: "cet établissement",
        redirect_app: "l'application tierce",
        add_another_timetable: "Ajouter un autre emploi du temps",
        unverified_title: "Vérification requise",
        unverified_desc:
          "Vous devez vérifier votre compte avant de pouvoir autoriser une application tierce à accéder à vos données.",
        unverified_button: "Valider mon compte",
        invalid_code_title: "Code invalide ou expiré",
        invalid_code_desc:
          "Le code d'autorisation demandé n'existe pas ou a expiré. Veuillez relancer le processus de connexion depuis l'application.",
        app_website: "Site Web de l'application",
        developer_contact: "Contact développeur",
        tos: "Conditions d'utilisation",
        privacy_policy: "Politique de confidentialité",
        security_warning_title: "Restez vigilant",
        security_warning_desc:
          "En acceptant, vous permettez à {{app}} d'accéder à votre compte Open Timetable Scraper. Assurez-vous que cette application est de confiance et qu'elle n'usurpe pas l'identité d'un service légitime.",
        unauthorized_scopes_title: "Permissions non autorisées",
        unauthorized_scopes_desc:
          "Certaines permissions demandées par l'application ne sont pas autorisées à être données à l'utilisateur. Veuillez contacter le développeur de l'application pour lui demander de corriger ce problème.",
      },
      common: {
        language: "Langue",
      },
      preview_modal: {
        title: "Prévisualisation de l'emploi du temps",
        week_of: "Semaine du {{start}} au {{end}}",
        today: "Aujourd'hui",
        week: "Semaine",
        courses_fetched: "cours récupérés",
      },
      course_details: {
        title: "Détails du cours",
        subject: "Matière",
        time: "Horaire",
        location: "Salle",
        teacher: "Professeur",
        close: "Fermer",
      },
      landing: {
        hero: {
          title:
            "L'agrégateur d'emploi du temps Open-Source qui <1>centralise vos cours à la source</1>",
          subtitle:
            "Un outil conçu pour <1>automatiser la récupération</1> de vos emplois du temps à la source. Centralisez vos cours via un collecteur performant et connectez votre planning à <3>n'importe quelle application</3> grâce à une API.",
          cta_start: "Commencer",
          cta_docs: "Documentation",
        },
        features: {
          title: "Conçu pour être utile.",
          subtitle:
            "Conçu pour la fiabilité et la performance, OTS Server gère la complexité des différentes sources de données pour vous.",
          auto_collect: {
            title: "Une collecte automatique",
            desc: "Profitez d'un emploi du temps toujours à jour. Le système se synchronise en arrière-plan selon l'intervalle de votre choix, éliminant toute intervention manuelle. Configurez une fois, oubliez le reste.",
          },
          open_source: {
            title: "Un projet Open Source, transparent et sécurisé",
            desc: "Un code 100% auditable pour une confiance totale. Que vous utilisiez notre instance ou la vôtre, vos identifiants sont systématiquement chiffrés avant stockage. La sécurité n'est pas une option, c'est le standard.",
          },
          multi_platform: {
            title: "Multi-Plateformes",
            desc: "Une compatibilité étendue avec les plateformes scolaires majeures. Grâce à son architecture ouverte, de nouveaux connecteurs sont ajoutés et maintenus par la communauté pour répondre à tous les besoins.",
          },
        },
        steps: {
          title: "3 étapes pour tout synchroniser.",
          step1: {
            title: "Connectez votre établissement",
            desc: "Sélectionnez votre école et renseignez vos accès. Le serveur s'occupe de valider la liaison avec votre plateforme d'emploi du temps scolaire.",
          },
          step2: {
            title: "Laissez le serveur synchroniser vos emplois du temps.",
            desc: "Le serveur se connecte périodiquement pour maintenir votre emploi du temps à jour. Plus besoin de rafraîchissement manuel, vos modifications sont détectées instantanément.",
          },
          step3: {
            title: "Exploitez vos données sans attendre",
            desc: "Connectez vos apps en un clic grâce au système d'authentification, ou utilisez l'API REST pour extraire et intégrer vos cours directement dans vos propres projets et scripts personnalisés.",
          },
        },
        deploy: {
          title:
            "Prêt à déployer votre propre instance <br /> Open Timetable Scraper ?",
          desc: "Profitez d'une architecture pensée pour l'auto-hébergement. Lancez votre infrastructure avec Docker et gérez votre service en toute autonomie.",
          cta: "Voir sur GitHub",
        },
      },
      not_found: {
        title: "Page introuvable",
        desc: "Désolé, la page que vous recherchez n'existe pas.",
        cta: "Retour à l'accueil",
      },
    },
  },
  en: {
    translation: {
      login: {
        title: "Sign In",
        email: "Email address",
        password: "Password",
        forgot_password: "Forgot password?",
        submit: "Sign In",
        loading: "Loading...",
        no_account: "Don't have an account? Sign up",
        error_invalid: "Invalid email or password.",
        error_unexpected: "An unexpected error occurred.",
      },
      home: {
        loading: "Loading...",
        title: "Open Timetable Scraper",
        subtitle:
          "Manage and synchronize your school timetable easily. Please log in to access your space.",
        register: "Sign Up",
        login: "Sign In",
        authorized_apps: "Authorized Apps",
        settings: "Settings",
        logout: "Log out",
        welcome: "Welcome, {{name}}! 👋",
        your_timetables: "Your timetables",
        add_timetable: "+ Add a timetable",
        no_timetable: "No timetable",
        no_timetable_desc:
          "Start by configuring your school credentials to fetch your timetable.",
        active: "Active",
        syncing: "Syncing",
        first_sync: "First sync",
        delete: "Delete",
        school: "School",
        sync_interval: "Sync interval",
        last_sync: "Last sync",
        never: "Never",
        courses_fetched: "Courses fetched",
        delete_confirm:
          "Are you sure you want to delete this timetable? This will also revoke all third-party access.",
        delete_error: "Error during deletion",
        network_error: "Network error",
        select_school: "Please select a school.",
        add_timetable_title: "Add a timetable",
        add_timetable_submit: "Add timetable",
        cancel: "Cancel",
        provider: "Provider",
        school_label: "School",
        identifier: "Identifier",
        password: "Password",
        sync_interval_label: "Sync interval (minutes)",
        sync_failed: "Sync failed",
        sync_success: "Sync successful!",
        sync_no_courses: "We didn't fetch any courses from your school.",
        sync_courses_fetched: "We fetched {{count}} courses from your school.",
        finish: "Finish",
        platform_provider: "Platform / Provider",
        select_platform: "Select a platform",
        syncing_in_progress: "Syncing in progress...",
        verify_email_banner:
          "Your account is not verified yet. Some features may be limited.",
        resend_verification: "Resend verification email",
        resending: "Sending...",
        resend_success: "Verification email sent!",
        resend_error: "Error sending email.",
        unverified_modal_title: "Unverified Account",
        unverified_modal_desc:
          "You must verify your email address before you can add a timetable.",
        unverified_modal_button: "Verify my email",
        edit_interval_title: "Edit interval",
        edit_interval_desc:
          "The interval will be updated and the synchronization task will be rescheduled.",
        save: "Save",
        add: "Add",
      },
      authorized_apps: {
        fetch_error: "Error fetching applications",
        revoke_confirm:
          "Are you sure you want to revoke access for this application? It will no longer be able to access your timetables.",
        revoke_error: "Error revoking access",
        loading: "Loading...",
        back_to_dashboard: "← Back to dashboard",
        title: "Authorized Apps",
        subtitle:
          "Manage third-party applications that have access to your timetables.",
        loading_apps: "Loading applications...",
        no_apps: "No applications",
        no_apps_desc:
          "You haven't authorized any third-party applications to access your data.",
        unknown_app: "Unknown Application",
        accessible_timetables: "Accessible timetables:",
        authorized_at: "Authorized on:",
        revoking: "Revoking...",
        revoke_access: "Revoke access",
      },
      api_keys: {
        title: "API Keys",
        description:
          "Create and manage API keys to access your timetables programmatically",
        create: "Create API Key",
        no_keys: "No API keys yet",
        no_keys_desc: "Get started by creating your first API key",
        last_used: "Last Used",
        access: "Access",
        timetable_count_one: "{{count}} timetable",
        timetable_count_other: "{{count}} timetables",
        expired: "Expired",
        accessible_timetables: "Accessible Timetables",
        key_name: "Key Name",
        expiration: "Expiration",
        select_timetables: "Select Timetables (at least one)",
        created_success: "API Key created successfully",
        copy_warning:
          "Make sure to copy your API key now. You won't be able to see it again!",
        usage_example: "Usage Example",
        close: "Close",
        revoke: "Revoke",
        revoke_confirm:
          "Are you sure you want to revoke this API key? This action is irreversible.",
        days: "{{count}} days",
        months: "{{count}} months",
        years: "{{count}} year{{s}}",
        error_missing_info:
          "Please provide a name and select at least one timetable",
        security_notice: "Important Security Notice",
        security_notice_desc:
          "This is the only time you'll see this API key. Store it somewhere safe!",
        your_api_key: "Your API Key",
      },
      settings: {
        title: "Settings",
        back: "Back",
        tab_account: "Account",
        tab_apps: "App Permissions",
        account_title: "My Account",
        profile: "Profile",
        username: "Username",
        email: "Email",
        update_profile: "Update profile",
        updating: "Updating...",
        password_title: "Password",
        current_password: "Current password",
        new_password: "New password",
        change_password: "Change password",
        danger_zone: "Danger Zone",
        danger_desc:
          "Once you delete your account, there is no going back. Please be certain.",
        delete_account: "Delete account",
        delete_confirm:
          "Are you sure you want to delete your account? This action is irreversible.",
        success_profile: "Profile updated successfully.",
        success_email:
          "A verification email has been sent to your new address.",
        success_password: "Password updated successfully.",
        password_requirements: "Password must contain:",
        password_min_length: "At least 12 characters",
        password_uppercase: "One uppercase letter",
        password_lowercase: "One lowercase letter",
        password_number: "One number",
        password_special: "One special character",
        cancel: "Cancel",
        delete: "Delete",
        revoke: "Revoke",
        tab_devapps: "Applications",
      },
      dev_apps: {
        tab_title: "Applications",
        description:
          "Manage your registered OAuth applications (Developer Apps) on the server.",
        create_button: "Create App",
        loading: "Loading your applications...",
        no_apps: "No applications",
        no_apps_desc: "You haven't created any OAuth application yet.",
        create_app: "Create Application",
        edit_app: "Edit Application",
        created_at: "Created on ",

        modal: {
          create_title: "Create an Application",
          edit_title: "Edit Application",
          app_id: "Application ID",
          client_id: "Client ID",
          name_label: "Application Name *",
          name_placeholder: "E.g. My Awesome Client",
          name_helper:
            "The public name of your application, visible to your users.",
          website_label: "Root Website URL (Optional)",
          website_placeholder: "https://example.com",
          website_helper:
            "Allows users to return to your website from the authorization page.",
          icon_label: "Logo URL (Optional)",
          icon_placeholder: "https://example.com/logo.png",
          icon_helper:
            "The logo displayed on the consent page (must be an image via HTTPS).",
          contact_label: "Developer Contact (Optional)",
          contact_placeholder: "dev@example.com",
          contact_helper:
            "Email used to contact you in case of technical issues with the application.",
          tos_label: "Terms of Service (Optional)",
          tos_placeholder: "https://example.com/tos",
          tos_helper: "Link to the application's terms of service.",
          privacy_label: "Privacy Policy (Optional)",
          privacy_placeholder: "https://example.com/privacy",
          privacy_helper: "Link to the application's privacy policy.",
          redirects_label: "Allowed Redirect URIs *",
          redirects_placeholder: "https://app.example.com/callback",
          redirects_add: "Add",
          redirects_none: "No URI added yet.",
          redirects_helper:
            "These URIs will be used to redirect the user after authorizing your application. They must be exact matches. IP addresses are forbidden.",
          permissions_label: "Permissions",
          permissions_helper:
            "Permissions granted to the application that it can request from the user.",
          danger_zone_title: "Danger Zone",
          regenerate_secret: "Regenerate Secret",
          revoke_tokens: "Revoke Current Access",
          delete_app: "Delete Application",
          cancel: "Cancel",
          save: "Save",
          saving: "Saving...",
          create: "Create",
          close: "Close",
          redirects_error_invalid: "This URI is already added.",
        },

        secret_modal: {
          created_success: "Application created successfully",
          regenerate_success: "Secret regenerated successfully",
          secret_warning:
            "Make sure to copy your Client Secret now. You won't be able to see it again!",
          security_notice: "Important Security Notice",
          security_notice_desc:
            "This is the only time you will see this Client Secret. Store it somewhere safe!",
          client_id: "Client ID",
          your_client_secret: "Your Client Secret",
        },

        regenerate_modal: {
          title: "Regenerate Secret",
          confirm:
            "Warning: The old secret will be invalidated immediately. Are you sure you want to continue?",
          regenerating: "Regenerating...",
          button: "Regenerate Secret",
        },

        delete_modal: {
          title: "Delete Application",
          confirm:
            "Are you sure? This action is irreversible and will destroy access for users connected via this application.",
          deleting: "Deleting...",
          button: "Delete Permanently",
        },

        revoke_modal: {
          title: "Revoke API Access",
          confirm:
            "All users of this application will be forced to re-authenticate before they can use it again. This action is irreversible.",
          revoking: "Revoking...",
          button: "Revoke",
        },

        scopes: {
          openid: "OpenID (Required)",
          openid_desc: "Allows user authentication via OpenID Connect.",
          profile: "Public Profile",
          profile_desc:
            "Allows the application to access basic user information (name, avatar).",
          email: "Email Address",
          email_desc:
            "Allows the application to access the user's email address.",
          timetable: "Read Timetable",
          timetable_desc:
            "Allows the application to read the user's timetable and course details.",
          offline_access: "Offline Access",
          offline_access_desc:
            "Allows the application to maintain access even when the user is inactive.",
        },
      },
      consent: {
        loading: "Loading...",
        internal_app: "Internal Third-Party App",
        external_app: "External Third-Party App",
        app_information: "Information about Application",
        title: "Authorize application",
        subtitle: "The application wants to access your account.",
        allow: "Authorize",
        deny: "Deny",
        scopes: "Requested permissions:",
        timetable_scope: "Access to your timetables",
        profile_scope: "Access to your profile",
        email_scope: "Access to your email address",
        openid_scope: "Authentication",
        select_timetables: "Select timetables to share:",
        timetables_to_share: "Timetables to share",
        no_timetables: "You don't have any timetables configured.",
        add_timetable: "Add a timetable",
        error: "An error occurred",
        success: "Authorization granted successfully",
        authorize_title_start: "Authorize",
        authorize_title_end: "to access your account",
        authorizing: "Authorizing...",
        authorize_button: "Authorize {{app}}",
        default_app_name: "the application",
        cancel: "Cancel",
        app_can: "This application will be able to:",
        desc_openid: "Verify your identity",
        desc_profile: "Access your name",
        desc_email: "Access your email address",
        desc_timetable: "Access your timetables in read-only mode",
        offline_access_scope: "Extended Access",
        desc_offline_access:
          "This application will be able to access your data at any time, even when you are not connected.",
        connected_via: "Connected via Open Timetable Scraper",
        redirect_warning_start: "By authorizing, you will be redirected to",
        redirect_app: "the third-party application",
        add_another_timetable: "Add another timetable",
        unverified_title: "Verification Required",
        unverified_desc:
          "You must verify your account before you can authorize a third-party application to access your data.",
        unverified_button: "Validate my account",
        invalid_code_title: "Invalid or expired code",
        invalid_code_desc:
          "The requested authorization code does not exist or has expired. Please restart the connection process from the application.",
        app_website: "Application Website",
        developer_contact: "Developer Contact",
        tos: "Terms of Service",
        privacy_policy: "Privacy Policy",
        security_warning_title: "Stay vigilant",
        security_warning_desc:
          "By accepting, you allow {{app}} to access your Open Timetable Scraper account. Ensure this application is trusted and not impersonating a legitimate service.",
        unauthorized_scopes_title: "Unauthorized permissions",
        unauthorized_scopes_desc:
          "Some permissions requested by the application are not authorized to be granted to the user. Please contact the application developer to ask them to fix this issue.",
      },
      common: {
        language: "Language",
      },
      preview_modal: {
        title: "Timetable Preview",
        week_of: "Week of {{start}} to {{end}}",
        today: "Today",
        week: "Week",
        courses_fetched: "courses fetched",
      },
      course_details: {
        title: "Course Details",
        subject: "Subject",
        time: "Time",
        location: "Room",
        teacher: "Teacher",
        close: "Close",
      },
      landing: {
        hero: {
          title:
            "The Open-Source Timetable Aggregator that <1>centralizes your classes at the source</1>",
          subtitle:
            "A tool designed to <1>automate the retrieval</1> of your timetables at the source. Centralize your classes via a high-performance collector and connect your schedule to <3>any application</3> thanks to an API.",
          cta_start: "Get Started",
          cta_docs: "Documentation",
        },
        features: {
          title: "Designed to be useful.",
          subtitle:
            "Designed for reliability and performance, OTS Server handles the complexity of different data sources for you.",
          auto_collect: {
            title: "Automatic Collection",
            desc: "Enjoy an always up-to-date timetable. The system synchronizes in the background according to your chosen interval, eliminating any manual intervention. Set it up once, forget the rest.",
          },
          open_source: {
            title: "An Open Source, Transparent, and Secure Project",
            desc: "100% auditable code for total trust. Whether you use our instance or yours, your credentials are systematically encrypted before storage. Security is not an option, it's the standard.",
          },
          multi_platform: {
            title: "Multi-Platform",
            desc: "Extensive compatibility with major school platforms. Thanks to its open architecture, new connectors are added and maintained by the community to meet all needs.",
          },
        },
        steps: {
          title: "3 steps to sync everything.",
          step1: {
            title: "Connect your institution",
            desc: "Select your school and enter your credentials. The server takes care of validating the link with your school timetable platform.",
          },
          step2: {
            title: "Let the server sync your timetables.",
            desc: "The server connects periodically to keep your timetable up to date. No more manual refreshing, your changes are detected instantly.",
          },
          step3: {
            title: "Use your data without waiting",
            desc: "Connect your apps in one click thanks to the authentication system, or use the REST API to extract and integrate your classes directly into your own projects and custom scripts.",
          },
        },
        deploy: {
          title:
            "Ready to deploy your own instance of <br /> Open Timetable Scraper?",
          desc: "Enjoy an architecture designed for self-hosting. Launch your infrastructure with Docker and manage your service autonomously.",
          cta: "View on GitHub",
        },
      },
      not_found: {
        title: "Page not found",
        desc: "Sorry, the page you are looking for does not exist.",
        cta: "Back to home",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
