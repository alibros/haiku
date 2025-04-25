// AI-Enhanced Slideshow functionality
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const slideshowContainer = document.querySelector('.slideshow-container');
  const backgroundContainer = document.getElementById('background-container');
  const haikuContainer = document.getElementById('haiku-container');
  const haikuText = document.querySelector('.haiku-text');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const pauseButton = document.getElementById('pause-button');
  const pauseIcon = pauseButton.querySelector('.pause-icon'); // More specific selector
  const playIcon = pauseButton.querySelector('.play-icon'); // More specific selector
  const loadingIndicator = document.getElementById('slideshow-loading');
  const noContentMessage = document.getElementById('no-content');
  
  // Audio elements
  const bgMusic = document.getElementById('background-music');
  const muteButton = document.getElementById('mute-button');
  const speakerIcon = muteButton.querySelector('.speaker-icon'); // More specific selector
  const muteIcon = muteButton.querySelector('.mute-icon'); // More specific selector

  // Slideshow state
  let haikus = [];
  let currentIndex = 0;
  let isPlaying = true;
  let slideInterval;
  let currentAnimation;
  const slideDuration = 15000; // 15 seconds per slide
  const fadeOutDelay = 2000; // Time before fadeout starts (2 seconds before next slide)
  
  // Audio state
  let isMuted = false;
  const crossfadeTime = 1.5; // seconds for crossfade duration
  let isFading = false; // Flag to prevent multiple fade triggers
  const targetVolume = 0.6; // Target volume (0 to 1)
  
  /**
   * Initialize the slideshow and audio
   */
  function init() {
    // Show loading indicator
    showLoading(true);
    showNoContent(false);
    
    // Setup audio first
    setupAudio();
    
    // Fetch AI-generated haikus and images
    fetchAIHaikus();
  }
  
  /**
   * Setup Audio playback and controls
   */
  function setupAudio() {
    bgMusic.volume = targetVolume; // Set initial volume
    bgMusic.muted = isMuted;
    updateMuteButton();

    // Attempt to play audio - might be blocked by browser initially
    const playPromise = bgMusic.play();
    if (playPromise !== undefined) {
      playPromise.then(_ => {
        console.log("Background music started.");
      }).catch(error => {
        console.warn("Music autoplay blocked by browser:", error);
        // Could add a click-to-play overlay here if needed
      });
    }

    // Crossfade Loop Logic
    bgMusic.addEventListener('timeupdate', handleMusicLoop);

    // Mute Button Logic
    muteButton.addEventListener('click', toggleMute);
  }
  
  /**
   * Handle smooth looping with crossfade
   */
  function handleMusicLoop() {
    if (isFading || !bgMusic.duration) return; // Exit if already fading or duration not known

    const timeLeft = bgMusic.duration - bgMusic.currentTime;

    if (timeLeft <= crossfadeTime) {
      isFading = true;
      console.log("Initiating crossfade...");

      // Fade out
      let currentVol = bgMusic.volume;
      const fadeOutInterval = setInterval(() => {
        currentVol -= 0.05; // Adjust step for smoother/faster fade
        if (currentVol <= 0) {
          bgMusic.volume = 0;
          clearInterval(fadeOutInterval);
          
          // Reset and Fade In
          bgMusic.currentTime = 0;
          bgMusic.play(); // Ensure playing
          let fadeInVol = 0;
          const fadeInInterval = setInterval(() => {
            fadeInVol += 0.05; // Adjust step
            if (fadeInVol >= targetVolume) {
              bgMusic.volume = targetVolume;
              clearInterval(fadeInInterval);
              isFading = false; // Reset flag
              console.log("Crossfade complete.");
            } else {
              bgMusic.volume = fadeInVol;
            }
          }, (crossfadeTime * 1000) / (2 * (targetVolume / 0.05))); // Calculate interval time

        } else {
          bgMusic.volume = currentVol;
        }
      }, (crossfadeTime * 1000) / (2 * (currentVol / 0.05))); // Calculate interval time
    }
  }
  
  /**
   * Toggle Mute State
   */
  function toggleMute() {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
    updateMuteButton();
  }
  
  /**
   * Update Mute Button Icon
   */
  function updateMuteButton() {
    if (isMuted) {
      speakerIcon.classList.add('hidden');
      muteIcon.classList.remove('hidden');
    } else {
      speakerIcon.classList.remove('hidden');
      muteIcon.classList.add('hidden');
    }
  }
  
  /**
   * Fetch AI-generated haikus and images from the server
   */
  async function fetchAIHaikus() {
    try {
      const response = await fetch('/api/ai-haikus');
      console.log("API Response Status:", response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch AI haikus (status: ${response.status})`);
      }
      
      const data = await response.json();
      console.log("Data received from /api/ai-haikus:", data);
      
      if (data.haikus && data.haikus.length > 0) {
        console.log("Processing haikus:", data.haikus);
        haikus = data.haikus.map(haiku => ({
          text: haiku.text,
          imageUrl: haiku.imageUrl,
          prompt: haiku.prompt || '',
          model: haiku.model || 'AI'
        }));
        console.log("Mapped haikus state:", haikus);
        
        // Hide loading and start slideshow
        showLoading(false);
        
        // Show first slide and start slideshow
        showSlide(0);
        startSlideshow();
      } else {
        console.log("No haikus received or empty array.");
        // No haikus available
        showLoading(false);
        showNoContent(true);
      }
    } catch (error) {
      console.error('Error fetching AI haikus:', error);
      showLoading(false);
      showNoContent(true);
    }
  }
  
  /**
   * Start the automatic slideshow
   */
  function startSlideshow() {
    stopSlideshow(); // Clear any existing interval
    
    slideInterval = setInterval(() => {
      fadeOutWords(() => {
        nextSlide();
      });
    }, slideDuration);
  }
  
  /**
   * Stop the automatic slideshow
   */
  function stopSlideshow() {
    if (slideInterval) {
      clearInterval(slideInterval);
    }
    
    // Also clear any running animations
    if (currentAnimation) {
      clearTimeout(currentAnimation);
    }
  }
  
  /**
   * Toggle play/pause
   */
  function togglePlayPause() {
    isPlaying = !isPlaying;
    
    if (isPlaying) {
      pauseIcon.classList.remove('hidden');
      playIcon.classList.add('hidden');
      startSlideshow();
    } else {
      pauseIcon.classList.add('hidden');
      playIcon.classList.remove('hidden');
      stopSlideshow();
    }
  }
  
  /**
   * Go to next slide
   */
  function nextSlide() {
    stopSlideshow();
    currentIndex = (currentIndex + 1) % haikus.length;
    showSlide(currentIndex);
    
    if (isPlaying) {
      startSlideshow();
    }
  }
  
  /**
   * Go to previous slide
   */
  function prevSlide() {
    stopSlideshow();
    currentIndex = (currentIndex - 1 + haikus.length) % haikus.length;
    showSlide(currentIndex);
    
    if (isPlaying) {
      startSlideshow();
    }
  }
  
  /**
   * Fade out all words before changing slide
   */
  function fadeOutWords(callback) {
    const words = document.querySelectorAll('.haiku-word');
    
    // Add the fadeout class to all words
    words.forEach(word => {
      word.classList.add('fade-out-word');
    });
    
    // Wait for fadeout animation to complete, then call callback
    setTimeout(() => {
      if (callback) callback();
    }, 1000); // 1 second fadeout
  }
  
  /**
   * Display slide
   */
  function showSlide(index) {
    console.log(`Showing slide index: ${index}`);
    if (!haikus[index]) {
      console.error(`Haiku data missing for index: ${index}`);
      return;
    }
    
    const haiku = haikus[index];
    console.log("Current haiku data:", haiku);
    
    if (!haiku.imageUrl) {
      console.error("Image URL is missing for this haiku:", haiku);
    }
    
    // Update background image with enhanced crossfade effect
    const currentBg = backgroundContainer.querySelector('.slide-bg.current');
    const nextBg = backgroundContainer.querySelector('.slide-bg.next');
    
    console.log(`Setting next background image URL to: ${haiku.imageUrl}`);
    nextBg.style.backgroundImage = `url(${haiku.imageUrl || ''})`; 
    nextBg.classList.add('fade-in');
    currentBg.classList.add('fade-out');
    nextBg.classList.add('animate');
    
    // --- Synchronization Point --- 
    // Wait for the background image fade-in (1500ms) before updating text
    const imageTransitionDuration = 1500; 
    
    setTimeout(() => {
      console.log("Completing background transition for index:", index);
      // Update text *after* image transition starts
      updateHaikuText(haiku.text);
      
      // Swap classes for background
      nextBg.classList.remove('fade-in');
      currentBg.classList.remove('fade-out');
      currentBg.classList.remove('current');
      currentBg.classList.add('next');
      currentBg.classList.remove('animate');
      nextBg.classList.remove('next');
      nextBg.classList.add('current');
      
      // Add image attribution slightly after text starts animating
      updateImageAttribution(haiku); 
      
    }, imageTransitionDuration);
    
    // --- Removed text update from here --- 
    // updateHaikuText(haiku.text); // Moved inside setTimeout
  }
  
  /**
   * Update image attribution
   */
  function updateImageAttribution(haiku) {
    // Remove any existing attribution
    const existingAttribution = document.querySelector('.image-attribution');
    if (existingAttribution) {
      existingAttribution.remove();
    }
    
    // Create new attribution - Simplified
    const attribution = document.createElement('div');
    attribution.className = 'image-attribution';
    // Only display the model name
    attribution.textContent = `Generated by ${haiku.model || 'AI'}`;
    
    // Add to container
    slideshowContainer.appendChild(attribution);
    
    // Fade in attribution
    setTimeout(() => {
      // Make sure attribution exists before trying to style
      if (document.body.contains(attribution)) {
        attribution.style.opacity = '1'; 
      }
    }, 500);
  }
  
  /**
   * Update haiku text with enhanced animation
   */
  function updateHaikuText(text) {
    // Clear current text
    haikuText.innerHTML = '';
    
    // Split haiku into lines
    const lines = text.split('\n');
    let allWords = [];
    
    // Process normal line structure
    lines.forEach(line => {
      const lineElement = document.createElement('div');
      lineElement.className = 'haiku-line';
      
      // Split line into words for animation
      const words = line.trim().split(' ');
      
      words.forEach(word => {
        if (word.trim() !== '') {
          const wordElement = document.createElement('span');
          // Assign class for styling, start invisible
          wordElement.className = 'haiku-word'; 
          wordElement.textContent = word + ' '; // Add space back
          lineElement.appendChild(wordElement);
          // Collect all word elements for animation
          allWords.push(wordElement);
        }
      });
      
      haikuText.appendChild(lineElement);
    });
    
    // Animate words sequentially
    animateWords(allWords);
  }
  
  /**
   * Animate words sequentially with enhanced timing
   */
  function animateWords(words) {
    if (words.length === 0) return;
    
    // Clear previous animation timeouts if any
    if (currentAnimation) {
        clearTimeout(currentAnimation);
    }

    // Calculate time per word so all words appear within the first 70% of slide duration
    const animationDuration = slideDuration * 0.7;
    const timePerWord = Math.max(100, Math.min(600, animationDuration / words.length)); // Ensure minimum delay
    
    let wordIndex = 0;
    
    function animateNextWord() {
      if (wordIndex < words.length) {
        // Add .visible class to trigger CSS transition
        words[wordIndex].classList.add('visible'); 
        wordIndex++;
        
        // Schedule the next word animation
        currentAnimation = setTimeout(animateNextWord, timePerWord);
      }
    }
    
    // Start the animation sequence
    // Add a small delay before starting to ensure DOM is ready
    setTimeout(animateNextWord, 100); 
    
    // Schedule fadeout for the words before the slide changes
    // Note: fadeOutWords itself has a timeout for the animation
    setTimeout(() => {
      if (isPlaying) {
          fadeOutWords(); 
      }
    }, slideDuration - fadeOutDelay - 1000); // Start fade-out 1s before the actual transition begins
  }
  
  /**
   * Show or hide the loading indicator
   */
  function showLoading(show) {
    if (show) {
      loadingIndicator.classList.remove('hidden');
    } else {
      loadingIndicator.classList.add('hidden');
    }
  }
  
  /**
   * Show or hide the no content message
   */
  function showNoContent(show) {
    if (show) {
      noContentMessage.classList.remove('hidden');
    } else {
      noContentMessage.classList.add('hidden');
    }
  }
  
  // Event listeners
  prevButton.addEventListener('click', prevSlide);
  nextButton.addEventListener('click', nextSlide);
  pauseButton.addEventListener('click', togglePlayPause);
  
  // Keyboard navigation
  document.addEventListener('keydown', event => {
    switch(event.key) {
      case 'ArrowLeft':
        prevSlide();
        break;
      case 'ArrowRight':
        nextSlide();
        break;
      case ' ': // Spacebar
        togglePlayPause();
        break;
    }
  });
  
  // Start the slideshow
  init();
}); 