import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Listing } from '../models/listing.model';
import { ListingService } from '../listing.service/listing.service';

@Component({
  selector: 'app-create-listings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-listings.component.html',
  styleUrls: ['./create-listings.component.css']
})
export class CreateListingsComponent {
  newListing: Omit<Listing, 'id'> = {  // Using Omit since we'll generate ID in service
    title: '',
    category: 'Home',
    price: 0,
    description: '',
    ownerId: 'me',
    uploadDate: '',
    location: 'Cluj'
  };

  categories = [
    'Home', 'Garden', 'Education', 'Vehicles', 'Technology', 
    'Computers', 'Clothing', 'Sports', 'Electronics', 'Outdoors'
  ];  // Make sure this matches server's allowedCategories

  counties = [
    'Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud', 'Botosani', 
    'Brasov', 'Braila', 'Buzau', 'Caras-Severin', 'Cluj', 'Constanta', 
    'Covasna', 'Dambovita', 'Dolj', 'Galati', 'Gorj', 'Harghita', 'Hunedoara',
    'Ialomita', 'Iasi', 'Ilfov', 'Maramures', 'Mehedinti', 'Mures', 'Neamt', 
    'Olt', 'Prahova', 'Satu Mare', 'Salaj', 'Sibiu', 'Suceava', 'Teleorman', 
    'Timis', 'Tulcea', 'Valcea', 'Vaslui', 'Vrancea'
  ];

  isLoading = false;  // Add loading state

  constructor(private listingService: ListingService) {}

  saveListing() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    
    // Set uploadDate to current date
    this.newListing.uploadDate = new Date().toISOString().split('T')[0];

    this.listingService.addListing(this.newListing as Listing).subscribe({
      next: () => {
        alert('Listing saved successfully!');
        this.resetForm();
      },
      error: (err) => {
        console.error('Error saving listing:', err);
        alert(`Failed to save listing: ${err.message || 'Unknown error'}`);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.newListing.title.trim()) {
      alert('Title is required');
      return false;
    }
    if (this.newListing.price <= 0) {
      alert('Price must be greater than 0');
      return false;
    }
    if (!this.newListing.description.trim()) {
      alert('Description is required');
      return false;
    }
    return true;
  }

  private resetForm() {
    this.newListing = {
      title: '',
      category: 'Home',
      price: 0,
      description: '',
      ownerId: 'me',
      uploadDate: '',
      location: 'Cluj'
    };
    this.isLoading = false;
  }
}