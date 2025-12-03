// ...existing code...
/* script.js — module: uses Firebase Modular SDK (v9+)
Ensure firebase-config.js exports firebaseConfig as shown above.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs,
  onSnapshot, query, orderBy, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const postsEl = document.getElementById("posts");
const navListEl = document.getElementById("navList");
const searchInput = document.getElementById("search");
const openPostFormBtn = document.getElementById("openPostFormBtn");
const postModal = document.getElementById("postModal");
const closeModal = document.getElementById("closeModal");
const cancelPost = document.getElementById("cancelPost");
const postForm = document.getElementById("postForm");
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const contentInput = document.getElementById("content");
const imageInput = document.getElementById("image");

const postDetailModal = document.getElementById("postDetailModal");
const postDetailEl = document.getElementById("postDetail");
const closeDetail = document.getElementById("closeDetail");
const commentForm = document.getElementById("commentForm");
const commentName = document.getElementById("commentName");
const commentText = document.getElementById("commentText");
const commentsList = document.getElementById("commentsList");

let currentPostId = null;

// Utility: show / hide modal
function showModal(node){ node.classList.remove("hidden"); }
function hideModal(node){ node.classList.add("hidden"); }

// Open/close handlers
if (openPostFormBtn) openPostFormBtn.addEventListener("click", ()=> { showModal(postModal); });
if (closeModal) closeModal.addEventListener("click", ()=> hideModal(postModal));
if (cancelPost) cancelPost.addEventListener("click", ()=> hideModal(postModal));

// Seed sample posts ONCE (using a metadata doc)
async function seedIfNeeded(){
  const metaRef = doc(db, "meta", "seeded_v1");
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) return; // already seeded

  const samples = [
    {
      title: "AI in Healthcare — By Naveen Raj",
      author: "Naveen Raj",
      content: "AI in Healthcare transforms diagnosis, treatment prediction, and patient monitoring. My project focuses on early disease detection using ML and medical datasets.",
    },
    {
      title: "Geo-Tagged Fish Logger — By Naveen Raj",
      author: "Naveen Raj",
      content: "A real-time fish catch logging app using GPS, Firebase, and offline caching. Helps fishermen store species, location, and catch details.",
    },
    {
      title: "Mental Health Analyzer — By Naveen Raj",
      author: "Naveen Raj",
      content: "An AI-powered mental health screening tool that identifies stress, anxiety levels, and wellness insights using NLP and sentiment analysis.",
    }
  ];

  const postsCol = collection(db, "posts");
  for (const p of samples){
    await addDoc(postsCol, {
      ...p,
      imageUrl: "",
      createdAt: serverTimestamp()
    });
  }
  await setDoc(metaRef, { seededAt: serverTimestamp() });
}

// Real-time listener for posts (ordered newest first)
function listenPostsRealtime(){
  const postsCol = collection(db, "posts");
  const q = query(postsCol, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    const posts = [];
    snapshot.forEach(docSnap => {
      posts.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderPosts(posts);
    renderNav(posts);
  }, (err)=> {
    console.error("Realtime posts error:", err);
  });
}

// Render posts list
function renderPosts(posts){
  postsEl.innerHTML = "";
  if (!posts.length){
    postsEl.innerHTML = "<p>No posts yet.</p>";
    return;
  }

  const searchQ = (searchInput?.value || "").toLowerCase();

  for (const p of posts){
    // client-side filter for search
    if (searchQ){
      const hay = `${p.title || ""} ${p.author || ""} ${p.content || ""}`.toLowerCase();
      if (!hay.includes(searchQ)) continue;
    }

    const card = document.createElement("div");
    card.className = "post-card";
    const dateStr = p.createdAt && p.createdAt.toDate ? p.createdAt.toDate().toLocaleString() : "";

    card.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <div class="post-meta">By ${escapeHtml(p.author)} — ${dateStr}</div>
      ${p.imageUrl ? `<div class="post-image"><img src="${p.imageUrl}" alt="${escapeHtml(p.title)}" /></div>` : ""}
      <p>${escapeHtml(truncate(p.content || "", 280))}</p>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn openDetail" data-id="${p.id}">Read</button>
      </div>
    `;
    postsEl.appendChild(card);
  }

  // wire read buttons
  document.querySelectorAll(".openDetail").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const id = e.currentTarget.dataset.id;
      openPostDetail(id);
    });
  });
}

// Render nav list of post titles
function renderNav(posts){
  navListEl.innerHTML = "";
  posts.forEach(p=>{
    const a = document.createElement("a");
    a.href = "#";
    a.className = "nav-link";
    a.textContent = p.title;
    a.onclick = (ev)=>{ ev.preventDefault(); openPostDetail(p.id); };
    navListEl.appendChild(a);
  });
}

// Open single post detail and listen for comments
async function openPostDetail(id){
  currentPostId = id;
  const docRef = doc(db, "posts", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()){
    alert("Post not found.");
    return;
  }
  const data = docSnap.data();
  const dateStr = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : "";
  postDetailEl.innerHTML = `
    <h2>${escapeHtml(data.title)}</h2>
    <div class="post-meta">By ${escapeHtml(data.author)} — ${dateStr}</div>
    ${data.imageUrl ? `<div class="post-image"><img src="${data.imageUrl}" alt="${escapeHtml(data.title)}" /></div>`: ""}
    <div><p>${escapeHtml(data.content)}</p></div>
  `;
  showModal(postDetailModal);

  // realtime comments subcollection
  const commentsCol = collection(db, "posts", id, "comments");
  const cQuery = query(commentsCol, orderBy("createdAt", "asc"));
  onSnapshot(cQuery, (snap)=>{
    commentsList.innerHTML = "";
    snap.forEach(sdoc=>{
      const c = sdoc.data();
      const li = document.createElement("li");
      const when = c.createdAt && c.createdAt.toDate ? c.createdAt.toDate().toLocaleString() : "";
      li.innerHTML = `<strong>${escapeHtml(c.name)}</strong> — <small>${when}</small><div>${escapeHtml(c.text)}</div>`;
      commentsList.appendChild(li);
    });
  });
}

// Comment submit
if (commentForm) commentForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if (!currentPostId) return alert("No post selected");
  const name = (commentName.value || "").trim() || "Anonymous";
  const text = (commentText.value || "").trim();
  if (!text) return;
  const commentsCol = collection(db, "posts", currentPostId, "comments");
  await addDoc(commentsCol, { name, text, createdAt: serverTimestamp() });
  commentForm.reset();
});

// Close detail
if (closeDetail) closeDetail.addEventListener("click", ()=> {
  hideModal(postDetailModal);
  currentPostId = null;
  commentsList.innerHTML = "";
});

// Submit new post
if (postForm) postForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const title = (titleInput.value || "").trim();
  const author = (authorInput.value || "").trim() || "Anonymous";
  const content = (contentInput.value || "").trim();
  if (!title || !content) return alert("Provide title and content");

  // optional image upload
  let imageUrl = "";
  if (imageInput?.files && imageInput.files[0]){
    const file = imageInput.files[0];
    const storagePath = `post_images/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, storagePath);
    await uploadBytes(sRef, file);
    imageUrl = await getDownloadURL(sRef);
  }

  const postsCol = collection(db, "posts");
  await addDoc(postsCol, {
    title, author, content, imageUrl,
    createdAt: serverTimestamp()
  });

  postForm.reset();
  hideModal(postModal);
  alert("Post published — visible to everyone.");
});

// Search input
if (searchInput) searchInput.addEventListener("input", ()=>{
  // renderPosts reads searchInput value; snapshot already updates UI so nothing else required.
});

// Helpers
function truncate(s, n){ s = s || ""; return s.length>n ? s.slice(0,n)+"..." : s; }
function escapeHtml(unsafe){
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'", "&#39;");
}

// Start
(async function(){
  try{
    await seedIfNeeded();
  }catch(e){ console.warn("Seeding skipped or failed:", e); }

  // start real-time listener
  listenPostsRealtime();

  // wire UI close: ensure search re-renders current list once
  const si = document.getElementById("search");
  if (si) si.addEventListener("input", ()=> {
    (async ()=>{
      const postsCol = collection(db, "posts");
      const snap = await getDocs(query(postsCol, orderBy("createdAt","desc")));
      const arr = [];
      snap.forEach(d=> arr.push({id:d.id,...d.data()}));
      renderPosts(arr);
      renderNav(arr);
    })();
  });

})();