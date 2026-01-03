import { firebaseConfig, ADMIN_EMAIL, EMAILJS_CONFIG } from './firebase-config.local.js';

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// State
let currentUser = null;
let isAdmin = false;

// ============================================
// AUTH FUNCTIONS
// ============================================

function initAuth() {
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    isAdmin = user?.email === ADMIN_EMAIL;
    updateAuthUI();
    
    if (isAdmin) {
      showAdminControls();
    } else {
      hideAdminControls();
    }
  });
}

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error('Sign in error:', error);
    showNotification('Sign in failed. Please try again.', 'error');
  }
}

async function signOut() {
  try {
    await auth.signOut();
    showNotification('Signed out successfully', 'success');
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  const userInfo = document.getElementById('user-info');
  
  if (!authBtn) return;
  
  if (currentUser) {
    authBtn.textContent = 'Sign Out';
    authBtn.onclick = signOut;
    if (userInfo) {
      userInfo.textContent = currentUser.email;
      userInfo.style.display = 'inline';
    }
  } else {
    authBtn.textContent = 'Sign In';
    authBtn.onclick = signInWithGoogle;
    if (userInfo) {
      userInfo.style.display = 'none';
    }
  }
}

function showAdminControls() {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = '';
  });
}

function hideAdminControls() {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = 'none';
  });
}

// ============================================
// BLOG FUNCTIONS
// ============================================

