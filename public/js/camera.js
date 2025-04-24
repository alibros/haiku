const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snapBtn = document.getElementById('snap');
const captureAgainBtn = document.getElementById('capture-again');
const photoPreview = document.getElementById('photo-preview');
const captureFlash = document.querySelector('.capture-flash');
const haikuPre = document.getElementById('haiku');
const aiImage = document.getElementById('ai-image');
const imageContainer = document.getElementById('image-container');
const statusMessage = document.getElementById('status-message');
const haikuLoading = document.getElementById('haiku-loading');
const imageLoading = document.getElementById('image-loading');

// New elements for file upload
const cameraTab = document.getElementById('camera-tab');
const uploadTab = document.getElementById('upload-tab');
const cameraView = document.getElementById('camera-view');
const uploadView = document.getElementById('upload-view');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const uploadedImage = document.getElementById('uploaded-image');
const uploadPreview = document.getElementById('upload-preview');
const changeImageBtn = document.getElementById('change-image');
const processUploadBtn = document.getElementById('process-upload');

// State tracking for process
let processingState = {
  captureComplete: false,
  uploadComplete: false,
  haikuReady: false,
  imageGenerating: false,
  imageReady: false,
  currentTaskId: null,
  activeTab: 'camera' // 'camera' or 'upload'
};

// For polling image status
let imageStatusInterval = null;
let mediaStream = null;

// Initialize camera
function initCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mediaStream = stream;
      video.srcObject = stream;
      statusMessage.textContent = 'Camera ready. Click capture to begin.';
    })
    .catch(err => {
      console.error('Camera error:', err);
      statusMessage.textContent = 'Camera not available. Try using the upload option.';
      // If camera fails, automatically switch to upload tab
      setActiveTab('upload');
    });
}

// Set active tab (camera or upload)
function setActiveTab(tabName) {
  processingState.activeTab = tabName;
  
  // Update tab buttons
  if (tabName === 'camera') {
    cameraTab.classList.add('active');
    uploadTab.classList.remove('active');
    cameraView.classList.remove('hidden');
    uploadView.classList.add('hidden');
    snapBtn.classList.remove('hidden');
    processUploadBtn.classList.add('hidden');
    
    // Make sure camera is initialized
    if (!video.srcObject && !mediaStream) {
      initCamera();
    } else if (mediaStream && !video.srcObject) {
      video.srcObject = mediaStream;
    }
  } else { // upload tab
    uploadTab.classList.add('active');
    cameraTab.classList.remove('active');
    uploadView.classList.remove('hidden');
    cameraView.classList.add('hidden');
    processUploadBtn.classList.remove('hidden');
    snapBtn.classList.add('hidden');
    
    // Pause camera if active
    if (video.srcObject) {
      video.srcObject = null;
    }
  }
}

// Initialize on page load
initCamera();

// Tab switching
cameraTab.addEventListener('click', () => setActiveTab('camera'));
uploadTab.addEventListener('click', () => setActiveTab('upload'));

// Capture photo button
snapBtn.addEventListener('click', () => {
  // Show camera flash effect
  showCaptureEffect();
  
  // Freeze the frame by drawing it to canvas
  freezeFrame();
  
  // Update UI for capture state
  toggleCaptureState(true);
  
  // Process the captured image
  processImage(canvas);
});

// Capture again button
captureAgainBtn.addEventListener('click', () => {
  // Reset the entire UI and state
  resetUI();
  
  if (processingState.activeTab === 'camera') {
    // Switch back to live camera
    toggleCaptureState(false);
    
    // Ensure camera is streaming
    if (!video.srcObject && mediaStream) {
      video.srcObject = mediaStream;
    } else if (!video.srcObject) {
      initCamera();
    }
  } else {
    // Reset upload view
    showUploadArea();
  }
});

