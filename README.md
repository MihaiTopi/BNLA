# Borrowing and Lending Listings Platform - Technical Features

This document describes the key features implemented in the BNLA Listing Platform. The application uses an Angular frontend, a Node.js/Express backend, and a SQLite database (`better-sqlite3`).

---

## 1. Infinite Scroll

The infinite scroll feature loads content automatically as the user scrolls, instead of using standard pagination.

* **Frontend Component:** [listings-page.component.ts](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/listings-page/listings-page.component.ts)
* **API Service:** [listing.service.ts](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/listing.service/listing.service.ts)

### How It Works:
1. **Scroll Listener:** The `ListingsPageComponent` listens to scroll events using `@HostListener('window:scroll')`.
2. **Trigger Condition:** When the user scrolls near the bottom of the page (within 300px), it calls `loadMoreListings()`.
3. **Data Fetching:** The component requests the next page of results (e.g., `itemsPerPage = 20`) from the server.
4. **Data Appending:** New listings are added to the existing array:
   ```typescript
   this.paginatedListings = [...this.paginatedListings, ...response.data];
   ```
5. **Chart Updates:** The page-level charts are regenerated with the updated data.

---

## 2. Statistics and Aggregation

The application displays listings statistics through charts in the dashboard view.

* **Frontend Component:** [statistics-page.component.ts](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/statistics-page/statistics-page.component.ts)
* **Backend Endpoint:** `/api/statistics` in [server.js](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/backend/server.js)

### Processing Approaches:
* **Unoptimized (`/api/statistics-unoptimized`):** Sends the raw listings to the frontend, which loops through them to compute the statistics.
* **Optimized (`/api/statistics`):** Runs aggregation queries directly in SQLite and returns only the computed values to the frontend.
* **Charts Rendered (using Chart.js):**
  1. **Category Distribution:** Number of listings in each category.
  2. **Price Range Distribution:** Number of listings grouped by price ranges (under $50, $50-$199, and $200+) per category.
  3. **Average Price by Category:** Average price of listings in each category.

---

## 3. Database Indexing

Indexes are used to keep queries fast as the dataset grows.

* **Database File:** [db.js](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/backend/db.js)

### Created Indexes:
The `createIndices()` function runs at startup to create the following indexes on the `listings` table:

| Index Name | Column(s) | Purpose |
| :--- | :--- | :--- |
| `idx_listings_category` | `category` | Speeds up filtering by category |
| `idx_listings_price` | `price` | Speeds up sorting and filtering by price |
| `idx_listings_upload_date` | `uploadDate` | Speeds up sorting and filtering by date |
| `idx_listings_category_price` | `(category, price)` | Compound index used for category price statistics |
| `idx_listings_category_date` | `(category, uploadDate)` | Compound index used for monthly statistics |

---

## 4. Large Dataset Testing with Faker

To test how the system performs with a large database, we seed mock data if the database is empty.

* **Seeding Logic:** [server.js](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/backend/server.js)

### Seeding Details:
* **Faker Library:** Uses `@faker-js/faker` to generate fake user and listing details:
  * **Users:** Generates `100,000` users with random usernames, emails, and passwords.
  * **Listings:** Generates `100,000` listings with random titles, categories, prices, descriptions, and locations.
* **SQLite Transactions:** To speed up the insertion of 100,000 listings, the seeding script groups the inserts inside an SQLite transaction:
  ```javascript
  const insertMany = db.transaction((listings) => {
    for (const listing of listings) insertListing.run(listing)
  })
  ```
  This processes the entries in bulk to avoid long write times.

---

## 5. Offline Support and Synchronization

The application allows users to read and interact with listings even without an active internet connection.

* **Service:** [listing.service.ts](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/listing.service/listing.service.ts)

### Offline Capabilities:
* **Local Caching:** Incoming listings are saved to the browser's local storage (`cached_listings`). If the server is offline, the app loads these stored records.
* **Offline Action Queue:** If a user adds, edits, or deletes a listing while offline, the app saves the action into a local queue (`offline_listings_queue`).
* **Auto-Sync:** When the network connection is restored, the `syncOfflineChanges()` function runs in the background to send all queued actions to the backend database.

---

## 6. Listings CRUD Operations

Users can fully manage their personal listings.

* **Components:** [create-listings.component.ts](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/create-listings/create-listings.component.ts), [my-listings.component.ts](file:///c:/SmallChest/Faculta/ANUL%20II/BNLA-main/BNLA-main/src/app/my-listings/my-listings.component.ts)

### Capabilities:
* **Create:** Users can publish new item listings.
* **Read:** Users have a dedicated view for their own listings.
* **Update & Delete:** Users can edit or remove their existing listings.
