// Firebase Configuration
// Replace these values with your Firebase project config from:
// Firebase Console > Project Settings > General > Your apps > Web app

// This file should be copied from firebase-config.template.js
// and filled with your actual values. DO NOT commit this file.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const ADMIN_EMAIL = "YOUR_ADMIN_EMAIL";

const EMAILJS_CONFIG = {
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templateId: "YOUR_EMAILJS_TEMPLATE_ID"
};

export { firebaseConfig, ADMIN_EMAIL, EMAILJS_CONFIG };
