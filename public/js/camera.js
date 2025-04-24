document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const snapButton = document.getElementById('snap');
  const photoPreview = document.getElementById('photo-preview');
  const haikuPre = document.getElementById('haiku');
  const haikuLoading = document.getElementById('haiku-loading');
  const aiImage = document.getElementById('ai-image');
  const imageContainer = document.getElementById('image-container');
  const imageLoading = document.getElementById('image-loading');
  const statusMessage = document.getElementById('status-message');
  const captureAgainButton = document.getElementById('capture-again');
  
  // New elements for choice and views
  const initialChoice = document.getElementById('initial-choice');
  const chooseCamera = document.getElementById('choose-camera');
  const chooseUpload = document.getElementById('choose-upload');
  const cameraView = document.getElementById('camera-view');
  const uploadView = document.getElementById('upload-view');
  const actionButtons = document.getElementById('action-buttons');
  const captureTabs = document.getElementById('capture-tabs'); // Might remove later if not needed
  
  // Upload specific elements
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const uploadPreview = document.getElementById('upload-preview');
  const uploadedImage = document.getElementById('uploaded-image');
  const changeImageButton = document.getElementById('change-image');
  const processUploadButton = document.getElementById('process-upload');

  let stream = null; 
  let imageStatusInterval = null;
  
  // State tracking
  const processingState = {
    haikuReady: false,
    imageGenerating: false,
    imageReady: false,
    currentTaskId: null,
    currentMode: null // 'camera' or 'upload'
  };

  // --- Initial Setup --- 

  // Event listeners for initial choice
  chooseCamera.addEventListener('click', () => {
    initialChoice.classList.add('hidden');
    cameraView.classList.remove('hidden');
    actionButtons.classList.remove('hidden');
    snapButton.classList.remove('hidden'); // Show capture button
    processingState.currentMode = 'camera';
    initCamera(); // Initialize camera only when chosen
  });

  chooseUpload.addEventListener('click', () => {
    initialChoice.classList.add('hidden');
    uploadView.classList.remove('hidden');
    actionButtons.classList.remove('hidden');
    // processUploadButton needs to be shown when a file is selected
    processingState.currentMode = 'upload';
    setupUploadArea(); // Ensure upload listeners are active
  });

  // --- Camera Functions --- 

  // Start camera
  async function initCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      video.srcObject = stream;
      video.classList.remove('hidden');
      photoPreview.classList.add('hidden');
      snapButton.disabled = false;
      statusMessage.textContent = 'Camera ready. Capture a moment!';
    } catch (err) {
      console.error("Error accessing camera:", err);
      snapButton.disabled = true;
      statusMessage.textContent = 'Error accessing camera. Please ensure permissions are granted.';
      alert("Could not access camera. Check permissions and ensure no other app is using it.");
    }
  }

  // Take snapshot
  snapButton.addEventListener('click', () => {
    // Draw image to canvas
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Show preview, hide video
    video.classList.add('hidden');
    photoPreview.classList.remove('hidden');
    
    // Add flash effect
    const flash = photoPreview.querySelector('.capture-flash');
    flash.classList.add('flash-animation');
    setTimeout(() => flash.classList.remove('flash-animation'), 500);
    
    // Disable snap, enable capture again
    snapButton.classList.add('hidden');
    captureAgainButton.classList.remove('hidden');
    
    // Send image to server
    processImage(canvas);
    stopCamera();
  });

  // Capture again / Reset
  captureAgainButton.addEventListener('click', () => {
    resetUI();
    // Re-initialize camera if it was the chosen mode
    if (processingState.currentMode === 'camera') {
        initCamera(); 
    }
  });

  // Stop camera stream
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  // --- Upload Functions --- 

  function setupUploadArea() {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length) {
        handleFileSelect(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        handleFileSelect(e.target.files[0]);
      }
    });

    changeImageButton.addEventListener('click', () => {
      resetUI(); 
      // If we reset from upload, show upload view again
      if (processingState.currentMode === 'upload') {
         initialChoice.classList.add('hidden');
         uploadView.classList.remove('hidden');
         actionButtons.classList.remove('hidden');
      }
    });
  }

  function handleFileSelect(file) {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImage.src = e.target.result;
        uploadArea.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
        processUploadButton.classList.remove('hidden');
        captureAgainButton.classList.remove('hidden'); // Use this as the 'change' button
        statusMessage.textContent = 'Image ready to process.';
      }
      reader.readAsDataURL(file);
    } else {
      statusMessage.textContent = 'Please select a valid image file.';
      alert('Invalid file type. Please select an image.');
    }
  }

  processUploadButton.addEventListener('click', () => {
      processImage(uploadedImage);
      processUploadButton.classList.add('hidden');
      changeImageButton.classList.add('hidden'); // Hide change button during processing
  });
  
  // --- Common Functions --- 

  // Process the captured or uploaded image
  function processImage(imageSource) {
    // Reset any previous haiku/image data
    resetContentArea();
    
    // Show haiku loading indicator
    haikuLoading.classList.add('active');
    statusMessage.textContent = 'Processing your image...';
    
    if (imageSource instanceof HTMLCanvasElement) {
      // For camera capture, use the canvas blob
      imageSource.toBlob(async blob => {
        await sendImageToServer(blob);
      });
    } else if (imageSource instanceof HTMLImageElement) {
      // For uploaded image, fetch its blob data
      fetch(imageSource.src)
        .then(res => res.blob())
        .then(async blob => {
          await sendImageToServer(blob);
        })
        .catch(err => {
          console.error('Error processing uploaded image:', err);
          haikuLoading.classList.remove('active');
          statusMessage.textContent = 'Error processing image. Please try again.';
        });
    }
  }

  // Send image to server
  async function sendImageToServer(blob) {
    const form = new FormData();
    form.append('snapshot', blob, 'snapshot.jpg');
    
    try {
      // Send the image to get a haiku
      const res = await fetch('/upload', { method: 'POST', body: form });
      const data = await res.json();
      
      if (data.success) {
        // IMMEDIATELY display the haiku as soon as we have it
        haikuLoading.classList.remove('active');
        haikuPre.textContent = data.haiku;
        haikuPre.classList.add('visible');
        processingState.haikuReady = true;
        
        // Store the task ID for the image generation
        processingState.currentTaskId = data.taskId;
        
        // Show image loading spinner and container
        imageLoading.classList.add('active');
        imageContainer.classList.add('visible');
        statusMessage.textContent = 'Your haiku is ready! Generating visualization...';
        processingState.imageGenerating = true;
        
        // Start polling for image status
        startPollingImageStatus(data.taskId);
      } else {
         throw new Error(data.error || 'Failed to generate haiku');
      }
    } catch (err) {
      console.error('Error:', err);
      haikuLoading.classList.remove('active');
      haikuPre.textContent = 'Error generating haiku';
      haikuPre.classList.add('visible');
      statusMessage.textContent = `Something went wrong: ${err.message}. Please try again.`;
    }
  }

  // Start polling for image status
  function startPollingImageStatus(taskId) {
    // Clear any existing interval
    if (imageStatusInterval) {
      clearInterval(imageStatusInterval);
    }
    
    // Poll every 2 seconds
    imageStatusInterval = setInterval(async () => {
      try {
        const res = await fetch(`/image-status/${taskId}`);
        const data = await res.json();
        
        if (data.success && data.status === 'completed') {
          // Image is ready, display it
          displayGeneratedImage(data.aiImagePath);
          // Stop polling
          clearInterval(imageStatusInterval);
          imageStatusInterval = null;
        } else if (data.status === 'failed') {
           throw new Error(data.error || 'Image generation failed');
        }
      } catch (err) {
        console.error('Error checking image status:', err);
        imageLoading.classList.remove('active');
        statusMessage.textContent = `Error getting visualization: ${err.message}`; 
        // Stop polling on error
        clearInterval(imageStatusInterval);
        imageStatusInterval = null;
      }
    }, 2000);
  }

  // Display the generated image when it's ready
  function displayGeneratedImage(imagePath) {
    // When image is ready to display
    aiImage.onload = () => {
      imageLoading.classList.remove('active');
      aiImage.classList.remove('hidden');
      processingState.imageReady = true;
      statusMessage.textContent = 'Your haiku snapshot is complete!';
    };
    aiImage.onerror = () => {
       imageLoading.classList.remove('active');
       statusMessage.textContent = 'Error loading generated image.';
    }
    
    // Set the image source to load it
    aiImage.src = imagePath;
  }

  // Reset the haiku and image content areas only
  function resetContentArea() {
    // Reset only the content-related state
    processingState.haikuReady = false;
    processingState.imageGenerating = false;
    processingState.imageReady = false;
    processingState.currentTaskId = null;
    
    // Clear any existing polling
    if (imageStatusInterval) {
      clearInterval(imageStatusInterval);
      imageStatusInterval = null;
    }
    
    // Reset content UI elements
    haikuPre.textContent = '';
    haikuPre.classList.remove('visible');
    haikuLoading.classList.remove('active');
    
    aiImage.classList.add('hidden');
    aiImage.src = ''; // Clear image source
    imageContainer.classList.add('visible'); // Keep container visible but empty
    imageLoading.classList.remove('active');
  }

  // Reset the entire UI to initial state or chosen mode
  function resetUI() {
    stopCamera();
    resetContentArea();
    
    // Hide everything except the initial choice if no mode selected yet
    cameraView.classList.add('hidden');
    uploadView.classList.add('hidden');
    actionButtons.classList.add('hidden');
    snapButton.classList.add('hidden');
    processUploadButton.classList.add('hidden');
    captureAgainButton.classList.add('hidden');
    photoPreview.classList.add('hidden');
    uploadPreview.classList.add('hidden');
    uploadArea.classList.remove('hidden'); // Show upload area if resetting upload view

    statusMessage.textContent = '';

    // If a mode was previously chosen, go back to that mode's view
    if (processingState.currentMode === 'camera') {
      initialChoice.classList.add('hidden');
      cameraView.classList.remove('hidden');
      actionButtons.classList.remove('hidden');
      snapButton.classList.remove('hidden');
    } else if (processingState.currentMode === 'upload') {
      initialChoice.classList.add('hidden');
      uploadView.classList.remove('hidden');
      actionButtons.classList.remove('hidden');
      // Don't show process button until file selected
    } else {
      // If no mode set, go back to initial choice
      initialChoice.classList.remove('hidden');
    }
  }

  // Initial state setup - Do not start camera automatically
  // initCamera(); // REMOVED - Camera starts only on button click
  // setupUploadArea(); // Setup upload listeners regardless
  resetUI(); // Start in the initial choice state

});