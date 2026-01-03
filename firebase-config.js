// Firebase Configuration
// Replace these values with your Firebase project config from:
// Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
  apiKey: "AIzaSyAEsRIdmbQ7-DhYnObla_oajrn1WwLZvGQ",
  authDomain: "my-blog-32597.firebaseapp.com",
  projectId: "my-blog-32597",
  storageBucket: "my-blog-32597.firebasestorage.app",
  messagingSenderId: "88822268224",
  appId: "1:88822268224:web:61ef1f50a63206a222faa5"
};

// Admin email - ONLY this user can create/edit/delete blogs
const ADMIN_EMAIL = "jaswanth.suvvari@devilgamer.in";

// EmailJS Configuration (for subscriber notifications)
// Get these from https://www.emailjs.com/
const EMAILJS_CONFIG = {
  publicKey: "pAlxL_L2ww7466jBX",
  serviceId: "service_gkk4pbr",
  templateId: "template_zlrhyjo"
};

export { firebaseConfig, ADMIN_EMAIL, EMAILJS_CONFIG };
