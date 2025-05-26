const express = require("express")
const cors = require("cors")
const app = express()
const os = require("os")
const PORT = 3000
const uuid = require("uuid")
const { faker } = require("@faker-js/faker")
const db = require("./db")

// Logic for when hosting on local network
const getLocalIP = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i.family === "IPv4" && !i.internal)?.address || "localhost"

const LOCAL_IP = getLocalIP()

app.listen(PORT, LOCAL_IP, () => {
  console.log(`Server running at http://${LOCAL_IP}:${PORT}`)
})

app.use(cors())
app.use(express.json())

const idCounter = 1
const listings = []

const allowedCategories = [
  "Home",
  "Garden",
  "Education",
  "Vehicles",
  "Technology",
  "Computers",
  "Clothing",
  "Sports",
  "Electronics",
  "Outdoors",
]

// Create database indices for better performance
function createIndices() {
  try {
    // Index for category filtering 
    db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)").run()

    // Index for price sorting and filtering
    db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price)").run()

    // Index for date filtering and sorting
    db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_upload_date ON listings(uploadDate)").run()

    // Compound index for category and price (for statistics)
    db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_category_price ON listings(category, price)").run()

    // Compound index for category and date (for statistics)
    db.prepare("CREATE INDEX IF NOT EXISTS idx_listings_category_date ON listings(category, uploadDate)").run()

    console.log("Database indices created successfully")
  } catch (error) {
    console.error("Error creating indices:", error)
  }
}

// Unoptimized endpoint that returns raw listings
  app.get("/api/statistics-unoptimized", (req, res) => {
  console.log("Unoptimized statistics endpoint called");
  
  try {
    // Check if database is accessible
    const dbCheck = db.prepare("SELECT 1 as test").get();
    console.log("Database connection check:", dbCheck);
    
    // Check if listings table exists and has data
    const countResult = db.prepare("SELECT COUNT(*) as count FROM listings").get();
    console.log(`Found ${countResult.count} listings in database`);
    
    if (countResult.count === 0) {
      console.log("No listings found in database");
      return res.json({
        data: [],
        meta: {
          executionTime: "unoptimized",
          approach: "client-side processing",
          error: "No listings in database"
        }
      });
    }
    
    // Get a sample of listings (limit to 1000 to avoid overwhelming the client)
    const listings = db.prepare("SELECT * FROM listings LIMIT 1000").all();
    console.log(`Returning ${listings.length} listings for client-side processing`);
    
    // Add CORS headers explicitly for this endpoint
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    
    res.json({
      data: listings,
      meta: {
        executionTime: "unoptimized",
        approach: "client-side processing",
        count: listings.length
      }
    });
  } catch (error) {
    console.error("Error in unoptimized statistics endpoint:", error);
    res.status(500).json({ 
      error: "Server error", 
      message: error.message,
      stack: error.stack 
    });
  }
});

// Call this function to create indices
createIndices()

const existingCount = db.prepare("SELECT COUNT(*) AS count FROM listings").get().count

const userInsert = db.prepare(`
  INSERT OR IGNORE INTO Users (username, email, password, rol)
  VALUES (@username, @email, @password, @rol)
`)

