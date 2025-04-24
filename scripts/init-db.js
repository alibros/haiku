const sqlite = require('sqlite3').verbose();
const db = new sqlite.Database('./data/db.sqlite');

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT NOT NULL,
    haiku TEXT NOT NULL,
    ai_image_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`, () => {
  // Check if ai_image_path column exists
  db.get("PRAGMA table_info(posts)", (err, rows) => {
    if (err) {
      console.error('Error checking table schema:', err);
      db.close();
      return;
    }
    
    // If the column doesn't exist in the existing table, add it
    let hasAiImagePath = false;
    
    if (Array.isArray(rows)) {
      hasAiImagePath = rows.some(row => row.name === 'ai_image_path');
    } else {
      // Single row result, check differently
      const tableInfo = rows || {};
      hasAiImagePath = tableInfo.name === 'ai_image_path';
    }
    
    if (!hasAiImagePath) {
      console.log('Adding ai_image_path column to existing table...');
      db.exec('ALTER TABLE posts ADD COLUMN ai_image_path TEXT;', (alterErr) => {
        if (alterErr) {
          console.error('Error altering table:', alterErr);
        } else {
          console.log('Database schema updated successfully!');
        }
        db.close();
      });
    } else {
      console.log('Database schema is up to date.');
      db.close();
    }
  });
});