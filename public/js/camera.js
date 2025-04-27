document.addEventListener('DOMContentLoaded', () => {
  // Get references to all needed DOM elements
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const snapButton = document.getElementById('snap');
  const photoPreview = document.getElementById('photo-preview'); // Container for canvas
  const haikuPre = document.getElementById('haiku');
  const haikuLoading = document.getElementById('haiku-loading');
  const aiImage = document.getElementById('ai-image');
  const imageContainer = document.getElementById('image-container');
  const imageLoading = document.getElementById('image-loading');
  const statusMessage = document.getElementById('status-message');
  const captureAgainButton = document.getElementById('capture-again');
  const initialChoice = document.getElementById('initial-choice');
  const chooseCamera = document.getElementById('choose-camera');
  const chooseUpload = document.getElementById('choose-upload');
  const cameraView = document.getElementById('camera-view');
  const uploadView = document.getElementById('upload-view');
  const actionButtons = document.getElementById('action-buttons');
  const captureTabs = document.getElementById('capture-tabs');
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const uploadPreview = document.getElementById('upload-preview');
  const uploadedImage = document.getElementById('uploaded-image');
  const changeImageButton = document.getElementById('change-image');
  const processUploadButton = document.getElementById('process-upload');
  const cameraTab = document.getElementById('camera-tab');
  const uploadTab = document.getElementById('upload-tab');

  let stream = null; 
  let imageStatusInterval = null;
  
  // Track the overall application state
  const processingState = {
    haikuReady: false,
    imageGenerating: false,
    imageReady: false,
    currentTaskId: null,
    currentMode: null 
  };

  //Event Listeners 
  chooseCamera.addEventListener('click', () => selectMode('camera'));
  chooseUpload.addEventListener('click', () => selectMode('upload'));
  cameraTab.addEventListener('click', () => setActiveTab('camera'));
  uploadTab.addEventListener('click', () => setActiveTab('upload'));
  captureAgainButton.addEventListener('click', () => resetUI(true)); 
  changeImageButton.addEventListener('click', () => resetUI()); 
  snapButton.addEventListener('click', takeSnapshot);
  processUploadButton.addEventListener('click', processUploadedImage);



  // Handle the initial camera/upload choice
  function selectMode(mode) {
    initialChoice.classList.add('hidden');
    captureTabs.classList.remove('hidden');
    actionButtons.classList.remove('hidden');
    setActiveTab(mode);
  }

  // Switch between camera and upload views using tabs
  function setActiveTab(mode) {
    processingState.currentMode = mode;
    resetContentArea(); 

    const isCameraMode = (mode === 'camera');
    cameraTab.classList.toggle('active', isCameraMode);
    uploadTab.classList.toggle('active', !isCameraMode);
    cameraView.classList.toggle('hidden', !isCameraMode);
    uploadView.classList.toggle('hidden', isCameraMode);
    toggleCaptureState(false); 

    if (isCameraMode) {
      initCamera(); 
      statusMessage.textContent = 'Camera ready. Capture a moment!';
    } else {
      stopCamera();
      showUploadArea(); 
      statusMessage.textContent = 'Select an image or drop one here.';
    }
  }


//This doesn't work as well on phones and I didn't have time to investigate why. Desktop UI is much nicer
  async function initCamera() {
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
    } catch (err) {
      console.error("Error accessing camera:", err);
      snapButton.disabled = true;
      statusMessage.textContent = 'Error accessing camera. Try Upload?';
      alert("Could not access camera. Check permissions or try uploading an image.");
    }
  }

  function takeSnapshot() {
    const context = canvas.getContext('2d');
    // Match canvas dimensions to the actual video stream size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    video.classList.add('hidden');
    photoPreview.classList.remove('hidden'); 
    
    // Flash effect
    const flash = photoPreview.querySelector('.capture-flash');
    flash.classList.add('flash-animation');
    setTimeout(() => flash.classList.remove('flash-animation'), 500);
    
    stopCamera();
    processImage(canvas); 
    toggleCaptureState(true);
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }


  function setupUploadArea() {
    // Drag and drop listeners
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
      if (files.length) handleFileSelect(files[0]);
    });
    // Click listener
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFileSelect(e.target.files[0]);
    });
  }

  function handleFileSelect(file) {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImage.src = e.target.result;
        uploadArea.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
        toggleCaptureState(false); 
        statusMessage.textContent = 'Image ready to process.';
      }
      reader.readAsDataURL(file);
    } else {
      statusMessage.textContent = 'Please select a valid image file.';
      alert('Invalid file type. Please select an image.');
    }
  }
  
  function processUploadedImage() {
    processImage(uploadedImage);
    toggleCaptureState(true);
  }

  function showUploadArea() {
      uploadArea.classList.remove('hidden');
      uploadPreview.classList.add('hidden');
      uploadedImage.src = '';
      toggleCaptureState(false); 
  }

  // Handle image data from either canvas or img element
  function processImage(imageSource) {
    resetContentArea();
    haikuLoading.classList.add('active');
    statusMessage.textContent = 'Processing your image...';
    
    if (imageSource instanceof HTMLCanvasElement) {
      imageSource.toBlob(sendImageToServer, 'image/jpeg'); 
    } else if (imageSource instanceof HTMLImageElement) {
      // Fetch blob data for the uploaded image before sending
      fetch(imageSource.src)
        .then(res => res.blob())
        .then(sendImageToServer)
        .catch(err => {
          console.error('Error fetching blob for uploaded image:', err);
          haikuLoading.classList.remove('active');
          statusMessage.textContent = 'Error processing image. Please try again.';
        });
    }
  }

  // Send image blob to the server
  async function sendImageToServer(blob) {
    if (!blob) {
        console.error("Blob data is missing.");
        statusMessage.textContent = 'Error preparing image data.';
        haikuLoading.classList.remove('active');
        return;
    }
    const form = new FormData();
    form.append('snapshot', blob, 'snapshot.jpg');
    
    try {
      const res = await fetch('/upload', { method: 'POST', body: form });
      const data = await res.json();
      
      if (data.success) {
        haikuLoading.classList.remove('active');
        haikuPre.textContent = data.haiku;
        haikuPre.classList.add('visible');
        processingState.haikuReady = true;
        processingState.currentTaskId = data.taskId;
        
        // Trigger AI image generation polling
        imageLoading.classList.add('active');
        imageContainer.classList.add('visible');
        statusMessage.textContent = 'Haiku ready! Generating visualization...';
        processingState.imageGenerating = true;
        startPollingImageStatus(data.taskId);
      } else {
         throw new Error(data.error || 'Failed to generate haiku');
      }
    } catch (err) {
      console.error('Upload/Haiku Error:', err);
      haikuLoading.classList.remove('active');
      haikuPre.textContent = 'Error generating haiku';
      haikuPre.classList.add('visible');
      statusMessage.textContent = `Haiku generation failed: ${err.message}. Try again.`;
      toggleCaptureState(true); 
    }
  }

  // Poll server for AI image generation status (see server.js)
  function startPollingImageStatus(taskId) {
    if (imageStatusInterval) clearInterval(imageStatusInterval);
    
    imageStatusInterval = setInterval(async () => {
      try {
        const res = await fetch(`/image-status/${taskId}`);
        const data = await res.json();
        
        if (data.success && data.status === 'completed') {
          displayGeneratedImage(data.aiImagePath);
          clearInterval(imageStatusInterval);
          imageStatusInterval = null;
        } else if (data.status === 'failed') {
           throw new Error(data.error || 'Image generation failed');
        }
        // Keep polling if status is still 'pending'
      } catch (err) {
        console.error('Polling Error:', err);
        imageLoading.classList.remove('active');
        statusMessage.textContent = `Visualization failed: ${err.message}`; 
        clearInterval(imageStatusInterval);
        imageStatusInterval = null;
        toggleCaptureState(true); 
      }
    }, 2500); 
  }

  // Load and display the generated AI image
  function displayGeneratedImage(imagePath) {
    aiImage.onload = () => {
      imageLoading.classList.remove('active');
      aiImage.classList.remove('hidden');
      processingState.imageReady = true;
      statusMessage.textContent = 'Snapshot complete!';
    };
    aiImage.onerror = () => {
       imageLoading.classList.remove('active');
       statusMessage.textContent = 'Error loading generated image.';
       toggleCaptureState(true);
    }
    aiImage.src = imagePath; 
  }

 

  // Clear the haiku and AI image areas
  function resetContentArea() {
    processingState.haikuReady = false;
    processingState.imageGenerating = false;
    processingState.imageReady = false;
    processingState.currentTaskId = null;
    if (imageStatusInterval) clearInterval(imageStatusInterval);
    
    haikuPre.textContent = '';
    haikuPre.classList.remove('visible');
    haikuLoading.classList.remove('active');
    aiImage.classList.add('hidden');
    aiImage.src = '';
    imageContainer.classList.add('visible'); 
    imageLoading.classList.remove('active');
  }

  // Reset the UI to the initial choice or the selected mode
  function resetUI(keepMode = false) {
    stopCamera();
    resetContentArea();
    toggleCaptureState(false); 

    photoPreview.classList.add('hidden');
    uploadPreview.classList.add('hidden');
    
    if (keepMode && processingState.currentMode === 'camera') {
        video.classList.remove('hidden'); 
    }

    if (keepMode && processingState.currentMode) {
        // Return to the selected mode (camera or upload)
        initialChoice.classList.add('hidden');
        captureTabs.classList.remove('hidden');
        actionButtons.classList.remove('hidden');
        setActiveTab(processingState.currentMode);
        // Special handling for upload mode reset
        if (processingState.currentMode === 'upload') {
           showUploadArea();
        }
    } else {
        // Reset to the very beginning (initial choice)
        processingState.currentMode = null;
        initialChoice.classList.remove('hidden');
        captureTabs.classList.add('hidden');
        actionButtons.classList.add('hidden');
        cameraView.classList.add('hidden');
        uploadView.classList.add('hidden');
        statusMessage.textContent = '';
    }
  }
  
  // Show/hide the correct action buttons based on mode and state
  function toggleCaptureState(isCapturedOrUploaded) {
      captureAgainButton.classList.toggle('hidden', !isCapturedOrUploaded);

      if (processingState.currentMode === 'camera') {
          snapButton.classList.toggle('hidden', isCapturedOrUploaded);
          processUploadButton.classList.add('hidden'); 
      } else if (processingState.currentMode === 'upload') {
          // Show process button only if an image is selected but not yet processed
          const showProcess = !isCapturedOrUploaded && !uploadPreview.classList.contains('hidden');
          processUploadButton.classList.toggle('hidden', !showProcess);
          snapButton.classList.add('hidden'); 
      } else {
          // Hide all main action buttons if no mode is selected
           snapButton.classList.add('hidden');
           processUploadButton.classList.add('hidden');
      }
  }

  setupUploadArea(); 
  resetUI(); 

});