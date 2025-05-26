import { Component, type OnInit, type AfterViewInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ListingService, type StatisticsResponse } from "../listing.service/listing.service"
import { Chart, registerables } from "chart.js"
import { HttpClientModule } from "@angular/common/http"

// Register Chart.js components
Chart.register(...registerables)

@Component({
  selector: "app-statistics-page",
  templateUrl: "./statistics-page.component.html",
  styleUrls: ["./statistics-page.component.css"],
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  providers: [ListingService],
})
export class StatisticsPageComponent implements OnInit, AfterViewInit {
  statistics: StatisticsResponse | null = null
  isLoading = true
  executionTime = ""
  error = ""

  // Chart instances - keeping only the three we need
  categoryChart: Chart | null = null
  priceRangeChart: Chart | null = null
  avgPriceChart: Chart | null = null

  constructor(private listingService: ListingService) {}

  ngOnInit(): void {
    console.log("StatisticsPageComponent initialized")
    this.fetchStatistics()
  }

  ngAfterViewInit(): void {
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
      console.log("AfterViewInit timeout completed")
      if (this.statistics) {
        this.generateCharts()
      }
    }, 1000)
  }

  fetchStatistics(): void {
    this.isLoading = true
    this.error = ""

    console.log("Fetching statistics...")

    this.listingService.getStatistics().subscribe({
      next: (data) => {
        console.log("Statistics received:", data)
        this.statistics = data
        this.executionTime = data.meta?.executionTime || "unknown"
        this.isLoading = false

        // Wait for DOM to be ready before rendering charts
        setTimeout(() => {
          console.log("Rendering charts after data fetch")
          this.generateCharts()
        }, 500)
      },
      error: (err) => {
        console.error("Error fetching statistics:", err)
        this.error = "Failed to load statistics. Please try again later."
        this.isLoading = false

        // For debugging - use mock data on error
        // this.useMockData();
      },
    })
  }

  // Use this method for debugging if API is not working
  useMockData(): void {
    console.log("Using mock data for debugging")
    this.statistics = {
      categoryStats: [
        { category: "Technology", count: 250 },
        { category: "Home", count: 180 },
        { category: "Vehicles", count: 120 },
        { category: "Garden", count: 90 },
        { category: "Computers", count: 85 },
      ],
      priceRangeStats: [
        { category: "Technology", low_price: 50, medium_price: 150, high_price: 50 },
        { category: "Home", low_price: 80, medium_price: 70, high_price: 30 },
        { category: "Vehicles", low_price: 20, medium_price: 40, high_price: 60 },
        { category: "Garden", low_price: 60, medium_price: 20, high_price: 10 },
        { category: "Computers", low_price: 15, medium_price: 40, high_price: 30 },
      ],
      monthlyStats: [],
      locationStats: [],
      avgPriceByCategory: [
        { category: "Technology", avg_price: 150.5 },
        { category: "Home", avg_price: 120.75 },
        { category: "Vehicles", avg_price: 250.25 },
        { category: "Garden", avg_price: 85.5 },
        { category: "Computers", avg_price: 320.0 },
      ],
      meta: {
        executionTime: "50ms",
      },
    }
    this.isLoading = false
    this.executionTime = "50ms (mock)"
  }

  // Main chart generation method - simplified to only generate the three charts we need
  generateCharts(): void {
    console.log("Starting chart generation")

    if (!this.statistics) {
      console.warn("No statistics data available for rendering charts")
      return
    }

    // First destroy any existing charts
    this.destroyCharts()

    // Generate each chart
    this.generateCategoryChart()
    this.generatePriceRangeChart()
    this.generateAvgPriceChart()

    console.log("All charts generated")
  }

  destroyCharts(): void {
    console.log("Destroying existing charts")

    if (this.categoryChart) {
      this.categoryChart.destroy()
      this.categoryChart = null
    }

    if (this.priceRangeChart) {
      this.priceRangeChart.destroy()
      this.priceRangeChart = null
    }

    if (this.avgPriceChart) {
      this.avgPriceChart.destroy()
      this.avgPriceChart = null
    }
  }

  generateCategoryChart(): void {
    console.log("Generating category chart")

    if (!this.statistics?.categoryStats?.length) {
      console.warn("No category stats data available")
      return
    }

    const ctx = document.getElementById("categoryChart") as HTMLCanvasElement
    if (!ctx) {
      console.error("Category chart canvas not found")
      return
    }

    try {
      this.categoryChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: this.statistics.categoryStats.map((item) => item.category),
          datasets: [
            {
              label: "Listings per Category",
              data: this.statistics.categoryStats.map((item) => item.count),
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Listings Distribution by Category",
              font: {
                size: 16,
              },
            },
            legend: {
              position: "top",
              labels: {
                font: {
                  size: 14,
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  size: 12,
                },
              },
            },
            x: {
              ticks: {
                font: {
                  size: 12,
                },
              },
            },
          },
        },
      })
      console.log("Category chart created successfully")
    } catch (error) {
      console.error("Error creating category chart:", error)
    }
  }

  generatePriceRangeChart(): void {
    console.log("Generating price range chart")

    if (!this.statistics?.priceRangeStats?.length) {
      console.warn("No price range stats data available")
      return
    }

    const ctx = document.getElementById("priceRangeChart") as HTMLCanvasElement
    if (!ctx) {
      console.error("Price range chart canvas not found")
      return
    }

    try {
      this.priceRangeChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: this.statistics.priceRangeStats.map((item) => item.category),
          datasets: [
            {
              label: "Low Price (<$50)",
              data: this.statistics.priceRangeStats.map((item) => item.low_price),
              backgroundColor: "rgba(75, 192, 192, 0.6)",
            },
            {
              label: "Medium Price ($50-$199)",
              data: this.statistics.priceRangeStats.map((item) => item.medium_price),
              backgroundColor: "rgba(255, 206, 86, 0.6)",
            },
            {
              label: "High Price (≥$200)",
              data: this.statistics.priceRangeStats.map((item) => item.high_price),
              backgroundColor: "rgba(255, 99, 132, 0.6)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Price Range Distribution by Category",
              font: {
                size: 16,
              },
            },
            legend: {
              position: "top",
              labels: {
                font: {
                  size: 14,
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              ticks: {
                font: {
                  size: 12,
                },
              },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: {
                font: {
                  size: 12,
                },
              },
            },
          },
        },
      })
      console.log("Price range chart created successfully")
    } catch (error) {
      console.error("Error creating price range chart:", error)
    }
  }

  generateAvgPriceChart(): void {
    console.log("Generating average price chart")

    if (!this.statistics?.avgPriceByCategory?.length) {
      console.warn("No average price stats data available")
      return
    }

    const ctx = document.getElementById("avgPriceChart") as HTMLCanvasElement
    if (!ctx) {
      console.error("Average price chart canvas not found")
      return
    }

    try {
      this.avgPriceChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: this.statistics.avgPriceByCategory.map((item) => item.category),
          datasets: [
            {
              label: "Average Price",
              data: this.statistics.avgPriceByCategory.map((item) => Math.round(item.avg_price * 100) / 100),
              backgroundColor: "rgba(153, 102, 255, 0.6)",
              borderColor: "rgba(153, 102, 255, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Average Price by Category",
              font: {
                size: 16,
              },
            },
            legend: {
              position: "top",
              labels: {
                font: {
                  size: 14,
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  size: 12,
                },
                callback: (value) => "$" + value,
              },
            },
            x: {
              ticks: {
                font: {
                  size: 12,
                },
              },
            },
          },
        },
      })
      console.log("Average price chart created successfully")
    } catch (error) {
      console.error("Error creating average price chart:", error)
    }
  }

  // Helper method for random colors
  getRandomColor(): string {
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    return `rgba(${r}, ${g}, ${b}, 1)`
  }

  refreshData(): void {
    console.log("Manually refreshing data")
    this.fetchStatistics()
  }
}
