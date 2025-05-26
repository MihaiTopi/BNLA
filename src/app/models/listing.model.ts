export interface Listing {
    id: string; // Unique ID for deletion
    title: string;
    category: 'Home' | 'Garden' | 'Education' | 'Vehicles' | 'Technology' | 'Computers' | 'Clothing' // Restrict categories
    price: number;
    description: string;
    ownerId: string; // Will store "me" for now
    uploadDate: string; // Store the upload date as a string (e.g., '2025-03-20')
    location: 'Alba' | 'Arad' | 'Arges' | 'Bacau' | 'Bihor' | 'Bistrita-Nasaud' | 'Botosani' | 'Brasov' | 'Braila' | 'Buzau' | 'Caras-Severin' | 'Cluj' | 'Constanta' | 'Covasna' | 'Dambovita' | 'Dolj' | 'Galati' | 'Gorj' | 'Harghita' | 'Hunedoara' | 'Ialomita' | 'Iasi' | 'Ilfov' | 'Maramures' | 'Mehedinti' | 'Mures' | 'Neamt' | 'Olt' | 'Prahova' | 'Satu Mare' | 'Salaj' | 'Sibiu' | 'Suceava' | 'Teleorman' | 'Timis' | 'Tulcea' | 'Valcea' | 'Vaslui' | 'Vrancea'
  }
  
  interface ListingResponse {
    listings: Listing[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
  }
  