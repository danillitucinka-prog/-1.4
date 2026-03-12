import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ru";

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

export const translations: Translations = {
  en: {
    welcome: "Welcome back to Qvieck",
    signInSubtitle: "Sign in to continue your conversations",
    email: "Email",
    password: "Password",
    signIn: "Sign In",
    signingIn: "Signing In...",
    orContinueWith: "Or continue with",
    google: "Google",
    continueAsGuest: "Continue as Guest",
    dontHaveAccount: "Don't have an account?",
    createOne: "Create one",
    joinQvieck: "Join Qvieck",
    registerSubtitle: "Start messaging with your friends",
    username: "Username",
    createAccount: "Create Account",
    creatingAccount: "Creating Account...",
    alreadyHaveAccount: "Already have an account?",
    logout: "Logout",
    settings: "Settings",
    profile: "Profile",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    save: "Save",
    cancel: "Cancel",
    search: "Search...",
    typeMessage: "Type a message...",
    noMessages: "No messages yet. Start a conversation!",
    online: "Online",
    offline: "Offline",
    globalChat: "Global Chat",
    globalChatDesc: "Talk with everyone",
    chats: "Chats",
    channels: "Channels",
    error: "Error",
    popupClosed: "Login window was closed. Please try again and keep the window open.",
    loginHelp: "Having trouble with Google Login?",
    loginHelpDesc: "Make sure to add the app domain to 'Authorized domains' in your Firebase Console (Authentication > Settings).",
    appDomain: "App Domain",
    unauthorizedDomain: "This domain is not authorized for Google Login. Please check the help section below.",
    emailLoginDisabled: "Email/Password login is currently disabled in Firebase Console.",
    guestLoginDisabled: "Guest login is currently disabled in Firebase Console.",
    domainInfo: "Domain Information",
    domainDesc: "Your app is currently hosted on a development domain. To use a custom domain (like yourname.com), you would typically connect it via Firebase Hosting or your hosting provider.",
    authDomains: "Authorized Domains",
    authDomainsDesc: "For Google Login to work, these domains must be added to your Firebase Console:",
    copy: "Copy",
    userId: "User ID",
    cleanupGuests: "Delete All Guests",
    shareApp: "Invite Friends",
    shareAppDesc: "Share this link with friends to start chatting!",
    linkCopied: "Link copied to clipboard!",
    typing: "typing",
    clearChat: "Clear Chat",
    confirmClearChat: "Are you sure you want to clear all messages in this chat?",
    avatarDesc: "Max size 1MB. Recommended square image.",
    searchMessages: "Search messages...",
    forgotPassword: "Forgot Password?",
    deleteAllUsers: "Delete All Users",
    confirmDeleteAllUsers: "Are you sure you want to delete all user profiles? This cannot be undone.",
    createChannel: "Create Group/Channel",
    channelName: "Group Name",
    channelDesc: "Description",
    create: "Create",
    publicChannel: "Public Group",
    noChannels: "No groups yet",
    confirmPassword: "Confirm Password",
    passwordsDoNotMatch: "Passwords do not match",
    incomingVideoCall: "Incoming Video Call",
    incomingAudioCall: "Incoming Audio Call",
    accept: "Accept",
    reject: "Reject",
    videoCall: "Video Call",
    audioCall: "Audio Call",
    ringing: "Ringing...",
    ongoing: "Ongoing",
    aiAssistant: "AI Assistant",
    aiAssistantDesc: "Always here to help",
    deleteUser: "Delete User",
    confirmDeleteUser: "Are you sure you want to delete this user?",
    statistics: "Statistics",
    totalMessages: "Total Messages",
    messagesSent: "Messages Sent",
    totalUsers: "Total Users",
    activeUsers: "Active Users",
    activity: "Activity",
    searchByEmail: "Search by email...",
    noUserFound: "No user found with this email",
    personalStats: "Personal Stats",
    adminStats: "Admin Stats",
  },
  ru: {
    welcome: "С возвращением в Qvieck",
    signInSubtitle: "Войдите, чтобы продолжить общение",
    email: "Email",
    password: "Пароль",
    signIn: "Войти",
    signingIn: "Вход...",
    orContinueWith: "Или продолжить с",
    google: "Google",
    continueAsGuest: "Войти как гость",
    dontHaveAccount: "Нет аккаунта?",
    createOne: "Создать",
    joinQvieck: "Присоединяйтесь к Qvieck",
    registerSubtitle: "Начните общаться с друзьями",
    username: "Имя пользователя",
    createAccount: "Создать аккаунт",
    creatingAccount: "Создание...",
    alreadyHaveAccount: "Уже есть аккаунт?",
    logout: "Выйти",
    settings: "Настройки",
    profile: "Профиль",
    language: "Язык",
    theme: "Тема",
    light: "Светлая",
    dark: "Темная",
    save: "Сохранить",
    cancel: "Отмена",
    search: "Поиск...",
    typeMessage: "Введите сообщение...",
    noMessages: "Сообщений пока нет. Начните общение!",
    online: "В сети",
    offline: "Не в сети",
    globalChat: "Общий чат",
    globalChatDesc: "Общайтесь со всеми пользователями",
    chats: "Чаты",
    channels: "Каналы",
    guestLoginDisabled: "Вход для гостей отключен в консоли Firebase.",
    emailLoginDisabled: "Вход по Email/паролю отключен в консоли Firebase.",
    unauthorizedDomain: "Этот домен не авторизован для входа через Google. Проверьте раздел помощи ниже.",
    popupClosed: "Окно входа было закрыто. Пожалуйста, попробуйте снова и не закрывайте окно.",
    error: "Ошибка",
    loginHelp: "Проблемы со входом через Google?",
    loginHelpDesc: "Убедитесь, что домен приложения добавлен в 'Authorized domains' в консоли Firebase (Authentication > Settings).",
    appDomain: "Домен приложения",
    domainInfo: "Информация о домене",
    domainDesc: "Ваше приложение сейчас размещено на домене для разработки. Чтобы использовать свой домен (например, name.com), вам нужно подключить его через Firebase Hosting или вашего хостинг-провайдера.",
    authDomains: "Авторизованные домены",
    authDomainsDesc: "Для работы входа через Google эти домены должны быть добавлены в консоль Firebase:",
    copy: "Копировать",
    userId: "ID пользователя",
    cleanupGuests: "Удалить всех гостей",
    shareApp: "Пригласить друзей",
    shareAppDesc: "Поделитесь этой ссылкой с друзьями, чтобы начать общение!",
    linkCopied: "Ссылка скопирована в буфер обмена!",
    typing: "печатает",
    clearChat: "Очистить чат",
    confirmClearChat: "Вы уверены, что хотите удалить все сообщения в этом чате?",
    avatarDesc: "Макс. размер 1МБ. Рекомендуется квадратное изображение.",
    searchMessages: "Поиск сообщений...",
    forgotPassword: "Забыли пароль?",
    deleteAllUsers: "Удалить всех пользователей",
    confirmDeleteAllUsers: "Вы уверены, что хотите удалить все профили пользователей? Это действие нельзя отменить.",
    createChannel: "Создать группу",
    channelName: "Название группы",
    channelDesc: "Описание",
    create: "Создать",
    publicChannel: "Публичная группа",
    noChannels: "Групп пока нет",
    confirmPassword: "Подтвердите пароль",
    passwordsDoNotMatch: "Пароли не совпадают",
    incomingVideoCall: "Входящий видеозвонок",
    incomingAudioCall: "Входящий аудиозвонок",
    accept: "Принять",
    reject: "Отклонить",
    videoCall: "Видеозвонок",
    audioCall: "Аудиозвонок",
    ringing: "Звонок...",
    ongoing: "В процессе",
    aiAssistant: "ИИ Помощник",
    aiAssistantDesc: "Всегда готов помочь",
    deleteUser: "Удалить пользователя",
    confirmDeleteUser: "Вы уверены, что хотите удалить этого пользователя?",
    statistics: "Статистика",
    totalMessages: "Всего сообщений",
    messagesSent: "Отправлено сообщений",
    totalUsers: "Всего пользователей",
    activeUsers: "Активные пользователи",
    activity: "Активность",
    searchByEmail: "Поиск по email...",
    noUserFound: "Пользователь с таким email не найден",
    personalStats: "Личная статистика",
    adminStats: "Статистика админа",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "ru";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