// Process uploaded image
processUploadBtn.addEventListener('click', () => {
  if (!processingState.uploadComplete) {
    statusMessage.textContent = 'Please select an image first.';
    return;
  }
  
  // Process the uploaded image
  processImage(uploadedImage);
  
  // Hide the upload button and show capture again
  processUploadBtn.classList.add('hidden');
  captureAgainBtn.classList.remove('hidden');
});

// File input change handler
fileInput.addEventListener('change', handleFileSelect);

// Handle file selection
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file && file.type.match('image.*')) {
    displayUploadedImage(file);
  }
}

// Display uploaded image
function displayUploadedImage(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    uploadedImage.src = e.target.result;
    showUploadPreview();
    processingState.uploadComplete = true;
  };
  
  reader.readAsDataURL(file);
}

// Show upload preview
function showUploadPreview() {
  uploadArea.classList.add('hidden');
  uploadPreview.classList.remove('hidden');
}

// Show upload area
function showUploadArea() {
  uploadArea.classList.remove('hidden');
  uploadPreview.classList.add('hidden');
  processingState.uploadComplete = false;
}

// Change image button
changeImageBtn.addEventListener('click', (e) => {
  e.preventDefault();
  showUploadArea();
});

// Drag and drop support
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
  
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    handleFileSelect({target: {files: e.dataTransfer.files}});
  }
});

// Make the upload area clickable
uploadArea.addEventListener('click', () => {
  fileInput.click();
});

// Show camera flash effect
function showCaptureEffect() {
  captureFlash.classList.add('flash-animation');
  
  // Remove the animation class after it completes
  setTimeout(() => {
    captureFlash.classList.remove('flash-animation');
  }, 500);
}

// Freeze the frame in the canvas
function freezeFrame() {
  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Draw the current video frame to the canvas
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
}

// Toggle between live camera and captured photo states
function toggleCaptureState(captured) {
  if (captured) {
    // Show photo preview, hide video
    photoPreview.classList.remove('hidden');
    snapBtn.classList.add('hidden');
    captureAgainBtn.classList.remove('hidden');
  } else {
    // Show video, hide photo preview
    photoPreview.classList.add('hidden');
    snapBtn.classList.remove('hidden');
    captureAgainBtn.classList.add('hidden');
  }
}

// Process the captured or uploaded image
function processImage(imageSource) {
  // Reset any previous haiku/image data
  resetContentArea();
  
  // Show haiku loading indicator
  haikuLoading.classList.add('active');
  statusMessage.textContent = 'Processing your image...';
  
  if (imageSource === canvas) {
    // For camera capture, use the canvas blob
    canvas.toBlob(async blob => {
      await sendImageToServer(blob);
    });
  } else {
    // For uploaded image, fetch it first
    fetch(uploadedImage.src)
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
      statusMessage.textContent = 'Your haiku is ready!';
      processingState.imageGenerating = true;
      
      // Start polling for image status
      startPollingImageStatus(data.taskId);
    }
  } catch (err) {
    console.error('Error:', err);
    haikuLoading.classList.remove('active');
    haikuPre.textContent = 'Error generating haiku';
    haikuPre.classList.add('visible');
    statusMessage.textContent = 'Something went wrong. Please try again.';
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
      }
    } catch (err) {
      console.error('Error checking image status:', err);
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
  imageContainer.classList.remove('visible');
  imageLoading.classList.remove('active');
}

// Reset the entire UI and state
function resetUI() {
  // Reset state
  processingState = {
    captureComplete: false,
    uploadComplete: false,
    haikuReady: false,
    imageGenerating: false,
    imageReady: false,
    currentTaskId: null,
    activeTab: processingState.activeTab // preserve active tab
  };
  
  // Reset content area
  resetContentArea();
  
  // Reset status message
  statusMessage.textContent = processingState.activeTab === 'camera' 
    ? 'Camera ready. Click capture to begin.' 
    : 'Select an image to begin.';
    
  // For upload tab, reset upload state
  if (processingState.activeTab === 'upload') {
    showUploadArea();
    processUploadBtn.classList.remove('hidden');
    captureAgainBtn.classList.add('hidden');
  }
}