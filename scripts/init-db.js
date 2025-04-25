const sqlite = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Define the absolute path for the data directory and DB file
const dataDir = path.resolve(__dirname, '..', 'data'); // Go up one level from scripts/
const dbPath = path.join(dataDir, 'db.sqlite');

// Ensure the data directory exists
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }
} catch (err) {
  console.error('Error creating data directory:', err);
  process.exit(1); // Exit if directory can't be created
}

// Use the absolute path to open the database
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database at ${dbPath}:`, err.message);
    process.exit(1); // Exit if DB can't be opened
  }
  console.log(`Connected to database at ${dbPath}`);
});

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT NOT NULL,
    haiku TEXT NOT NULL,
    ai_image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`, (err) => {
  if (err) {
    console.error('Error creating table:', err);
    db.close(); 
    return;
  }
  // Check if ai_image_path column exists
  db.all("PRAGMA table_info(posts)", (pragmaErr, rows) => { // Use db.all for PRAGMA table_info
    if (pragmaErr) {
      console.error('Error checking table schema:', pragmaErr);
      db.close();
      return;
    }
    
    const hasAiImagePath = rows.some(row => row.name === 'ai_image_path');
    
    if (!hasAiImagePath) {
      console.log('Adding ai_image_path column to existing table...');
      db.exec('ALTER TABLE posts ADD COLUMN ai_image_path TEXT;', (alterErr) => {
        if (alterErr) {
          console.error('Error altering table:', alterErr);
        } else {
          console.log('Database schema updated successfully!');
        }
        db.close(); // Close after ALTER
      });
    } else {
      console.log('Database schema is up to date.');
      db.close(); // Close if up to date
    }
  });
});