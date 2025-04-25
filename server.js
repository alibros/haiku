require('dotenv').config({ path: '.env.local' }); // Load .env.local

const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { OpenAI } = require('openai');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Define the absolute path for the data directory and DB file
const dataDir = path.resolve(__dirname, 'data'); // Relative to server.js
const dbPath = path.join(dataDir, 'db.sqlite');

// Ensure the data directory exists (optional here if init-db runs first, but safe)
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }
} catch (err) {
  console.error('Error creating data directory:', err);
  // Don't necessarily exit here, maybe the DB open will fail gracefully
}

// Use the absolute path to open the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database at ${dbPath}:`, err.message);
    // Handle error appropriately, e.g., don't start server or exit
    process.exit(1);
  }
  console.log(`Connected to database at ${dbPath}`);
});

// Ensure API key is loaded before initializing OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("Error: OPENAI_API_KEY not found in environment variables.");
    process.exit(1); // Exit if API key is missing
}
const openai = new OpenAI({ apiKey: apiKey });
console.log('OpenAI Client Initialized'); // Confirmation log

// Map to store pending image generation tasks
const pendingTasks = new Map();

// Static files
app.use(express.static('public'));
app.use('/views', express.static('views'));

// Multer config
const storage = multer.diskStorage({
  destination: 'public/images',
  filename: (_, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });



// Serve pages
app.get('/', (_, res) => res.sendFile(path.resolve('views/index.html')));
app.get('/gallery', (_, res) => res.sendFile(path.resolve('views/gallery.html')));
app.get('/ai-slideshow', (_, res) => res.sendFile(path.resolve('views/ai-slideshow.html')));

// Upload & haiku generation - now returns haiku immediately
app.post("/upload", upload.single("snapshot"), async (req, res) => {
    try {
      // 1. Read & encode image
      const filename = req.file.filename;
      const imagePath = path.resolve("public/images", filename);
      const base64Image = fs.readFileSync(imagePath, "base64");
  
      // 2. Send to OpenAI as mixed input for haiku generation
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text",  text: "Write a concise 5-7-5 haiku about this image." },
              { type: "input_image", image_url: `data:image/jpeg;base64,${base64Image}` }
            ]
          }
        ]
      });
  
      const haiku = response.output_text.trim();
      const imageBasePrompt = "create a beautiful and poetic abstract image based on this haiku, do not include any text in the image. Haiku: " + haiku;
      
      // Generate a unique ID for this task
      const taskId = Date.now().toString();
      
      // Store image path and haiku in the map for later processing
      pendingTasks.set(taskId, {
        imagePath: `/images/${filename}`,
        imageBasePrompt,
        haiku,
        status: 'pending'
      });
      
      // Start image generation in the background without waiting for it to complete
      generateImage(taskId);
      
      // 3. Return the haiku and task ID immediately
      res.json({ 
        success: true, 
        haiku, 
        taskId
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
});

// Check status of AI image generation
app.get("/image-status/:taskId", (req, res) => {
  const taskId = req.params.taskId;
  const task = pendingTasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ success: false, error: "Task not found" });
  }
  
  if (task.status === 'completed') {
    // Return completed image data
    res.json({
      success: true,
      status: 'completed',
      aiImagePath: task.aiImagePath
    });
    
    // Clean up the task from the map
    pendingTasks.delete(taskId);
  } else {
    // Return pending status
    res.json({
      success: true,
      status: 'pending'
    });
  }
});

// Function to generate image in the background
async function generateImage(taskId) {
  try {
    const task = pendingTasks.get(taskId);
    if (!task) return;
    
    // Generate image from haiku
    const aiImageData = await openai.images.generate({
      model: "gpt-image-1",
      prompt: task.imageBasePrompt,
      n: 1,
      quality: "medium",
      size: "1024x1024"
    });
    
    // Save the AI-generated image
    const aiImageFilename = `ai_${Date.now()}.png`;
    const aiImagePath = path.resolve("public/images", aiImageFilename);
    const imageBuffer = Buffer.from(aiImageData.data[0].b64_json, "base64");
    await fsPromises.writeFile(aiImagePath, imageBuffer);
    
    // Store path to AI image
    const aiImageRelativePath = `/images/${aiImageFilename}`;
    
    // Persist to SQLite with both images
    db.run(
      `INSERT INTO posts (image_path, haiku, ai_image_path) VALUES (?, ?, ?)`,
      [task.imagePath, task.haiku, aiImageRelativePath]
    );
    
    // Update task status to completed
    pendingTasks.set(taskId, {
      ...task,
      status: 'completed',
      aiImagePath: aiImageRelativePath
    });
  } catch (error) {
    console.error("Error generating image:", error);
    // Mark the task as failed
    const task = pendingTasks.get(taskId);
    if (task) {
      pendingTasks.set(taskId, {
        ...task,
        status: 'failed',
        error: error.message
      });
    }
  }
}

// Stream latest posts
app.get('/stream', (_, res) => {
  db.all(
    'SELECT image_path, haiku, ai_image_path, created_at FROM posts ORDER BY created_at DESC LIMIT 20',
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, posts: rows });
    }
  );
});

// API endpoint for AI-generated haikus with images
app.get('/api/ai-haikus', (_, res) => {
  db.all(
    'SELECT haiku, ai_image_path, created_at FROM posts WHERE ai_image_path IS NOT NULL ORDER BY created_at DESC LIMIT 20',
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      
      const haikus = rows.map(row => ({
        text: row.haiku,
        imageUrl: row.ai_image_path,
        prompt: `Created from haiku: "${row.haiku}"`,
        model: 'OpenAI'
      }));
      
      res.json({ success: true, haikus });
    }
  );
});

// Start
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));