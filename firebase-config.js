import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyABr2d7ZtS590dmHETwAWHEF5ugQvnI6n0",
  authDomain: "blog-website-1c1aa.firebaseapp.com",
  projectId: "blog-website-1c1aa",
  storageBucket: "blog-website-1c1aa.firebasestorage.app",
  messagingSenderId: "613804563206",
  appId: "1:613804563206:web:4932e50405bfbdf3f3dc87"
};

const app = initializeApp(firebaseConfig);
export { app };
