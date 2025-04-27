document.addEventListener('DOMContentLoaded', async () => {
  const gallery = document.getElementById('gallery');
  const galleryLoading = document.getElementById('gallery-loading');
  
  galleryLoading.style.display = 'flex';
  
  try {
    const res = await fetch('/stream');
    const data = await res.json();
    
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
    
    animateItems();
    
  } catch (err) {
    galleryLoading.style.display = 'none';
    gallery.innerHTML = `
      <div class="error-message">
        <p>Failed to load gallery: ${err.message}</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    `;
  }
});

// Helper for formating teh date string nicely
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

// Apply a staggered fade-in animation to gallery items
function animateItems() {
  const items = document.querySelectorAll('.gallery-item');
  items.forEach((item, index) => {
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      
      // Force reflow to ensure transition starts correctly
      void item.offsetWidth;
      
      item.style.transition = 'all 0.4s ease';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, index * 100);
  });
}