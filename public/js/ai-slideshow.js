// Frontend JS for the Slideshow Page ai-slideshow.html

document.addEventListener('DOMContentLoaded', () => {
  // UI components DOM refrences
  const slideshowContainer = document.querySelector('.slideshow-container');
  const backgroundContainer = document.getElementById('background-container');
  const haikuContainer = document.getElementById('haiku-container');
  const haikuText = document.querySelector('.haiku-text');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const pauseButton = document.getElementById('pause-button');
  const pauseIcon = pauseButton.querySelector('.pause-icon');
  const playIcon = pauseButton.querySelector('.play-icon');
  const loadingIndicator = document.getElementById('slideshow-loading');
  const noContentMessage = document.getElementById('no-content');
  
  // Audio elements
  const bgMusic = document.getElementById('background-music');
  const muteButton = document.getElementById('mute-button');
  const speakerIcon = muteButton.querySelector('.speaker-icon');
  const muteIcon = muteButton.querySelector('.mute-icon');

  // state management variables
  let haikus = [];
  let currentIndex = 0;
  let isPlaying = true;
  let slideInterval;
  let currentAnimation;

  // Duration of each image (TODO: Create UI setting for this so can be set from the webpage direction)
  const slideDuration = 15000;
  const fadeOutDelay = 2000;
  
  // Audio state
  let isMuted = false;
  const crossfadeTime = 1.5;
  // this is kind of a hack to prevent multiple fade triggers
  let isFading = false; 
  const targetVolume = 0.6;
  
  //page needs to have an interaction for the audio to become available 
  let audioStarted = false; 
  
  // ---------------------------------


  //Initialize the slideshow and audio
  function init() {
    showLoading(true);
    showNoContent(false);
    setupAudio();
    fetchAIHaikus();
  }
  

   //Setup Audio playback and controls
  function setupAudio() {
    bgMusic.volume = targetVolume; 
    bgMusic.muted = isMuted;
    updateMuteButton();
    
    // Add listener to start music on first interaction (keyboard or mouse)
    document.body.addEventListener('click', startMusicOnInteraction, { once: true });

    document.body.addEventListener('keydown', startMusicOnInteraction, { once: true });
    bgMusic.addEventListener('timeupdate', handleMusicLoop);
    muteButton.addEventListener('click', toggleMute);

  }
  

  function handleMusicLoop() {
    if (isFading || !bgMusic.duration) return; 
    const timeLeft = bgMusic.duration - bgMusic.currentTime;

    if (timeLeft <= crossfadeTime) {
      isFading = true;
      //console.log("Initiating crossfade...");

      // Fade out
      let currentVol = bgMusic.volume;
      const fadeOutInterval = setInterval(() => {
        //slowly decrease volume
        currentVol -= 0.05;
        if (currentVol <= 0) {
          bgMusic.volume = 0;
          clearInterval(fadeOutInterval);
          
          bgMusic.currentTime = 0;
          bgMusic.play(); 
          let fadeInVol = 0;
          const fadeInInterval = setInterval(() => {
            fadeInVol += 0.05; 
            if (fadeInVol >= targetVolume) {
              bgMusic.volume = targetVolume;
              clearInterval(fadeInInterval);
              isFading = false; 
              //console.log("Crossfade complete.");
            } else {
              bgMusic.volume = fadeInVol;
            }
          }, (crossfadeTime * 1000) / (2 * (targetVolume / 0.05)));

        } else {
          bgMusic.volume = currentVol;
        }
      }, (crossfadeTime * 1000) / (2 * (currentVol / 0.05))); 
    }
  }
  

  function toggleMute() {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
    updateMuteButton();
  }
  

  function updateMuteButton() {
    if (isMuted) {
      speakerIcon.classList.add('hidden');
      muteIcon.classList.remove('hidden');
    } else {
      speakerIcon.classList.remove('hidden');
      muteIcon.classList.add('hidden');
    }
  }
  //API call back to the server - see server.js for implementation
  async function fetchAIHaikus() {
    try {
      const response = await fetch('/api/ai-haikus');
      //console.log("API Response Status:", response.status);
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
          model: haiku.model || 'AI' //I don't really need this, only added it to test different models but ended up using 4.1 so TODO: take this field one
        }));
        console.log("Mapped haikus state:", haikus);
        
        showLoading(false);
        


        showSlide(0);
        startSlideshow();
      } else {
        //console.log("No haikus received or empty array.");
        showLoading(false);
        showNoContent(true);
      }
    } catch (error) {
      console.error('Error fetching AI haikus:', error);
      showLoading(false);
      showNoContent(true);
    }
  }
  

  function startSlideshow() {
    stopSlideshow();
    
    slideInterval = setInterval(() => {
      fadeOutWords(() => {
        nextSlide();
      });
    }, slideDuration);
  }
 
  function stopSlideshow() {
    if (slideInterval) {
      clearInterval(slideInterval);
    }
    
    if (currentAnimation) {
      clearTimeout(currentAnimation);
    }
  }
  
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
  

  //Slide controls 
  function nextSlide() {
    stopSlideshow();
    currentIndex = (currentIndex + 1) % haikus.length;
    showSlide(currentIndex);
    
    if (isPlaying) {
      startSlideshow();
    }
  }
  
  function prevSlide() {
    stopSlideshow();
    currentIndex = (currentIndex - 1 + haikus.length) % haikus.length;
    showSlide(currentIndex);
    
    if (isPlaying) {
      startSlideshow();
    }
  }
  

  function fadeOutWords(callback) {
    const words = document.querySelectorAll('.haiku-word');
    
    // Add the fadeout class to all words
    words.forEach(word => {
      word.classList.add('fade-out-word');
    });
    
    // Wait for fadeout animation to complete, then call callback (there is definitely a better way?!)
    setTimeout(() => {
      if (callback) callback();
    }, 1000);
  }
  
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
    
    const currentBg = backgroundContainer.querySelector('.slide-bg.current');
    const nextBg = backgroundContainer.querySelector('.slide-bg.next');
    
    console.log(`Setting next background image URL to: ${haiku.imageUrl}`);
    nextBg.style.backgroundImage = `url(${haiku.imageUrl || ''})`; 
    nextBg.classList.add('fade-in');
    currentBg.classList.add('fade-out');
    nextBg.classList.add('animate');
    
    // waiting for the background image fade-in before updating text
    const imageTransitionDuration = 1500; 
    
    setTimeout(() => {
      console.log("Completing background transition for index:", index);
      // Update text *only after* image transition starts (bit of a race condition and not very elegant)
      updateHaikuText(haiku.text);
      
      // Swap classes for background
      nextBg.classList.remove('fade-in');
      currentBg.classList.remove('fade-out');
      currentBg.classList.remove('current');
      currentBg.classList.add('next');
      currentBg.classList.remove('animate');
      nextBg.classList.remove('next');
      nextBg.classList.add('current');
      
      updateImageAttribution(haiku); 
      
    }, imageTransitionDuration);
    

  }
  
