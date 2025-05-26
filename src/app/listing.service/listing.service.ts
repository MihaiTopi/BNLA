import { HttpClient, type HttpErrorResponse, HttpParams } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { Observable, of, catchError, BehaviorSubject, map } from "rxjs"
import type { Listing } from "../models/listing.model"
import { v4 as uuidv4 } from "uuid"

interface QueueItem {
  type: "add" | "update" | "delete"
  data: Listing | string // Listing for add/update, string (id) for delete
  timestamp: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
  }
}

export interface CategoryStat {
  category: string
  count: number
}

// Update the PriceRangeStats interface to match how it's used in the component
export interface PriceRangeStats {
  category: string
  low_price: number
  medium_price: number
  high_price: number
}

// If there's another definition of PriceRangeStats elsewhere in the file that looks like this:
// export interface PriceRangeStats {
//   minPrice: number;
//   maxPrice: number;
//   count: number;
// }
// Replace it with the definition above.

export interface MonthlyStat {
  month: string
  category: string
  count: number
}

export interface LocationStat {
  location: string
  count: number
}

export interface AvgPriceStat {
  category: string
  avg_price: number
}

export interface StatisticsResponse {
  categoryStats: CategoryStat[]
  priceRangeStats: PriceRangeStats[]
  monthlyStats: MonthlyStat[]
  locationStats: LocationStat[]
  avgPriceByCategory: AvgPriceStat[]
  meta: {
    executionTime: string
  }
}

@Injectable({
  providedIn: "root",
})
export class ListingService {
  //private apiUrl = 'http://192.168.64.129:3000/api/listings';
  private apiUrl = "http://26.183.81.226:3000/api/listings"
  private statsUrl = "http://26.183.81.226:3000/api/statistics" // change here to statistics-unoptimized to see difference

  // Track network and server status internally
  private isOfflineSubject = new BehaviorSubject<boolean>(false)
  private isServerDownSubject = new BehaviorSubject<boolean>(false)
  private syncInProgressSubject = new BehaviorSubject<boolean>(false)

  private offlineQueue: QueueItem[] = []
  private readonly QUEUE_STORAGE_KEY = "offline_listings_queue"

  constructor(private http: HttpClient) {
    // Load queue from localStorage on service initialization
    this.loadQueueFromStorage()

    this.checkServerAndSync()
  }

