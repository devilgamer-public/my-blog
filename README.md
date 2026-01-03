# Jaswanth's Blog

A dynamic blog with Firebase backend, Google authentication, and email subscriptions.

## Features

- **Admin-only editing** — Only `jaswanth.suvvari@devilgamer.in` can create/edit/delete posts
- **Google Sign-In** — Secure authentication via Firebase
- **Categories** — Organize posts by topic
- **Email Subscriptions** — Users can subscribe to posts and get notified on updates
- **Markdown Support** — Write posts in Markdown with live preview
- **Dark Theme** — Matches portfolio design

## Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Sign-in method → Google
4. Enable **Firestore Database** → Create database (start in production mode)
5. Go to Project Settings → General → Your apps → Add web app
6. Copy the config values

### 2. Configure Firebase

Edit `firebase-config.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Deploy Firestore Security Rules

In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email == "jaswanth.suvvari@devilgamer.in";
    }
    
    match /blogs/{blogId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    match /categories/{categoryId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
    
    match /subscriptions/{subscriptionId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Set Up EmailJS (Optional)

For subscriber notifications:

1. Go to [EmailJS](https://www.emailjs.com/)
2. Create account and email service
3. Create email template with variables: `to_email`, `blog_title`, `blog_url`, `from_name`
4. Update `firebase-config.js` with your EmailJS credentials

### 5. Deploy to Cloudflare Pages

1. Push to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Create new project → Connect to Git
4. Build settings:
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: `/` (root)
5. Deploy

## Local Development

```bash
python3 -m http.server 8080
```

## Structure

```
├── index.html          # Blog homepage
├── categories.html     # Categories listing
├── category.html       # Posts in a category
├── post.html           # Single post view
├── contact.html        # Contact page
├── admin.html          # Admin panel (create/edit posts)
├── style.css           # Styles
├── app.js              # Firebase logic
├── firebase-config.js  # Configuration (edit this!)
├── firestore.rules     # Security rules
└── README.md
```

## Security

- **Firestore Security Rules** enforce admin-only writes at the database level
- Even if someone inspects the JS, they cannot write to Firestore without being the admin
- Public read access for blogs (so everyone can view)
- Subscription creation is public (so users can subscribe)