// Seeding users with Faker if database is empty
if (existingCount === 0) {
  const numUsers = 1000 // Set the number of users to add

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO Users (username, email, password, rol)
    VALUES (?, ?, ?, ?)
  `)

  for (let i = 0; i < numUsers; i++) {
    const username = faker.internet.userName()
    const email = faker.internet.email()
    const password = faker.internet.password()
    const rol = "user" // Default user role

    insertUser.run(username, email, password, rol)
  }

  console.log(`${numUsers} users added.`)
}

const existingListingsCount = db.prepare("SELECT COUNT(*) AS count FROM listings").get().count

// Seeding listings with Faker if database is empty
if (existingListingsCount === 0) {
  const numListings = 1000

  const insertListing = db.prepare(`
    INSERT OR IGNORE INTO listings (id, title, category, price, description, ownerId, uploadDate, location)
    VALUES (@id, @title, @category, @price, @description, @ownerId, @uploadDate, @location)
  `)

  const insertMany = db.transaction((listings) => {
    for (const listing of listings) insertListing.run(listing)
  })

  // Fetch real usernames from Users table
  const users = db.prepare(`SELECT username FROM Users`).all()
  const usernames = users.map((u) => u.username)

  const seedListings = []

  for (let i = 0; i < numListings; i++) {
    const id = uuid.v4()
    const title = faker.commerce.productName()
    const category = faker.helpers.arrayElement(allowedCategories)
    const price = faker.number.int({ min: 10, max: 500 })
    const description = faker.commerce.productDescription()
    const ownerId = faker.helpers.arrayElement(usernames) // Random real user
    const uploadDate = faker.date.past({ years: 2 }).toISOString().split("T")[0]
    const location = faker.location.city()

    seedListings.push({
      id,
      title,
      category,
      price,
      description,
      ownerId,
      uploadDate,
      location,
    })
  }

  insertMany(seedListings)
  console.log(`${numListings} listings added.`)
}

function validateListing(data) {
  if (typeof data.title !== "string") return "Title must be a string."
  if (!allowedCategories.includes(data.category)) return `Category must be one of: ${allowedCategories.join(", ")}.`
  if (!Number.isInteger(data.price)) return "Price must be an integer."
  if (typeof data.description !== "string") return "Description must be a string."
  if (typeof data.ownerId !== "string") return "ownerId must be a string."
  if (typeof data.uploadDate !== "string") return "Upload date must be a string."
  if (typeof data.location !== "string") return "Location must be a string."
  return null
}

// Routes

app.get("/api/listings", (req, res) => {
  const { page = 1, limit = 10, category = "", sortBy = "price", sortOrder = "asc" } = req.query

  // Convert to numbers
  const pageNum = Number.parseInt(page, 10)
  const limitNum = Number.parseInt(limit, 10)

  // Calculate offset
  const offset = (pageNum - 1) * limitNum

  // Build the query
  let countQuery = "SELECT COUNT(*) as total FROM listings"
  let query = "SELECT * FROM listings"

  // Add category filter if provided
  const params = []
  if (category) {
    countQuery += " WHERE category = ?"
    query += " WHERE category = ?"
    params.push(category)
  }

  // Add sorting
  const validSortFields = ["price", "uploadDate", "title"]
  const validSortOrders = ["asc", "desc"]

  const sortField = validSortFields.includes(sortBy) ? sortBy : "price"
  const order = validSortOrders.includes(sortOrder) ? sortOrder : "asc"

  query += ` ORDER BY ${sortField} ${order}`

  // Add pagination
  if (limitNum > 0) {
    query += " LIMIT ? OFFSET ?"
    params.push(limitNum, offset)
  }

  try {
    // Get total count
    const countParams = category ? [category] : []
    const totalCount = db.prepare(countQuery).get(...countParams).total

    // Get paginated data
    const listings = db.prepare(query).all(...params)

    // Calculate total pages
    const totalPages = limitNum > 0 ? Math.ceil(totalCount / limitNum) : 1

    res.json({
      data: listings,
      meta: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
      },
    })
  } catch (error) {
    console.error("Database error:", error)
    res.status(500).json({ error: "Database error" })
  }
})

// NEW OPTIMIZED STATISTICS ENDPOINT
app.get("/api/statistics", (req, res) => {
  const startTime = Date.now()

  try {
    // 1. Category Distribution - Using direct SQL aggregation
    const categoryStats = db
      .prepare(`
      SELECT category, COUNT(*) as count
      FROM listings
      GROUP BY category
      ORDER BY count DESC
    `)
      .all()

    // 2. Price Range Distribution - Using SQL for price ranges
    const priceRangeStats = db
      .prepare(`
      SELECT 
        category,
        SUM(CASE WHEN price < 50 THEN 1 ELSE 0 END) as low_price,
        SUM(CASE WHEN price >= 50 AND price < 200 THEN 1 ELSE 0 END) as medium_price,
        SUM(CASE WHEN price >= 200 THEN 1 ELSE 0 END) as high_price
      FROM listings
      GROUP BY category
    `)
      .all()

    // 3. Monthly Listings - Using SQL date functions
    // Extract year and month from uploadDate
    const monthlyStats = db
      .prepare(`
      SELECT 
        substr(uploadDate, 1, 7) as month,
        category,
        COUNT(*) as count
      FROM listings
      WHERE uploadDate >= date('now', '-12 months')
      GROUP BY month, category
      ORDER BY month ASC
    `)
      .all()

    // 4. Location-based statistics
    const locationStats = db
      .prepare(`
      SELECT location, COUNT(*) as count
      FROM listings
      GROUP BY location
      ORDER BY count DESC
      LIMIT 10
    `)
      .all()

    // 5. Average price by category
    const avgPriceByCategory = db
      .prepare(`
      SELECT category, AVG(price) as avg_price
      FROM listings
      GROUP BY category
      ORDER BY avg_price DESC
    `)
      .all()

    const endTime = Date.now()
    const executionTime = endTime - startTime

    res.json({
      categoryStats,
      priceRangeStats,
      monthlyStats,
      locationStats,
      avgPriceByCategory,
      meta: {
        executionTime: executionTime + "ms",
      },
    })
  } catch (error) {
    console.error("Error fetching statistics:", error)
    res.status(500).json({ error: "Error generating statistics" })
  }
})

app.post("/api/listings", (req, res) => {
  const data = req.body

  const error = validateListing(data)
  if (error) return res.status(400).json({ error })

  const newListing = {
    id: uuid.v4(),
    ...data,
  }

  db.prepare(`
    INSERT OR IGNORE INTO listings (id, title, category, price, description, ownerId, uploadDate, location)
    VALUES (@id, @title, @category, @price, @description, @ownerId, @uploadDate, @location)
  `).run(newListing)

  res.status(201).json(newListing)
})

app.put("/api/listings/:id", (req, res) => {
  const id = req.params.id
  const existing = db.prepare("SELECT * FROM listings WHERE id = ?").get(id)

  if (!existing) {
    return res.status(404).json({ message: "Listing not found" })
  }

  const updated = { ...existing, ...req.body }

  db.prepare(`
    UPDATE listings SET
      title = @title,
      category = @category,
      price = @price,
      description = @description,
      ownerId = @ownerId,
      uploadDate = @uploadDate,
      location = @location
    WHERE id = @id
  `).run(updated)

  res.status(200).json(updated)
})

app.delete("/api/listings/:id", (req, res) => {
  const { changes } = db.prepare("DELETE FROM listings WHERE id = ?").run(req.params.id)
  if (changes === 0) {
    return res.status(404).json({ message: "Listing not found" })
  }
  res.status(204).send()
})

// Add this to your server.js file
app.get("/api/listings/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
})

module.exports = app
