import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "Axxxxxxx",
  authDomain: "xxxxxxx",
  projectId: "blog-website-1c1aa",
  storageBucket: "xxxxxxx",
  messagingSenderId: "6xxxxxx",
  appId: "xxxxxxxxxx"
};

const app = initializeApp(firebaseConfig);
export { app };
