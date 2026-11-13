
import {
  db,
  auth,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";


// ========================================
// ADMIN SETTINGS
// ========================================

// এখানে Firebase Authentication-এর Admin Email বসাও।
const ADMIN_EMAIL = "armanmandal9098@gmail.com";


// ========================================
// GLOBAL VARIABLES
// ========================================

let articles = [];
let currentUserIsAdmin = false;
let activeCategory = "ALL";

const $ = (id) => document.getElementById(id);


// ========================================
// SECURITY / HTML ESCAPE
// ========================================

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openLogin() {
  const modal = document.getElementById("loginModal");
  const error = document.getElementById("loginError");

  if (!modal) {
    alert("Login modal not found! Check index.html");
    return;
  }

  modal.style.display = "flex";

  if (error) {
    error.textContent = "";
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.style.display = "none";
  }
}

function openAdmin() {
  if (!currentUserIsAdmin) {
    alert("Please login as admin first.");
    return;
  }

  closeModal("loginModal");

  const modal = document.getElementById("adminModal");

  if (modal) {
    modal.style.display = "flex";
    renderAdmin();
  }
}


// ========================================
// ADMIN LOGIN
// ========================================

async function login() {
  const email = $("username").value.trim();
  const password = $("password").value;
  const errorBox = $("loginError");
  const loginButton = $("loginButton");

  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "Enter your email and password.";
    return;
  }

  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    errorBox.textContent = "This email is not authorized.";
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "SIGNING IN...";

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (
      result.user.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      await signOut(auth);
      throw new Error("Unauthorized account.");
    }

    currentUserIsAdmin = true;

    $("password").value = "";

    closeModal("loginModal");
    openAdmin();

  } catch (error) {
    console.error("Login error:", error);

    errorBox.textContent =
      "Login failed. Please check your email and password.";

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "SIGN IN";
  }
}


// ========================================
// ADMIN LOGOUT
// ========================================

async function logout() {
  try {
    await signOut(auth);

    currentUserIsAdmin = false;

    closeModal("adminModal");

    alert("You have logged out successfully.");

  } catch (error) {
    console.error(error);
    alert("Logout failed. Please try again.");
  }
}


// ========================================
// AUTHENTICATION STATE
// ========================================

onAuthStateChanged(auth, async (user) => {

  currentUserIsAdmin =
    !!user &&
    user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (user && !currentUserIsAdmin) {
    await signOut(auth);
    return;
  }

  await loadArticles();

  if (currentUserIsAdmin) {
    renderAdmin();
  }
});


// ========================================
// LOAD ARTICLES FROM FIRESTORE
// ========================================

async function loadArticles() {
  const grid = $("newsGrid");

  if (grid) {
    grid.innerHTML = '<p class="empty-message">Loading stories...</p>';
  }

  try {
    const articleQuery = query(
      collection(db, "articles"),
      where("published", "==", true)
    );

    const snapshot = await getDocs(articleQuery);

    articles = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    // Sort newest first
    articles.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;

      return dateB - dateA;
    });

    render();

    if (currentUserIsAdmin) {
      renderAdmin();
    }

    // Open article from shared URL
    const params = new URLSearchParams(
      window.location.search
    );

    const articleId = params.get("article");

    if (articleId) {
      const article = articles.find(
        (item) => item.id === articleId
      );

      if (article) {
        displayArticle(article);
      } else {
        showHome(false);
      }
    }

  } catch (error) {
    console.error("Article loading error:", error);

    if (grid) {
      grid.innerHTML =
        '<p class="empty-message">Unable to load articles. Please check your Firebase setup.</p>';
    }
  }
}


// ========================================
// HOMEPAGE RENDER
// ========================================

function render() {
  renderFeatured();
  renderArticles();
}


// ========================================
// FEATURED ARTICLE
// ========================================