  // Check server and sync if possible
  private checkServerAndSync() {
    if (this.isOfflineSubject.value) return

    // Simple ping to check server status
    this.http
      .get<any>(`${this.apiUrl}/ping`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.isServerDownSubject.next(true)
          return of(null)
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.isServerDownSubject.next(false)
          this.syncOfflineChanges().subscribe()
        }
      })
  }

  // Get optimized statistics from server
  getStatistics(): Observable<StatisticsResponse> {
    return this.http.get<any>(this.statsUrl).pipe(
      map((response) => {
        // Check if we received listings data instead of statistics
        if (response.data && Array.isArray(response.data)) {
          console.log("Received listings data, transforming to statistics format")
          return this.generateStatisticsFromListings(response.data)
        }

        // If we already have the correct format, return it
        if (response.categoryStats) {
          return response
        }

        // If we don't recognize the format, return empty statistics
        console.warn("Unrecognized data format:", response)
        return {
          categoryStats: [],
          priceRangeStats: [],
          monthlyStats: [],
          locationStats: [],
          avgPriceByCategory: [],
          meta: { executionTime: "0ms" },
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error("Error fetching statistics:", error)
        return of({
          categoryStats: [],
          priceRangeStats: [],
          monthlyStats: [],
          locationStats: [],
          avgPriceByCategory: [],
          meta: { executionTime: "0ms" },
        })
      }),
    )
  }

  // Add this method to transform listings data into statistics format
  generateStatisticsFromListings(listings: Listing[]): StatisticsResponse {
    console.log("Generating statistics from", listings.length, "listings")

    // 1. Category Distribution
    const categoryMap = new Map<string, number>()
    listings.forEach((listing) => {
      const count = categoryMap.get(listing.category) || 0
      categoryMap.set(listing.category, count + 1)
    })

    const categoryStats = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }))

    // 2. Price Range Distribution
    const priceRangeMap = new Map<string, { low_price: number; medium_price: number; high_price: number }>()

    listings.forEach((listing) => {
      const category = listing.category
      if (!priceRangeMap.has(category)) {
        priceRangeMap.set(category, { low_price: 0, medium_price: 0, high_price: 0 })
      }

      const ranges = priceRangeMap.get(category)!
      if (listing.price < 50) {
        ranges.low_price++
      } else if (listing.price < 200) {
        ranges.medium_price++
      } else {
        ranges.high_price++
      }
    })

    const priceRangeStats = Array.from(priceRangeMap.entries()).map(([category, ranges]) => ({
      category,
      ...ranges,
    }))

    // 3. Monthly Listings
    const monthlyMap = new Map<string, Map<string, number>>()

    listings.forEach((listing) => {
      const month = listing.uploadDate.substring(0, 7) // YYYY-MM format
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, new Map<string, number>())
      }

      const categoryMap = monthlyMap.get(month)!
      const count = categoryMap.get(listing.category) || 0
      categoryMap.set(listing.category, count + 1)
    })

    const monthlyStats: { month: string; category: string; count: number }[] = []
    monthlyMap.forEach((categoryMap, month) => {
      categoryMap.forEach((count, category) => {
        monthlyStats.push({ month, category, count })
      })
    })

    // 4. Location-based statistics
    const locationMap = new Map<string, number>()
    listings.forEach((listing) => {
      const count = locationMap.get(listing.location) || 0
      locationMap.set(listing.location, count + 1)
    })

    const locationStats = Array.from(locationMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 5. Average price by category
    const categoryPrices = new Map<string, number[]>()
    listings.forEach((listing) => {
      if (!categoryPrices.has(listing.category)) {
        categoryPrices.set(listing.category, [])
      }
      categoryPrices.get(listing.category)!.push(listing.price)
    })

    const avgPriceByCategory = Array.from(categoryPrices.entries()).map(([category, prices]) => {
      const sum = prices.reduce((acc, price) => acc + price, 0)
      return {
        category,
        avg_price: prices.length > 0 ? sum / prices.length : 0,
      }
    })

    return {
      categoryStats,
      priceRangeStats,
      monthlyStats,
      locationStats,
      avgPriceByCategory,
      meta: {
        executionTime: "client-side calculation",
      },
    }
  }

  // Get paginated listings with server-side filtering and sorting
  getListingsPage(
    page = 1,
    limit = 10,
    category = "",
    sortBy = "price",
    sortOrder: "asc" | "desc" = "asc",
  ): Observable<PaginatedResponse<Listing>> {
    // If offline or server down, return cached listings with client-side pagination
    if (this.isOfflineSubject.value || this.isServerDownSubject.value) {
      return this.getOfflinePaginatedListings(page, limit, category, sortBy, sortOrder)
    }

    // Build query parameters
    let params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString())
      .set("sortBy", sortBy)
      .set("sortOrder", sortOrder)

    if (category) {
      params = params.set("category", category)
    }

    // Make the API request with parameters
    return this.http.get<PaginatedResponse<Listing>>(this.apiUrl, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error("Error fetching paginated listings", error)
        // Fall back to offline mode if server request fails
        this.isServerDownSubject.next(true)
        return this.getOfflinePaginatedListings(page, limit, category, sortBy, sortOrder)
      }),
    )
  }

  // Fallback method for offline pagination using cached data
  private getOfflinePaginatedListings(
    page: number,
    limit: number,
    category: string,
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): Observable<PaginatedResponse<Listing>> {
    const cachedData = localStorage.getItem("cached_listings")
    let listings: Listing[] = cachedData ? JSON.parse(cachedData) : []

    // Apply filters and sorting client-side
    if (category) {
      listings = listings.filter((listing) => listing.category === category)
    }

    // Apply sorting
    listings.sort((a: any, b: any) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      if (sortBy === "uploadDate") {
        const dateA = new Date(aValue).getTime()
        const dateB = new Date(bValue).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      }

      if (typeof aValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      }

      // String comparison
      const comparison = aValue.localeCompare(bValue)
      return sortOrder === "asc" ? comparison : -comparison
    })

    // Apply pagination
    const totalCount = listings.length
    const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 1
    const startIndex = (page - 1) * limit
    const paginatedData = limit > 0 ? listings.slice(startIndex, startIndex + limit) : listings

    return of({
      data: paginatedData,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    })
  }

  // Legacy method for backward compatibility
  getListings(): Observable<Listing[]> {
    return this.getListingsPage(1, 0).pipe(
      catchError((error) => {
        console.error("Error in getListings:", error)
        return of({ data: [], meta: { currentPage: 1, totalPages: 0, totalCount: 0, limit: 0 } })
      }),
      // Extract just the data array to maintain backward compatibility
      map((response: PaginatedResponse<Listing>) => response.data),
    )
  }

  addListing(listing: Listing): Observable<Listing> {
    if (!listing.id) listing.id = uuidv4()

    // If offline or server down, queue for later
    if (this.isOfflineSubject.value || this.isServerDownSubject.value) {
      this.addToQueue({ type: "add", data: listing })
      this.updateLocalCache(listing, "add")
      return of(listing)
    }

    return this.http.post<Listing>(this.apiUrl, listing).pipe(
      catchError((error: HttpErrorResponse) => {
        // Queue for later
        this.addToQueue({ type: "add", data: listing })
        this.updateLocalCache(listing, "add")

        console.warn("Operation queued for later", listing)
        return of(listing) // Return optimistic result
      }),
    )
  }

  updateListing(listing: Listing): Observable<Listing> {
    if (this.isOfflineSubject.value || this.isServerDownSubject.value) {
      this.addToQueue({ type: "update", data: listing })
      this.updateLocalCache(listing, "update")
      return of(listing)
    }

    return this.http.put<Listing>(`${this.apiUrl}/${listing.id}`, listing).pipe(
      catchError((error: HttpErrorResponse) => {
        this.addToQueue({ type: "update", data: listing })
        this.updateLocalCache(listing, "update")

        console.warn("Update queued for later", listing)
        return of(listing)
      }),
    )
  }

  deleteListing(id: string): Observable<void> {
    if (this.isOfflineSubject.value || this.isServerDownSubject.value) {
      this.addToQueue({ type: "delete", data: id })
      this.updateLocalCache(id, "delete")
      return of(undefined)
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        this.addToQueue({ type: "delete", data: id })
        this.updateLocalCache(id, "delete")

        console.warn("Delete queued for later", id)
        return of(undefined)
      }),
    )
  }

  // Queue management
  private addToQueue(item: Omit<QueueItem, "timestamp">) {
    const queueItem: QueueItem = {
      ...item,
      timestamp: Date.now(),
    }

    this.offlineQueue.push(queueItem)
    this.saveQueueToStorage()
  }

  private saveQueueToStorage() {
    if (typeof window !== "undefined" && localStorage) {
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.offlineQueue))
    }
  }

  private loadQueueFromStorage() {
    if (typeof window !== "undefined" && localStorage) {
      const storedQueue = localStorage.getItem(this.QUEUE_STORAGE_KEY)
      if (storedQueue) {
        this.offlineQueue = JSON.parse(storedQueue)
      }
    }
  }

  // Local cache management
  private updateLocalCache(item: Listing | string, operation: "add" | "update" | "delete") {
    if (typeof window === "undefined" || !localStorage) return

    const cachedData = localStorage.getItem("cached_listings")
    let listings: Listing[] = cachedData ? JSON.parse(cachedData) : []

    if (operation === "add" && typeof item !== "string") {
      listings.push(item)
    } else if (operation === "update" && typeof item !== "string") {
      const index = listings.findIndex((l) => l.id === item.id)
      if (index !== -1) {
        listings[index] = item
      }
    } else if (operation === "delete" && typeof item === "string") {
      listings = listings.filter((l) => l.id !== item)
    }

    localStorage.setItem("cached_listings", JSON.stringify(listings))
  }

  // Synchronization logic
  syncOfflineChanges(): Observable<boolean> {
    if (this.offlineQueue.length === 0) {
      return of(true) // Nothing to sync
    }

    if (this.isOfflineSubject.value || this.isServerDownSubject.value) {
      return of(false) // Cannot sync now
    }

    this.syncInProgressSubject.next(true)

    return new Observable<boolean>((observer) => {
      const processQueue = async () => {
        const queue = [...this.offlineQueue]
        let success = true

        for (const item of queue) {
          try {
            if (item.type === "add" && typeof item.data !== "string") {
              await this.http.post<Listing>(this.apiUrl, item.data).toPromise()
            } else if (item.type === "update" && typeof item.data !== "string") {
              await this.http.put<Listing>(`${this.apiUrl}/${item.data.id}`, item.data).toPromise()
            } else if (item.type === "delete" && typeof item.data === "string") {
              await this.http.delete<void>(`${this.apiUrl}/${item.data}`).toPromise()
            }

            // Remove processed item from queue
            const index = this.offlineQueue.findIndex((qi) => qi.timestamp === item.timestamp && qi.type === item.type)
            if (index !== -1) {
              this.offlineQueue.splice(index, 1)
              this.saveQueueToStorage()
            }
          } catch (error) {
            console.error("Failed to sync item", item, error)
            success = false
            break
          }
        }

        // After sync attempt, refresh cached listings if successful
        if (success) {
          try {
            const response = await this.http.get<PaginatedResponse<Listing>>(this.apiUrl).toPromise()
            if (response) {
              localStorage.setItem("cached_listings", JSON.stringify(response.data))
            }
          } catch (error) {
            console.error("Failed to refresh cache after sync", error)
          }
        }

        this.syncInProgressSubject.next(false)
        observer.next(success)
        observer.complete()
      }

      processQueue()

      return {
        unsubscribe() {},
      }
    })
  }

  // Get pending changes count
  getPendingChangesCount(): number {
    return this.offlineQueue.length
  }

  // Your existing methods
  filterListings(
    listings: Listing[],
    selectedCategory: string,
    sortBy: "price" | "uploadDate",
    sortOrder: "asc" | "desc",
  ): Listing[] {
    let result = [...listings]

    if (selectedCategory) {
      result = result.filter((listing) => listing.category === selectedCategory)
    }

    result.sort((a, b) => {
      if (sortBy === "price") {
        return sortOrder === "asc" ? a.price - b.price : b.price - a.price
      } else {
        const dateA = new Date(a.uploadDate).getTime()
        const dateB = new Date(b.uploadDate).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      }
    })

    return result
  }

  private newListings: Listing[] = [
    {
      id: uuidv4(),
      title: "Electric Scooter",
      category: "Vehicles",
      price: 25,
      description: "Fast and efficient electric scooter.",
      ownerId: "user6",
      uploadDate: "2025-03-25",
      location: "Ilfov",
    },
    {
      id: uuidv4(),
      title: "Camping Tent",
      category: "Home",
      price: 10,
      description: "Spacious tent for outdoor adventures.",
      ownerId: "user7",
      uploadDate: "2025-03-26",
      location: "Brasov",
    },
    {
      id: uuidv4(),
      title: "VR Headset",
      category: "Technology",
      price: 30,
      description: "High-end virtual reality headset.",
      ownerId: "user8",
      uploadDate: "2025-03-27",
      location: "Sibiu",
    },
    {
      id: uuidv4(),
      title: "Lawn Mower",
      category: "Garden",
      price: 15,
      description: "Electric lawn mower available for short-term rental.",
      ownerId: "user1",
      uploadDate: "2024-12-25",
      location: "Cluj",
    },
    {
      id: uuidv4(),
      title: "Physics Textbook",
      category: "Education",
      price: 5,
      description: "University-level physics textbook in great condition.",
      ownerId: "me",
      uploadDate: "2025-02-28",
      location: "Dolj",
    },
    {
      id: uuidv4(),
      title: "Gaming Laptop",
      category: "Computers",
      price: 50,
      description: "High-performance gaming laptop available for rent.",
      ownerId: "user3",
      uploadDate: "2025-03-15",
      location: "Cluj",
    },
    {
      id: uuidv4(),
      title: "Car Jack",
      category: "Vehicles",
      price: 10,
      description: "Hydraulic car jack, great for repairs.",
      ownerId: "user4",
      uploadDate: "2024-12-10",
      location: "Prahova",
    },
    {
      id: uuidv4(),
      title: "Smartphone Gimbal",
      category: "Technology",
      price: 20,
      description: "Stabilizer for smooth video recording.",
      ownerId: "user5",
      uploadDate: "2025-03-05",
      location: "Tulcea",
    },
    {
      id: uuidv4(),
      title: "Lawn Mower",
      category: "Garden",
      price: 15,
      description: "Electric lawn mower available for short-term rental.",
      ownerId: "user1",
      uploadDate: "2025-03-20",
      location: "Cluj",
    },
    {
      id: uuidv4(),
      title: "Physics Textbook",
      category: "Education",
      price: 5,
      description: "University-level physics textbook in great condition.",
      ownerId: "me",
      uploadDate: "2024-02-28",
      location: "Dolj",
    },
    {
      id: uuidv4(),
      title: "Gaming Laptop",
      category: "Computers",
      price: 50,
      description: "High-performance gaming laptop available for rent.",
      ownerId: "user3",
      uploadDate: "2024-11-15",
      location: "Cluj",
    },
    {
      id: uuidv4(),
      title: "Car Jack",
      category: "Vehicles",
      price: 10,
      description: "Hydraulic car jack, great for repairs.",
      ownerId: "user4",
      uploadDate: "2024-08-10",
      location: "Prahova",
    },
    {
      id: uuidv4(),
      title: "Smartphone Gimbal",
      category: "Technology",
      price: 20,
      description: "Stabilizer for smooth video recording.",
      ownerId: "user5",
      uploadDate: "2024-09-15",
      location: "Tulcea",
    },
  ]

  getNewListings(): Listing[] {
    return [...this.newListings]
  }

  startAsyncAdding(newListings: Listing[], onListingAdded: (listing: Listing) => void, onComplete: () => void): any {
    let index = 0
    const interval = setInterval(() => {
      if (index < newListings.length) {
        this.addListing(newListings[index]).subscribe((created) => {
          onListingAdded(created)
          index++
        })
      } else {
        clearInterval(interval)
        onComplete()
      }
    }, 1000)

    return interval
  }
}