// TO DO: remove as everything with same model now.
  function updateImageAttribution(haiku) {
    const existingAttribution = document.querySelector('.image-attribution');
    if (existingAttribution) {
      existingAttribution.remove();
    }
    
    const attribution = document.createElement('div');
    attribution.className = 'image-attribution';
    attribution.textContent = `Generated by ${haiku.model || 'AI'}`;
    
    slideshowContainer.appendChild(attribution);
    
    setTimeout(() => {
      if (document.body.contains(attribution)) {
        attribution.style.opacity = '1'; 
      }
    }, 500);
  }
  

  function updateHaikuText(text) {
    haikuText.innerHTML = '';
    
    // Split haiku into lines
    const lines = text.split('\n');
    let allWords = [];
    
    lines.forEach(line => {
      const lineElement = document.createElement('div');
      lineElement.className = 'haiku-line';
      
      // Split line into words for animation
      const words = line.trim().split(' ');
      words.forEach(word => {
        if (word.trim() !== '') {
          const wordElement = document.createElement('span');
          wordElement.className = 'haiku-word'; 
          wordElement.textContent = word + ' '; 
          lineElement.appendChild(wordElement);
          allWords.push(wordElement);
        }
      });
      
      haikuText.appendChild(lineElement);
    });
    
    // Animate words with fade in
    animateWords(allWords);
  }
  
  function animateWords(words) {
    if (words.length === 0) return;    
    if (currentAnimation) {
        clearTimeout(currentAnimation);
    }

    // Calculate time per word so all words appear within the first 70% of slide duration
    // but maintain minimum delay 
    const animationDuration = slideDuration * 0.7;
    const timePerWord = Math.max(100, Math.min(600, animationDuration / words.length));
    
    let wordIndex = 0;
    
    function animateNextWord() {
      if (wordIndex < words.length) {
        // Add .visible class to trigger CSS transition
        words[wordIndex].classList.add('visible'); 
        wordIndex++;
        currentAnimation = setTimeout(animateNextWord, timePerWord);
      }
    }
    
    setTimeout(animateNextWord, 100); 
    // Start fade-out 1s before the actual transition begins
    setTimeout(() => {
      if (isPlaying) {
          fadeOutWords(); 
      }
    }, slideDuration - fadeOutDelay - 1000); 
  }
  

  function showLoading(show) {
    if (show) {
      loadingIndicator.classList.remove('hidden');
    } else {
      loadingIndicator.classList.add('hidden');
    }
  }
  

  function showNoContent(show) {
    if (show) {
      noContentMessage.classList.remove('hidden');
    } else {
      noContentMessage.classList.add('hidden');
    }
  }
  




  function startMusicOnInteraction() {
      if (audioStarted) return;

      console.log("User interaction detected, attempting to play music...");
      const playPromise = bgMusic.play();
      if (playPromise !== undefined) {
          playPromise.then(_ => {
              console.log("Background music started after interaction.");
              audioStarted = true; 

          }).catch(error => {
             // console.error("Error starting music after interaction:", error);
          });
      } else {
          audioStarted = true; 
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