function renderFeatured() {
  const featured = $("featured");

  if (!featured) return;

  if (articles.length === 0) {
    featured.innerHTML = `
      <div class="featured-main">
        <div class="empty-message">
          Welcome to THE DAILY EDIT. Your stories will appear here.
        </div>
      </div>

      <div class="featured-side">
        <div class="side-item">
          <span class="category-label">INDEPENDENT VOICES</span>
          <h3>Ideas. Arguments. Perspectives.</h3>
          <p>Independent commentary on the stories shaping our world.</p>
        </div>
      </div>
    `;

    return;
  }

  const article = articles[0];

  featured.innerHTML = `
    <div class="featured-main">

      <img
        src="${escapeHTML(article.imageUrl)}"
        alt="${escapeHTML(article.title)}"
        onerror="this.style.display='none'"
      >

      <span class="category-label">
        ${escapeHTML(article.category || "NEWS")}
      </span>

      <h1
        onclick="openArticle('${article.id}')"
        style="cursor:pointer"
      >
        ${escapeHTML(article.title)}
      </h1>

      <p>${escapeHTML(article.description)}</p>

      <button
        class="read-more"
        onclick="openArticle('${article.id}')"
      >
        READ FULL STORY →
      </button>

    </div>

    <div class="featured-side">

      <div class="side-item">
        <span class="category-label">THE DAILY EDIT</span>
        <h3>Think Beyond The Headlines.</h3>
        <p>Independent voices. Unfiltered perspectives.</p>
      </div>

      <div class="side-item">
        <span class="category-label">OUR APPROACH</span>
        <h3>Question. Analyse. Understand.</h3>
        <p>Explore the stories behind the headlines.</p>
      </div>

    </div>
  `;
}


// ========================================
// ARTICLE GRID
// ========================================

function renderArticles() {
  const grid = $("newsGrid");

  if (!grid) return;

  const filteredArticles =
    activeCategory === "ALL"
      ? articles
      : articles.filter(
          (article) =>
            (article.category || "").toUpperCase() === activeCategory
        );

  if (filteredArticles.length === 0) {
    grid.innerHTML = `
      <p class="empty-message">
        No articles available in this category.
      </p>
    `;

    return;
  }

  grid.innerHTML = filteredArticles.map((article) => `

    <article class="article-card">

      <img
        src="${escapeHTML(article.imageUrl)}"
        alt="${escapeHTML(article.title)}"
        loading="lazy"
        onerror="this.style.display='none'"
        onclick="openArticle('${article.id}')"
      >

      <div class="article-card-content">

        <span class="category-label">
          ${escapeHTML(article.category || "NEWS")}
        </span>

        <h2 onclick="openArticle('${article.id}')">
          ${escapeHTML(article.title)}
        </h2>

        <p>${escapeHTML(article.description)}</p>

        <button onclick="openArticle('${article.id}')">
          READ FULL STORY →
        </button>

      </div>

    </article>

  `).join("");
}


// ========================================
// CATEGORY FILTER
// ========================================

function filterCategory(category) {
  activeCategory = category.toUpperCase();

  showHome(false);
  renderArticles();

  window.scrollTo(0, 0);
}


// ========================================
// OPEN ARTICLE
// ========================================

function openArticle(id) {
  const article = articles.find(
    (item) => item.id === id
  );

  if (!article) {
    alert("Article not found.");
    return;
  }

  history.pushState(
    { articleId: id },
    "",
    "?article=" + encodeURIComponent(id)
  );

  displayArticle(article);
}


// ========================================
// ARTICLE DETAIL PAGE
// ========================================

function displayArticle(article) {
  const home = $("home");
  const page = $("articlePage");
  const details = $("articleDetails");

  if (!home || !page || !details) return;

  home.style.display = "none";
  page.style.display = "block";

  const date = article.createdAt?.toDate
    ? article.createdAt.toDate().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : "";

  details.innerHTML = `

    <article class="full-article">

      <span class="category-label">
        ${escapeHTML(article.category || "NEWS")}
      </span>

      <h1>${escapeHTML(article.title)}</h1>

      <p class="article-description">
        ${escapeHTML(article.description)}
      </p>

      <div class="article-meta">
        BY THE DAILY EDIT
        ${date ? " | " + escapeHTML(date) : ""}
      </div>

      <img
        class="full-article-image"
        src="${escapeHTML(article.imageUrl)}"
        alt="${escapeHTML(article.title)}"
        onerror="this.style.display='none'"
      >

      <div class="full-article-content">
        ${escapeHTML(article.content).replace(/\n/g, "<br>")}
      </div>

      <button
        class="share-button"
        onclick="shareArticle('${article.id}')"
      >
        SHARE THIS ARTICLE
      </button>

    </article>
  `;

  window.scrollTo(0, 0);
}


