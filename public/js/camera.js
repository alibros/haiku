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

  // Add tab button selections
  const cameraTab = document.getElementById('camera-tab');
  const uploadTab = document.getElementById('upload-tab');

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

  chooseCamera.addEventListener('click', () => selectMode('camera'));
  chooseUpload.addEventListener('click', () => selectMode('upload'));

  // Add event listeners for tabs
  cameraTab.addEventListener('click', () => setActiveTab('camera'));
  uploadTab.addEventListener('click', () => setActiveTab('upload'));

  // Function to handle initial mode selection
  function selectMode(mode) {
    initialChoice.classList.add('hidden');
    captureTabs.classList.remove('hidden'); // Show tabs
    actionButtons.classList.remove('hidden');
    setActiveTab(mode); // Set the active tab and view
  }

  // Function to set the active tab and view
  function setActiveTab(mode) {
    processingState.currentMode = mode;
    resetContentArea(); // Clear haiku/image when switching modes

    if (mode === 'camera') {
      cameraTab.classList.add('active');
      uploadTab.classList.remove('active');
      cameraView.classList.remove('hidden');
      uploadView.classList.add('hidden');
      snapButton.classList.remove('hidden');
      processUploadButton.classList.add('hidden');
      captureAgainButton.classList.add('hidden'); // Hide until capture/upload
      initCamera(); // Initialize camera when switching to this tab
      statusMessage.textContent = 'Camera ready. Capture a moment!';
    } else { // mode === 'upload'
      uploadTab.classList.add('active');
      cameraTab.classList.remove('active');
      uploadView.classList.remove('hidden');
      cameraView.classList.add('hidden');
      processUploadButton.classList.add('hidden'); // Hide until file selected
      snapButton.classList.add('hidden');
      captureAgainButton.classList.add('hidden'); // Hide until file selected
      stopCamera(); // Stop camera when switching away
      showUploadArea(); // Make sure the dropzone is visible
      statusMessage.textContent = 'Select an image or drop one here.';
    }
  }

  // --- Camera Functions --- 

  // Start camera
  async function initCamera() {
    // Stop existing stream first
    stopCamera(); 
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
      statusMessage.textContent = 'Error accessing camera. Try Upload?';
      alert("Could not access camera. Check permissions and ensure no other app is using it.");
    }
  }

  // Take snapshot
  snapButton.addEventListener('click', () => {
    // Draw image to canvas
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth; // Use actual video dimensions
    canvas.height = video.videoHeight; // Use actual video dimensions
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Hide video, show preview container
    video.classList.add('hidden');
    photoPreview.classList.remove('hidden'); // Show the container div
    
    // Add flash effect (flash div is inside photo-preview)
    const flash = photoPreview.querySelector('.capture-flash');
    flash.classList.add('flash-animation');
    setTimeout(() => flash.classList.remove('flash-animation'), 500);
    
    stopCamera(); // Stop camera stream
    processImage(canvas); // Process the canvas
    toggleCaptureState(true); // Update button visibility
  });

  // Capture again / Reset
  captureAgainButton.addEventListener('click', () => resetUI(true)); // Reset but keep mode

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

    changeImageButton.addEventListener('click', () => resetUI()); // Reset completely
  }

  function handleFileSelect(file) {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImage.src = e.target.result;
        uploadArea.classList.add('hidden'); // Hide drop zone
        uploadPreview.classList.remove('hidden'); // Show preview
        processUploadButton.classList.remove('hidden'); // Show process button
        captureAgainButton.classList.add('hidden'); // Ensure capture again is hidden
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
      toggleCaptureState(true); // Hide process, show capture again
      // processUploadButton.classList.add('hidden'); // This is handled by toggleCaptureState
      // captureAgainButton.classList.remove('hidden'); // This is handled by toggleCaptureState
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

  // Reset the entire UI
  function resetUI(keepMode = false) {
    stopCamera();
    resetContentArea();
    toggleCaptureState(false); // Reset button visibility first

    // Hide preview containers
    photoPreview.classList.add('hidden');
    uploadPreview.classList.add('hidden');
    
    // Always show video initially if camera mode is being reset to
    if (keepMode && processingState.currentMode === 'camera') {
        video.classList.remove('hidden'); 
    }

    // If resetting back to a chosen mode (keepMode = true)
    if (keepMode && processingState.currentMode) {
        initialChoice.classList.add('hidden');
        captureTabs.classList.remove('hidden');
        actionButtons.classList.remove('hidden');
        setActiveTab(processingState.currentMode); // This will show the correct view and initial button
        if (processingState.currentMode === 'upload') {
           showUploadArea(); // Ensure upload area is reset correctly
        }
    }
    // If resetting completely or no mode chosen yet
    else {
        processingState.currentMode = null; // Clear mode
        initialChoice.classList.remove('hidden');
        captureTabs.classList.add('hidden');
        actionButtons.classList.add('hidden');
        cameraView.classList.add('hidden');
        uploadView.classList.add('hidden');
        statusMessage.textContent = '';
    }
  }
  
  // Toggle Capture/Processing State Button Visibility
  function toggleCaptureState(isCapturedOrUploaded) {
      captureAgainButton.classList.toggle('hidden', !isCapturedOrUploaded);

      if (processingState.currentMode === 'camera') {
          snapButton.classList.toggle('hidden', isCapturedOrUploaded);
          processUploadButton.classList.add('hidden'); // Always hide process in camera mode
      } else if (processingState.currentMode === 'upload') {
          // Show process button ONLY if not captured/uploaded AND a file is selected (preview visible)
          const showProcess = !isCapturedOrUploaded && !uploadPreview.classList.contains('hidden');
          processUploadButton.classList.toggle('hidden', !showProcess);
          snapButton.classList.add('hidden'); // Always hide snap in upload mode
      } else {
          // If no mode selected yet, hide both
           snapButton.classList.add('hidden');
           processUploadButton.classList.add('hidden');
      }
  }

  // Helper function to show upload area
  function showUploadArea() {
      uploadArea.classList.remove('hidden');
      uploadPreview.classList.add('hidden');
      uploadedImage.src = ''; // Clear preview
      processUploadButton.classList.add('hidden');
      captureAgainButton.classList.add('hidden');
  }

  // Initial state setup
  setupUploadArea(); // Setup upload listeners always
  resetUI(); // Start in the initial choice state

});