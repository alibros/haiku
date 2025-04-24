const sqlite = require('sqlite3').verbose();
const db = new sqlite.Database('./data/db.sqlite');

console.log('Flushing database...');

// Delete all records from the posts table
db.run('DELETE FROM posts', function(err) {
  if (err) {
    console.error('Error flushing database:', err);
  } else {
    console.log(`Successfully deleted ${this.changes} records from the database.`);
  }
  
  // Close the database connection
  db.close();
}); 