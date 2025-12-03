const postsContainer = document.getElementById("postsContainer");
const search = document.getElementById("search");
const postForm = document.getElementById("postForm");
const reloadBtn = document.getElementById("reloadBtn");

// --------------------------
// Load posts.json + local posts
// --------------------------
async function loadPosts() {
  postsContainer.innerHTML = "<p>Loading...</p>";

  let defaultPosts = [];

  try {
    const res = await fetch("posts.json");
    defaultPosts = await res.json();
  } catch {
    defaultPosts = []; // fallback if fetch blocked (file mode)
  }

  const userPosts = JSON.parse(localStorage.getItem("userPosts") || "[]");

  const allPosts = [...userPosts, ...defaultPosts];
  displayPosts(allPosts);
}

// --------------------------
// Display posts on screen
// --------------------------
function displayPosts(posts) {
  postsContainer.innerHTML = "";

  if (posts.length === 0) {
    postsContainer.innerHTML = "<p>No blogs yet.</p>";
    return;
  }

  posts.forEach((p) => {
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <h2>${p.title}</h2>
      <small>By ${p.author}</small>
      <p>${p.content}</p>
    `;

    postsContainer.appendChild(div);
  });
}

// --------------------------
// Add new post
// --------------------------
postForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("postTitle").value;
  const author = document.getElementById("postAuthor").value;
  const content = document.getElementById("postContent").value;

  const newPost = { title, author, content };

  const existing = JSON.parse(localStorage.getItem("userPosts") || "[]");
  existing.unshift(newPost);
  localStorage.setItem("userPosts", JSON.stringify(existing));

  postForm.reset();
  loadPosts();
});

// --------------------------
// Search in posts
// --------------------------
search.addEventListener("input", async () => {
  let query = search.value.toLowerCase();

  const defaultPosts = await fetch("posts.json").then(r => r.json()).catch(() => []);
  const userPosts = JSON.parse(localStorage.getItem("userPosts") || "[]");

  const allPosts = [...userPosts, ...defaultPosts];

  const filtered = allPosts.filter(p =>
    p.title.toLowerCase().includes(query) ||
    p.author.toLowerCase().includes(query) ||
    p.content.toLowerCase().includes(query)
  );

  displayPosts(filtered);
});

// --------------------------
// Reload posts.json + local posts
// --------------------------
reloadBtn.addEventListener("click", loadPosts);

// Initial Load
loadPosts();