// ========================================
// SHARE ARTICLE
// ========================================

async function shareArticle(id) {
  const url = window.location.origin +
    window.location.pathname +
    "?article=" + encodeURIComponent(id);

  try {
    if (navigator.share) {
      await navigator.share({
        title: "THE DAILY EDIT",
        url: url
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Article link copied!");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      alert("Unable to share this article.");
    }
  }
}


// ========================================
// BACK TO HOMEPAGE
// ========================================

function showHome(updateUrl = true) {
  if (updateUrl) {
    history.pushState(
      {},
      "",
      window.location.pathname
    );
  }

  if ($("articlePage")) {
    $("articlePage").style.display = "none";
  }

  if ($("home")) {
    $("home").style.display = "block";
  }

  window.scrollTo(0, 0);
}


// ========================================
// BROWSER BACK / FORWARD
// ========================================

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(
    window.location.search
  );

  const articleId = params.get("article");

  if (articleId) {
    const article = articles.find(
      (item) => item.id === articleId
    );

    if (article) {
      displayArticle(article);
    } else {
      showHome(false);
    }
  } else {
    showHome(false);
  }
});


// ========================================
// PUBLISH ARTICLE
// ========================================

async function publishArticle() {
  if (!currentUserIsAdmin || !auth.currentUser) {
    alert("Please login as admin first.");
    return;
  }

  const title = $("title").value.trim();
  const description = $("description").value.trim();
  const category = $("category").value;
  const content = $("content").value.trim();
  const imageUrl = $("image").value.trim();

  if (!title || !description || !content || !imageUrl) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    const parsedUrl = new URL(imageUrl);

    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid image URL.");
    }
  } catch (error) {
    alert("Please enter a valid image URL.");
    return;
  }

  const button = $("publishButton");

  button.disabled = true;
  button.textContent = "PUBLISHING...";

  try {
    await addDoc(collection(db, "articles"), {
      title,
      description,
      category,
      content,
      imageUrl,
      author: "THE DAILY EDIT",
      published: true,
      createdAt: serverTimestamp()
    });

    alert("Article published successfully!");

    $("title").value = "";
    $("description").value = "";
    $("content").value = "";
    $("image").value = "";

    await loadArticles();

    renderAdmin();

  } catch (error) {
    console.error("Publish error:", error);
    alert("Publishing failed: " + error.message);

  } finally {
    button.disabled = false;
    button.textContent = "PUBLISH ARTICLE";
  }
}


// ========================================
// ADMIN ARTICLE LIST
// ========================================

function renderAdmin() {
  const container = $("adminArticles");

  if (!container) return;

  if (!currentUserIsAdmin) {
    container.innerHTML = "<p>Admin login required.</p>";
    return;
  }

  if (articles.length === 0) {
    container.innerHTML = "<p>No published articles yet.</p>";
    return;
  }

  container.innerHTML = articles.map((article) => `

    <div class="admin-article-item">

      <span>${escapeHTML(article.title)}</span>

      <button
        class="delete-button"
        onclick="deleteArticle('${article.id}')"
      >
        DELETE
      </button>

    </div>

  `).join("");
}


// ========================================
// DELETE ARTICLE
// ========================================

async function deleteArticle(id) {
  if (!currentUserIsAdmin || !auth.currentUser) {
    alert("Admin access required.");
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete this article?"
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "articles", id));

    alert("Article deleted successfully!");

    await loadArticles();

    renderAdmin();

  } catch (error) {
    console.error("Delete error:", error);
    alert("Delete failed: " + error.message);
  }
}

// CONNECT FUNCTIONS TO HTML

window.openLogin = openLogin;
window.closeModal = closeModal;
window.openAdmin = openAdmin;
window.login = login;
window.logout = logout;
window.publishArticle = publishArticle;
window.openArticle = openArticle;
window.showHome = showHome;
window.deleteArticle = deleteArticle;
window.filterCategory = filterCategory;
window.shareArticle = shareArticle;
