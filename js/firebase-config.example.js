/* Copy to firebase-config.js and fill from Firebase Console → Project settings → Your apps.
   firebase-config.js is gitignored — never commit secrets if you add server keys.
   Web apiKey is expected in client apps; still keep the file local if you prefer. */
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
};
