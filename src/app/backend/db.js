const Database = require('better-sqlite3');
const db = new Database('./listings.db');
const { v4: uuidv4 } = require('uuid');

// Create database indices for better performance
function createIndices() {
  // Index for category filtering
  db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)").run()
  
  // Index for price sorting and filtering
  db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price)").run()
  
  // Index for date filtering and sorting
  db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_upload_date ON listings(uploadDate)").run()
  
  // Compound index for category and price (used in statistics)
  db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_category_price ON listings(category, price)").run()
  
  // Compound index for category and date (used in time-based statistics)
  db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_category_date ON listings(category, uploadDate)").run()
}

// Create table if it doesn't exist
db.pragma('foreign_keys = ON');

/*
db.prepare(`
    DROP TABLE IF EXISTS Listings;
`).run();


db.prepare(`
    DROP TABLE IF EXISTS Users;
`).run();
*/
db.prepare(`
    CREATE TABLE IF NOT EXISTS Users (
        username TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        rol TEXT NOT NULL
    );
`).run();

const insertUser = db.prepare(`
    INSERT OR IGNORE INTO Users (username, email, password, rol)
    VALUES (?, ?, ?, ?);
`);

db.prepare(`
    CREATE TABLE IF NOT EXISTS Listings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    location TEXT,
    uploadDate TEXT DEFAULT (date('now')),
    
    ownerId TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES Users(username)
    );
`).run();

module.exports = db;
