// frontend/src/config/i18n.js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

// Traductions françaises
const fr = {
  common: {
    welcome: "Bienvenue sur KONKA",
    login: "Se connecter",
    register: "S'inscrire",
    logout: "Se déconnecter",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    search: "Rechercher",
    loading: "Chargement...",
    error: "Une erreur est survenue",
    success: "Opération réussie"
  },
  auth: {
    email: "Email",
    password: "Mot de passe",
    confirm_password: "Confirmer le mot de passe",
    forgot_password: "Mot de passe oublié ?",
    reset_password: "Réinitialiser le mot de passe",
    no_account: "Pas encore de compte ?",
    already_account: "Déjà un compte ?"
  },
  navigation: {
    home: "Accueil",
    shopping: "Shopping",
    publish: "Publier",
    messages: "Messages",
    music: "Musique",
    profile: "Profil",
    settings: "Paramètres"
  },
  feed: {
    for_you: "Pour toi",
    following: "Abonnements",
    global: "Global",
    like: "J'aime",
    comment: "Commenter",
    share: "Partager",
    save: "Enregistrer"
  },
  messages: {
    new_message: "Nouveau message",
    type_message: "Écrire un message...",
    online: "En ligne",
    offline: "Hors ligne",
    typing: "écrit..."
  },
  profile: {
    edit_profile: "Modifier le profil",
    followers: "Abonnés",
    following: "Abonnements",
    posts: "Publications",
    bio: "Bio",
    location: "Localisation"
  },
  shopping: {
    add_to_cart: "Ajouter au panier",
    buy_now: "Acheter maintenant",
    cart: "Panier",
    checkout: "Valider la commande",
    delivery: "Livraison",
    payment: "Paiement",
    order_confirmed: "Commande confirmée"
  }
}

// Traductions anglaises
const en = {
  common: {
    welcome: "Welcome to KONKA",
    login: "Login",
    register: "Register",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    search: "Search",
    loading: "Loading...",
    error: "An error occurred",
    success: "Operation successful"
  },
  auth: {
    email: "Email",
    password: "Password",
    confirm_password: "Confirm password",
    forgot_password: "Forgot password?",
    reset_password: "Reset password",
    no_account: "Don't have an account?",
    already_account: "Already have an account?"
  },
  // ... autres traductions
}

// Traductions lingala
const ln = {
  common: {
    welcome: "Boyei na KONKA",
    login: "Kota",
    register: "Komikomisa",
    logout: "Kobima",
    save: "Kobomba",
    cancel: "Kolongola",
    delete: "Kolimwa",
    edit: "Kobongisa",
    search: "Koluka",
    loading: "Ekomi...",
    error: "Kuna likambo",
    success: "Esili malamu"
  }
  // ...
}

// Traductions swahili
const sw = {
  common: {
    welcome: "Karibu KONKA",
    login: "Ingia",
    register: "Jisajili",
    logout: "Toka",
    save: "Hifadhi",
    cancel: "Ghairi",
    delete: "Futa",
    edit: "Hariri",
    search: "Tafuta",
    loading: "Inapakia...",
    error: "Hitilafu imetokea",
    success: "Imefanikiwa"
  }
  // ...
}

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ln: { translation: ln },
      sw: { translation: sw }
    },
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n