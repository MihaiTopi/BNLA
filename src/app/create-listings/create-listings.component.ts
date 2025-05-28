import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Listing } from '../models/listing.model';
import { ListingService } from '../listing.service/listing.service'; // 👈 Import the service

@Component({
  selector: 'app-create-listings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-listings.component.html',
  styleUrls: ['./create-listings.component.css']
})
export class CreateListingsComponent {
  newListing: Listing = {
    id: '',
    title: '',
    category: 'Home', // Default category
    price: 0,
    description: '',
    ownerId: 'me',
    uploadDate: '',
    location: 'Cluj'
  };

  categories = ['Home', 'Garden', 'Education', 'Vehicles', 'Technology', 'Computers', 'Clothing'];

  counties = [
    'Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud', 'Botosani', 'Brasov', 'Braila', 'Buzau',
    'Caras-Severin', 'Cluj', 'Constanta', 'Covasna', 'Dambovita', 'Dolj', 'Galati', 'Gorj', 'Harghita', 'Hunedoara',
    'Ialomita', 'Iasi', 'Ilfov', 'Maramures', 'Mehedinti', 'Mures', 'Neamt', 'Olt', 'Prahova', 'Satu Mare', 'Salaj',
    'Sibiu', 'Suceava', 'Teleorman', 'Timis', 'Tulcea', 'Valcea', 'Vaslui', 'Vrancea'
  ];

  constructor(private listingService: ListingService) {} // 👈 Inject service

  saveListing() {
    // Set uploadDate to current date
    this.newListing.uploadDate = new Date().toISOString().split('T')[0];

    this.listingService.addListing(this.newListing).subscribe({
      next: () => {
        alert('Listing saved!');
        // Reset form
        this.newListing = {
          id: '',
          title: '',
          category: 'Home',
          price: 0,
          description: '',
          ownerId: 'me',
          uploadDate: '',
          location: 'Cluj'
        };
      },
      error: () => {
        alert('Failed to save listing');
      }
    });
  }
}
