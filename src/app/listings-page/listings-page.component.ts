import { Component, type OnInit, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ListingService, type PaginatedResponse } from "../listing.service/listing.service"
import type { Listing } from "../models/listing.model"
import { Chart, registerables } from "chart.js"
import { FormsModule } from "@angular/forms"
import { HttpClientModule } from "@angular/common/http"

Chart.register(...registerables)

@Component({
  selector: "app-listings-page",
  templateUrl: "./listings-page.component.html",
  styleUrls: ["./listings-page.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  providers: [ListingService],
})
export class ListingsPageComponent implements OnInit {
  infiniteScrollEnabled = false

  listings: Listing[] = []
  paginatedListings: Listing[] = []

  selectedCategory = ""
  categories = ["Home", "Garden", "Education", "Vehicles", "Technology", "Computers", "Clothing"]
  sortOrder: "asc" | "desc" = "asc"
  sortBy: "price" | "uploadDate" = "price"

  // Pagination
  currentPage = 1
  itemsPerPage = 5
  totalPages = 1
  totalCount = 0
  isLoading = false

  constructor(private listingService: ListingService) {}

  ngOnInit() {
    this.fetchListingsPage()
    setTimeout(() => {
      this.generateCharts()
    }, 1000)
  }

  priceChart!: Chart | null
  categoryChart!: Chart | null
  monthlyChart!: Chart | null

  generateCharts() {
    this.destroyCharts()

    this.generatePriceChart()
    this.generateCategoryChart()
    this.generateMonthlyChart()
  }

  destroyCharts() {
    if (this.priceChart) {
      this.priceChart.destroy()
      this.priceChart = null
    }
    if (this.categoryChart) {
      this.categoryChart.destroy()
      this.categoryChart = null
    }
    if (this.monthlyChart) {
      this.monthlyChart.destroy()
      this.monthlyChart = null
    }
  }

  generatePriceChart() {
    const highPriceListings = this.listings.filter((listing) => listing.price >= 20)
    const categoryCounts = this.countByCategory(highPriceListings)

    this.priceChart = new Chart("priceChart", {
      type: "bar",
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            label: "Listings with Price ≥ 20",
            data: Object.values(categoryCounts),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
        ],
      },
    })
  }

  generateCategoryChart() {
    const categoryCounts = this.countByCategory(this.listings)

    this.categoryChart = new Chart("categoryChart", {
      type: "bar",
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            label: "Listings per Category",
            data: Object.values(categoryCounts),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
        ],
      },
    })
  }

  generateMonthlyChart() {
    const currentMonth = new Date().getMonth()
    const monthlyListings = this.listings.filter((listing) => new Date(listing.uploadDate).getMonth() === currentMonth)
    const categoryCounts = this.countByCategory(monthlyListings)

    this.monthlyChart = new Chart("monthlyChart", {
      type: "bar",
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            label: "Listings Uploaded This Month",
            data: Object.values(categoryCounts),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
        ],
      },
    })
  }

  countByCategory(listings: Listing[]) {
    return listings.reduce((acc: Record<string, number>, listing) => {
      acc[listing.category] = (acc[listing.category] || 0) + 1
      return acc
    }, {})
  }

  // New method to fetch paginated listings from server
  fetchListingsPage() {
    this.isLoading = true

    // Use the new paginated API
    this.listingService
      .getListingsPage(this.currentPage, this.itemsPerPage, this.selectedCategory, this.sortBy, this.sortOrder)
      .subscribe({
        next: (response: PaginatedResponse<Listing>) => {
          this.paginatedListings = response.data
          this.totalPages = response.meta.totalPages
          this.totalCount = response.meta.totalCount
          this.currentPage = response.meta.currentPage

          // Update the full listings array for charts
          // Note: For large datasets, you might want to handle this differently
          if (this.currentPage === 1) {
            this.listings = [...response.data]
          } else {
            // Append to existing listings for chart data
            const existingIds = new Set(this.listings.map((l) => l.id))
            const newListings = response.data.filter((l) => !existingIds.has(l.id))
            this.listings = [...this.listings, ...newListings]
          }

          this.isLoading = false

          // Regenerate charts with updated data
          setTimeout(() => {
            this.generateCharts()
          }, 500)
        },
        error: (err) => {
          console.error("Error fetching listings:", err)
          this.isLoading = false
        },
      })
  }

  addListing(newListing: Listing) {
    this.listingService.addListing(newListing).subscribe((createdListing) => {
      // Add to local array for UI updates
      this.listings.push(createdListing)

      // Refresh current page to see the new listing if applicable
      this.fetchListingsPage()

      // Regenerate charts
      this.generateCharts()
    })
  }

  deleteListing(id: string) {
    this.listingService.deleteListing(id).subscribe(() => {
      // Remove from local array
      this.listings = this.listings.filter((listing) => listing.id !== id)

      // Refresh current page
      this.fetchListingsPage()
    })
  }

  getBorderColor(uploadDate: string): string {
    const sortedListings = [...this.listings].sort(
      (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
    )

    const totalListings = sortedListings.length

    const oneThird = Math.floor(totalListings / 3)
    const twoThirds = 2 * oneThird

    const listingIndex = sortedListings.findIndex((listing) => listing.uploadDate === uploadDate)

    if (listingIndex < oneThird) {
      return "recent"
    } else if (listingIndex < twoThirds) {
      return "mid-recent"
    } else {
      return "old"
    }
  }

  /* filtering area */

  filterByCategory() {
    this.currentPage = 1 // Reset to first page when filtering
    this.fetchListingsPage()
  }

  sortListings() {
    this.currentPage = 1 // Reset to first page when sorting
    this.fetchListingsPage()
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc"
    this.sortListings()
  }

  changeSortBy(sortBy: "price" | "uploadDate") {
    this.sortBy = sortBy
    this.sortListings()
  }

  // Pagination methods

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page
      this.fetchListingsPage()
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      this.fetchListingsPage()
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--
      this.fetchListingsPage()
    }
  }

  changeItemsPerPage(count: number) {
    if (count < 1) {
      this.infiniteScrollEnabled = true
      this.itemsPerPage = 20 // Load 20 at a time for infinite scroll
    } else {
      this.infiniteScrollEnabled = false
      this.itemsPerPage = count
    }
    this.currentPage = 1 // Reset to first page
    this.fetchListingsPage()
  }

  // Adding listings asynchronously
  addingInterval: any = null
  currentIndex = 0

  startAddingListings() {
    if (this.addingInterval) {
      clearInterval(this.addingInterval)
      this.addingInterval = null
      return
    }

    const newListings = this.listingService.getNewListings()

    this.addingInterval = this.listingService.startAsyncAdding(
      newListings,
      (createdListing: Listing) => {
        this.listings.push(createdListing)
        // Refresh the current page to see new listings if applicable
        this.fetchListingsPage()
        this.generateCharts()
      },
      () => {
        this.addingInterval = null
      },
    )
  }

  // logic for infinite scroll
  loadMoreListings(): void {
    if (this.isLoading || !this.infiniteScrollEnabled || this.currentPage >= this.totalPages) {
      return
    }

    this.currentPage++
    this.isLoading = true

    this.listingService
      .getListingsPage(this.currentPage, this.itemsPerPage, this.selectedCategory, this.sortBy, this.sortOrder)
      .subscribe({
        next: (response: PaginatedResponse<Listing>) => {
          // Append new listings to the current list
          this.paginatedListings = [...this.paginatedListings, ...response.data]
          this.isLoading = false

          // Update the full listings array for charts
          const existingIds = new Set(this.listings.map((l) => l.id))
          const newListings = response.data.filter((l) => !existingIds.has(l.id))
          this.listings = [...this.listings, ...newListings]

          // Regenerate charts with updated data
          this.generateCharts()
        },
        error: (err) => {
          console.error("Error loading more listings:", err)
          this.isLoading = false
        },
      })
  }

  @HostListener("window:scroll", [])
  onScroll(): void {
    if (!this.infiniteScrollEnabled || this.isLoading) return

    const threshold = 300 // px from bottom to trigger
    const position = window.innerHeight + window.scrollY
    const height = document.body.offsetHeight

    if (position > height - threshold) {
      this.loadMoreListings()
    }
  }
}
