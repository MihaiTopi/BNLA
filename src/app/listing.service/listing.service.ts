import { HttpClient, type HttpErrorResponse, HttpParams } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { Observable, of, catchError, map } from "rxjs"
import type { Listing } from "../models/listing.model"
import { v4 as uuidv4 } from "uuid"

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

export interface PriceRangeStats {
  category: string
  low_price: number
  medium_price: number
  high_price: number
}

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
  private apiUrl = "https://server-production-99e3.up.railway.app/api/listings";
  private statsUrl = "https://server-production-99e3.up.railway.app/api/statistics";

  constructor(private http: HttpClient) {}

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

  // Transform listings data into statistics format
  private generateStatisticsFromListings(listings: Listing[]): StatisticsResponse {
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
        return of({
          data: [],
          meta: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            limit,
          },
        })
      }),
    )
  }

  addListing(listing: Listing): Observable<Listing> {
    if (!listing.id) listing.id = uuidv4()
    return this.http.post<Listing>(this.apiUrl, listing)
  }

  updateListing(listing: Listing): Observable<Listing> {
    return this.http.put<Listing>(`${this.apiUrl}/${listing.id}`, listing)
  }

  deleteListing(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
  }

  // Filter and sort listings (client-side)
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

  // Sample data for demonstration
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
    // ... (rest of the sample data remains the same)
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