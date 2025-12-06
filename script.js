import { app } from "./firebase-config.js";
import {
  getFirestore, collection, addDoc, doc, setDoc,
  serverTimestamp, query, orderBy, onSnapshot, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const postsEl = document.getElementById("posts");
const navList = document.getElementById("navList");
const openNewPost = document.getElementById("openNewPost");
const postModal = document.getElementById("postModal");
const closePostModal = document.getElementById("closePostModal");
const postForm = document.getElementById("postForm");
const searchInput = document.getElementById("search");
const detailModal = document.getElementById("detailModal");
const closeDetail = document.getElementById("closeDetail");
const postDetail = document.getElementById("postDetail");
const commentForm = document.getElementById("commentForm");
const commentsList = document.getElementById("commentsList");

let currentPostId = null;

const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");
async function seedIfNeeded() {
    const metaRef = doc(db, "meta", "seed_v1");
    const snap = await getDoc(metaRef);
    if (snap.exists()) return;

    const samples = [
        {
            title: "AI in Healthcare",
            author: "Naveen Raj",
            content: "AI is transforming medical diagnosis, monitoring and early treatment predictions.",
            imageUrl: ""
        },
        {
            title: "Geo-Tagged Fish Logger",
            author: "Naveen Raj",
            content: "A full-stack web app for fishermen to log catches with real-time GPS + offline caching.",
            imageUrl: ""
        },
        {
            title: "Mental Health Analyzer",
            author: "Naveen Raj",
            content: "AI-powered psychological assessment based on mood patterns and behavioral changes.",
            imageUrl: ""
        }
    ];

    const postsCol = collection(db, "posts");
    for (const p of samples)
        await addDoc(postsCol, { ...p, createdAt: serverTimestamp() });

    await setDoc(metaRef, { seededAt: serverTimestamp() });
}
function renderPosts(posts) {
    postsEl.innerHTML = "";
    const q = searchInput.value.toLowerCase();

    posts.forEach(p => {
        // search filter
        const hay = `${p.title} ${p.author} ${p.content}`.toLowerCase();
        if (q && !hay.includes(q)) return;

        const card = document.createElement("div");
        card.className = "post-card";

        card.innerHTML = `
            <h2>${p.title}</h2>
            <div class="post-meta">By ${p.author} — ${p.createdAt?.toDate().toLocaleString()}</div>
            ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-img">` : ""}
            <p>${p.content.slice(0, 220)}...</p>
            <button class="btn primary" data-id="${p.id}">Read More</button>
        `;

        card.querySelector("button").onclick = () => openDetail(p.id);
        postsEl.appendChild(card);
    });
}
function renderNav(posts) {
    navList.innerHTML = "";
    posts.forEach(p => {
        const a = document.createElement("a");
        a.textContent = p.title;
        a.href = "#";
        a.onclick = e => {
            e.preventDefault();
            openDetail(p.id);
        };
        navList.appendChild(a);
    });
}
function watchPostsRealtime() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, snapshot => {
        const arr = [];
        snapshot.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
        renderPosts(arr);
        renderNav(arr);
    });
}
postForm.addEventListener("submit", async e => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const author = document.getElementById("author").value;
    const content = document.getElementById("content").value;
    const imageFile = document.getElementById("image").files[0];

    let imageUrl = "";

    if (imageFile) {
        const path = `post_images/${Date.now()}_${imageFile.name}`;
        const storageRefPath = storageRef(storage, path);
        await uploadBytes(storageRefPath, imageFile);
        imageUrl = await getDownloadURL(storageRefPath);
    }

    await addDoc(collection(db, "posts"), {
        title, author, content, imageUrl,
        createdAt: serverTimestamp()
    });

    hide(postModal);
    postForm.reset();
});
async function openDetail(id) {
    currentPostId = id;

    const snap = await getDoc(doc(db, "posts", id));
    if (!snap.exists()) return;

    const p = snap.data();

    postDetail.innerHTML = `
        <h1>${p.title}</h1>
        <div class="post-meta">By ${p.author} — ${p.createdAt?.toDate().toLocaleString()}</div>
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-img">` : ""}
        <p>${p.content}</p>
    `;

    loadComments(id);
    show(detailModal);
}
function loadComments(postId) {
    const cm = collection(db, "posts", postId, "comments");
    const q = query(cm, orderBy("createdAt", "asc"));

    onSnapshot(q, snap => {
        commentsList.innerHTML = "";
        snap.forEach(doc => {
            const c = doc.data();
            const li = document.createElement("li");
            li.innerHTML = `<strong>${c.name}</strong><br>${c.text}`;
            commentsList.appendChild(li);
        });
    });
}
commentForm.addEventListener("submit", async e => {
    e.preventDefault();

    const name = document.getElementById("commentName").value;
    const text = document.getElementById("commentText").value;

    await addDoc(collection(db, "posts", currentPostId, "comments"), {
        name, text, createdAt: serverTimestamp()
    });

    commentForm.reset();
});
openNewPost.onclick = () => show(postModal);
closePostModal.onclick = () => hide(postModal);
closeDetail.onclick = () => hide(detailModal);
await seedIfNeeded();
watchPostsRealtime();