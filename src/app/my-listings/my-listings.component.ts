import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Listing } from '../models/listing.model';
import { FormsModule } from '@angular/forms'; 
import { ListingService } from '../listing.service/listing.service'; // Import ListingService

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './my-listings.component.html',
  styleUrls: ['./my-listings.component.css']
})
export class MyListingsComponent implements OnInit {
  myListings: Listing[] = [];
  isEditing = false; 
  editingListing: Listing | null = null; 

  constructor(private listingService: ListingService) {} // Inject ListingService

  ngOnInit() {
    // Use the ListingService to fetch listings from the server
    this.listingService.getListings().subscribe(listings => {
      this.myListings = listings.filter(listing => listing.ownerId === 'me');
    });
  }

  deleteListing(id: string) {
    this.listingService.deleteListing(id).subscribe(() => {
      this.myListings = this.myListings.filter(listing => listing.id !== id);
    });
  }

  editListing(listing: Listing) {
    this.isEditing = true;
    this.editingListing = { ...listing }; 
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingListing = null;
  }

  submitEdit() {
    if (this.editingListing) {
      this.listingService.updateListing(this.editingListing).subscribe(updatedListing => {
        const index = this.myListings.findIndex(listing => listing.id === updatedListing.id);
        if (index !== -1) {
          this.myListings[index] = updatedListing; 
        }

        this.isEditing = false;
        this.editingListing = null;
      });
    }
  }
}
