document.addEventListener('DOMContentLoaded', async () => {
  const gallery = document.getElementById('gallery');
  const galleryLoading = document.getElementById('gallery-loading');
  
  // Show loading indicator
  galleryLoading.style.display = 'flex';
  
  try {
    // Fetch gallery data
    const res = await fetch('/stream');
    const data = await res.json();
    
    // Hide loading indicator
    galleryLoading.style.display = 'none';
    
    if (!data.success) throw new Error(data.error);
    
    if (!data.posts.length) {
      gallery.innerHTML = `
        <div class="empty-gallery">
          <p>No haiku snapshots yet. Go capture some!</p>
          <a href="/" class="gallery-link">Back to Camera</a>
        </div>
      `;
      return;
    }
    
    // Render gallery items
    gallery.innerHTML = data.posts.map(post => `
      <div class="gallery-item">
        <div class="image-pair">
          <div class="original-image">
            <img src="${post.image_path}" alt="Original snapshot" loading="lazy" />
            <div class="image-label">Original</div>
          </div>
          <div class="ai-generated-image">
            <img src="${post.ai_image_path}" alt="AI-generated image" loading="lazy" />
            <div class="image-label">AI Generated</div>
          </div>
        </div>
        <div class="gallery-haiku">${post.haiku}</div>
        <div class="gallery-date">${formatDate(post.created_at)}</div>
      </div>
    `).join('');
    
    // Add fade-in animation to items
    animateItems();
    
  } catch (err) {
    // Hide loading indicator
    galleryLoading.style.display = 'none';
    
    // Show error message
    gallery.innerHTML = `
      <div class="error-message">
        <p>Failed to load gallery: ${err.message}</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    `;
  }
});

// Format date in a more readable way
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Animate gallery items with a staggered entrance
function animateItems() {
  const items = document.querySelectorAll('.gallery-item');
  items.forEach((item, index) => {
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      
      // Trigger reflow
      void item.offsetWidth;
      
      item.style.transition = 'all 0.4s ease';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, index * 100);
  });
}