async function getBlogs(options = {}) {
  try {
    let query = db.collection('blogs').orderBy('createdAt', 'desc');
    
    if (options.category) {
      query = query.where('category', '==', options.category);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
}

async function getBlog(id) {
  try {
    const doc = await db.collection('blogs').doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
}

async function countBlogsByCategory(categoryName) {
  try {
    const snapshot = await db.collection('blogs')
      .where('category', '==', categoryName)
      .get();
    return snapshot.size;
  } catch (error) {
    console.error('Error counting blogs for category:', categoryName, error);
    return 0;
  }
}

async function createBlog(blogData) {
  if (!isAdmin) {
    showNotification('Only admin can create blogs', 'error');
    return null;
  }
  
  try {
    const blog = {
      ...blogData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      author: ADMIN_EMAIL
    };
    
    const docRef = await db.collection('blogs').add(blog);
    showNotification('Blog created successfully', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Error creating blog:', error);
    showNotification('Failed to create blog', 'error');
    return null;
  }
}

async function updateBlog(id, blogData) {
  if (!isAdmin) {
    showNotification('Only admin can update blogs', 'error');
    return false;
  }
  
  try {
    await db.collection('blogs').doc(id).update({
      ...blogData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Notify subscribers
    await notifySubscribers(id, blogData.title);
    
    showNotification('Blog updated successfully', 'success');
    return true;
  } catch (error) {
    console.error('Error updating blog:', error);
    showNotification('Failed to update blog', 'error');
    return false;
  }
}

async function deleteBlog(id) {
  if (!isAdmin) {
    showNotification('Only admin can delete blogs', 'error');
    return false;
  }
  
  if (!confirm('Are you sure you want to delete this blog?')) {
    return false;
  }
  
  try {
    await db.collection('blogs').doc(id).delete();
    
    // Delete associated subscriptions
    const subs = await db.collection('subscriptions').where('blogId', '==', id).get();
    const batch = db.batch();
    subs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    showNotification('Blog deleted successfully', 'success');
    return true;
  } catch (error) {
    console.error('Error deleting blog:', error);
    showNotification('Failed to delete blog', 'error');
    return false;
  }
}

// ============================================
// CATEGORY FUNCTIONS
// ============================================

async function getCategories() {
  try {
    const snapshot = await db.collection('categories').orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function createCategory(name, description = '') {
  if (!isAdmin) {
    showNotification('Only admin can create categories', 'error');
    return null;
  }
  
  try {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const docRef = await db.collection('categories').add({
      name,
      slug,
      description,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showNotification('Category created successfully', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Error creating category:', error);
    showNotification('Failed to create category', 'error');
    return null;
  }
}

async function deleteCategory(id, categoryName) {
  if (!isAdmin) {
    showNotification('Only admin can delete categories', 'error');
    return false;
  }
  
  try {
    // Check if any blogs use this category
    const blogCount = await countBlogsByCategory(categoryName);
    
    if (blogCount > 0) {
      showNotification('Cannot delete: category has blogs assigned', 'error');
      return false;
    }
    
    if (!confirm(`Delete category "${categoryName}"?`)) {
      return false;
    }
    
    await db.collection('categories').doc(id).delete();
    showNotification('Category deleted successfully', 'success');
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    showNotification('Failed to delete category', 'error');
    return false;
  }
}

// ============================================
// SUBSCRIPTION FUNCTIONS
// ============================================

async function subscribeToBlog(blogId, email) {
  if (!email || !email.includes('@')) {
    showNotification('Please enter a valid email', 'error');
    return false;
  }
  
  try {
    // Create a unique ID based on blogId and email to prevent duplicates
    const subscriptionId = `${blogId}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Use set - if already exists, it just updates (harmless)
    // Don't check first because security rules don't allow reading subscriptions
    await db.collection('subscriptions').doc(subscriptionId).set({
      blogId,
      email,
      subscribedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showNotification('Subscribed! You\'ll be notified of updates.', 'success');
    return true;
  } catch (error) {
    console.error('Error subscribing:', error);
    showNotification('Failed to subscribe. Please try again.', 'error');
    return false;
  }
}

async function unsubscribeFromBlog(blogId, email) {
  try {
    const snapshot = await db.collection('subscriptions')
      .where('blogId', '==', blogId)
      .where('email', '==', email)
      .get();
    
    if (snapshot.empty) {
      showNotification('Subscription not found', 'error');
      return false;
    }
    
    await snapshot.docs[0].ref.delete();
    showNotification('Unsubscribed successfully', 'success');
    return true;
  } catch (error) {
    console.error('Error unsubscribing:', error);
    showNotification('Failed to unsubscribe', 'error');
    return false;
  }
}

// ============================================
// EMAIL NOTIFICATION (EmailJS)
// ============================================

async function notifySubscribers(blogId, blogTitle) {
  try {
    const snapshot = await db.collection('subscriptions')
      .where('blogId', '==', blogId)
      .get();
    
    if (snapshot.empty) return;
    
    const emails = snapshot.docs.map(doc => doc.data().email);
    const blogUrl = `${window.location.origin}/post.html?id=${blogId}`;
    
    // Send emails via EmailJS
    for (const email of emails) {
      try {
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          to_email: email,
          blog_title: blogTitle,
          blog_url: blogUrl,
          from_name: 'Jaswanth\'s Blog'
        });
      } catch (e) {
        console.error('Failed to send email to:', email, e);
      }
    }
    
    console.log(`Notified ${emails.length} subscribers`);
  } catch (error) {
    console.error('Error notifying subscribers:', error);
  }
}

// ============================================
// UI HELPERS
// ============================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function createBlogPreviewHTML(blog) {
  return `
    <article class="post-preview">
      <header>
        <time datetime="${blog.createdAt?.toDate?.()?.toISOString().split('T')[0] || ''}">${formatDate(blog.createdAt)}</time>
        <span class="tag">${blog.category || 'Uncategorized'}</span>
      </header>
      <h3><a href="/post.html?id=${blog.id}">${escapeHtml(blog.title)}</a></h3>
      <p>${escapeHtml(blog.excerpt || blog.content?.substring(0, 200) + '...')}</p>
      <footer>
        <span class="read-time">${estimateReadTime(blog.content)} min read</span>
        ${isAdmin ? `
          <span class="admin-only admin-actions">
            <a href="/admin.html?edit=${blog.id}" class="edit-btn">Edit</a>
            <button onclick="deleteBlog('${blog.id}').then(() => location.reload())" class="delete-btn">Delete</button>
          </span>
        ` : ''}
      </footer>
    </article>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function estimateReadTime(content) {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ============================================
// PAGE INITIALIZATION
// ============================================

async function initHomePage() {
  const blogsContainer = document.getElementById('blogs-container');
  if (!blogsContainer) return;
  
  blogsContainer.innerHTML = '<p class="loading">Loading blogs...</p>';
  
  const blogs = await getBlogs({ limit: 10 });
  
  if (blogs.length === 0) {
    blogsContainer.innerHTML = '<p class="no-content">No blogs yet. Check back soon!</p>';
    return;
  }
  
  blogsContainer.innerHTML = blogs.map(createBlogPreviewHTML).join('');
}

async function initCategoriesPage() {
  const categoriesContainer = document.getElementById('categories-container');
  if (!categoriesContainer) return;
  
  const categories = await getCategories();
  
  if (categories.length === 0) {
    categoriesContainer.innerHTML = '<p class="no-content">No categories yet.</p>';
    return;
  }
  
  let html = '<div class="categories-grid">';
  for (const cat of categories) {
    const blogCount = await countBlogsByCategory(cat.name);
    const canDelete = isAdmin && blogCount === 0;
    html += `
      <div class="category-card-wrapper">
        <a href="/category.html?name=${encodeURIComponent(cat.name)}" class="category-card">
          <h3>${escapeHtml(cat.name)}</h3>
          <p>${escapeHtml(cat.description)}</p>
          <span class="post-count">${blogCount} posts</span>
        </a>
        ${canDelete ? `
          <button class="icon-btn delete-btn category-delete-btn" 
                  onclick="event.stopPropagation(); deleteCategory('${cat.id}', '${escapeHtml(cat.name)}').then(success => { if(success) location.reload(); })" 
                  title="Delete category">🗑️</button>
        ` : ''}
      </div>
    `;
  }
  html += '</div>';
  
  categoriesContainer.innerHTML = html;
}

async function initCategoryPage() {
  const params = new URLSearchParams(window.location.search);
  const categoryName = params.get('name');
  
  const titleEl = document.getElementById('category-title');
  const blogsContainer = document.getElementById('blogs-container');
  
  if (!categoryName || !blogsContainer) return;
  
  if (titleEl) titleEl.textContent = categoryName;
  
  const blogs = await getBlogs({ category: categoryName });
  
  if (blogs.length === 0) {
    blogsContainer.innerHTML = '<p class="no-content">No blogs in this category yet.</p>';
    return;
  }
  
  blogsContainer.innerHTML = blogs.map(createBlogPreviewHTML).join('');
}

async function initPostPage() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');
  
  const postContainer = document.getElementById('post-container');
  if (!postId || !postContainer) return;
  
  const blog = await getBlog(postId);
  
  if (!blog) {
    postContainer.innerHTML = '<p class="error">Blog post not found.</p>';
    return;
  }
  
  document.title = `${blog.title} | Jaswanth Suvvari`;
  
  postContainer.innerHTML = `
    <article class="post">
      <header>
        <div class="post-title-row">
          <h1>${escapeHtml(blog.title)}</h1>
          ${isAdmin ? `
            <div class="admin-only admin-actions-inline">
              <a href="/admin.html?edit=${blog.id}" class="icon-btn edit-btn" title="Edit">✏️</a>
              <button onclick="deleteBlog('${blog.id}').then(() => location.href='/')" class="icon-btn delete-btn" title="Delete">🗑️</button>
            </div>
          ` : ''}
        </div>
        <p class="meta">
          <time datetime="${blog.createdAt?.toDate?.()?.toISOString().split('T')[0] || ''}">${formatDate(blog.createdAt)}</time>
          · ${estimateReadTime(blog.content)} min read
          · <span class="tag">${escapeHtml(blog.category || 'Uncategorized')}</span>
        </p>
      </header>
      
      <div class="post-content">
        ${blog.contentHtml || marked.parse(blog.content || '')}
      </div>
      
      <footer class="post-footer">
        <div class="subscribe-box">
          <h4>Get notified of updates</h4>
          <p>Enter your email to receive notifications when this article is updated.</p>
          <form id="subscribe-form" onsubmit="handleSubscribe(event, '${blog.id}')">
            <input type="email" id="subscribe-email" placeholder="your@email.com" required>
            <button type="submit" class="btn btn-primary">Subscribe</button>
          </form>
        </div>
      </footer>
    </article>
  `;
  
  // Render Mermaid diagrams after content is loaded
  await renderMermaid();
}

async function handleSubscribe(event, blogId) {
  event.preventDefault();
  const emailInput = document.getElementById('subscribe-email');
  const email = emailInput.value.trim();
  
  const success = await subscribeToBlog(blogId, email);
  if (success) {
    emailInput.value = '';
  }
}

// Initialize EmailJS
function initEmailJS() {
  if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
    emailjs.init(EMAILJS_CONFIG.publicKey);
  }
}

// Initialize Mermaid
function initMermaid() {
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#f4f4f5',
        primaryBorderColor: '#3f3f46',
        lineColor: '#a1a1aa',
        secondaryColor: '#1f1f23',
        tertiaryColor: '#0a0a0f',
        background: '#0a0a0f',
        mainBkg: '#1f1f23',
        textColor: '#f4f4f5'
      }
    });
  }
}

// Render Mermaid diagrams in content
async function renderMermaid() {
  if (typeof mermaid !== 'undefined') {
    const mermaidBlocks = document.querySelectorAll('pre code.language-mermaid');
    for (const block of mermaidBlocks) {
      const pre = block.parentElement;
      const code = block.textContent;
      const container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = code;
      pre.replaceWith(container);
    }
    await mermaid.run();
  }
}

// Export functions for global access
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.deleteBlog = deleteBlog;
window.deleteCategory = deleteCategory;
window.handleSubscribe = handleSubscribe;
window.subscribeToBlog = subscribeToBlog;
window.createBlog = createBlog;
window.updateBlog = updateBlog;
window.getBlog = getBlog;
window.getBlogs = getBlogs;
window.getCategories = getCategories;
window.createCategory = createCategory;
window.isAdmin = () => isAdmin;
window.currentUser = () => currentUser;
window.renderMermaid = renderMermaid;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initEmailJS();
  initMermaid();
  
  // Page-specific initialization
  const page = document.body.dataset.page;
  switch (page) {
    case 'home':
      initHomePage();
      break;
    case 'categories':
      initCategoriesPage();
      break;
    case 'category':
      initCategoryPage();
      break;
    case 'post':
      initPostPage();
      break;
  }
});
