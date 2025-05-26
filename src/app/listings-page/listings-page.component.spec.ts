import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListingsPageComponent } from './listings-page.component';
import { ListingService } from '../listing.service/listing.service';
import { Listing } from '../models/listing.model';
import { Chart } from 'chart.js';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ListingsPageComponent', () => {
  let component: ListingsPageComponent;
  let fixture: ComponentFixture<ListingsPageComponent>;
  let listingService: jasmine.SpyObj<ListingService>;

  const mockListings: Listing[] = [
    { id: '1', title: 'Item A', category: 'Garden', price: 20, description: 'Desc A', ownerId: 'user1', uploadDate: '2025-03-10', location: 'Cluj' },
    { id: '2', title: 'Item B', category: 'Education', price: 10, description: 'Desc B', ownerId: 'user2', uploadDate: '2025-03-15', location: 'Dolj' },
    { id: '3', title: 'Item C', category: 'Technology', price: 30, description: 'Desc C', ownerId: 'user3', uploadDate: '2025-03-05', location: 'Prahova' },
    { id: '4', title: 'Item D', category: 'Garden', price: 25, description: 'Desc D', ownerId: 'user4', uploadDate: '2025-02-20', location: 'Cluj' },
    { id: '5', title: 'Item E', category: 'Technology', price: 15, description: 'Desc E', ownerId: 'user5', uploadDate: '2025-03-01', location: 'Brasov' },
    { id: '6', title: 'Item F', category: 'Education', price: 5, description: 'Desc F', ownerId: 'user6', uploadDate: '2025-01-15', location: 'Sibiu' },
  ];

  beforeEach(async () => {
    // Create a spy service
    const listingServiceSpy = jasmine.createSpyObj('ListingService', [
      'getListings',
      'addListing',
      'deleteListing'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ListingsPageComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ListingService, useValue: listingServiceSpy }
      ]
    }).compileComponents();

    // Get the service instance
    listingService = TestBed.inject(ListingService) as jasmine.SpyObj<ListingService>;
    listingService.getListings.and.returnValue(of(mockListings));
    listingService.addListing.and.callFake((listing: Listing) => of(listing));
    listingService.deleteListing.and.returnValue(of(void 0));

    // Mock Chart.js
    spyOn(Chart, 'register').and.callThrough();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListingsPageComponent);
    component = fixture.componentInstance;
    
    // Initialize component with mock data
    component.listings = [...mockListings];
    component.filteredListings = [...mockListings];
    component.updatePagination();
    
    fixture.detectChanges();
  });

  afterEach(() => {
    if (component.addingInterval) {
      clearInterval(component.addingInterval);
    }
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with listings from service', () => {
    // Recreate component without manual initialization
    fixture = TestBed.createComponent(ListingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    expect(listingService.getListings).toHaveBeenCalled();
    expect(component.listings).toEqual(mockListings);
    expect(component.filteredListings).toEqual(mockListings);
  });

  it('should change the sorting order when toggleSortOrder is called', () => {
    expect(component.sortOrder).toBe('asc');
    component.toggleSortOrder();
    expect(component.sortOrder).toBe('desc');
    component.toggleSortOrder();
    expect(component.sortOrder).toBe('asc');
  });

  it('should sort listings by price ascending', () => {
    component.sortOrder = 'asc';
    component.sortBy = 'price';
    component.sortListings();
    expect(component.filteredListings[0].price).toBe(5);
    expect(component.filteredListings[5].price).toBe(30);
  });

  it('should sort listings by uploadDate descending', () => {
    component.sortOrder = 'desc';
    component.sortBy = 'uploadDate';
    component.sortListings();
    expect(component.filteredListings[0].uploadDate).toBe('2025-03-15');
    expect(component.filteredListings[5].uploadDate).toBe('2025-01-15');
  });

  it('should filter listings by category and return only matching items', () => {
    component.selectedCategory = 'Education';
    component.filterByCategory();
    expect(component.filteredListings.length).toBe(2);
    expect(component.filteredListings[0].category).toBe('Education');
    expect(component.filteredListings[1].category).toBe('Education');
  });

  it('should return all listings when no category is selected', () => {
    component.selectedCategory = '';
    component.filterByCategory();
    expect(component.filteredListings.length).toBe(6);
  });

  it('should correctly calculate total pages and paginate listings', () => {
    component.itemsPerPage = 2;
    component.updatePagination();
    expect(component.totalPages).toBe(3);
    expect(component.paginatedListings.length).toBe(2);
  });

  it('should add a new listing via service', () => {
    const newListing: Listing = {
      id: '7',
      title: 'New Item',
      category: 'Home',
      price: 40,
      description: 'New desc',
      owner: 'user7',
      uploadDate: '2025-03-20',
      location: 'Cluj'
    };

    component.addListing(newListing);
    expect(listingService.addListing).toHaveBeenCalledWith(newListing);
    expect(component.listings.length).toBe(7); // 6 mock + 1 new
  });

  it('should delete a listing via service', () => {
    component.deleteListing('1');
    expect(listingService.deleteListing).toHaveBeenCalledWith('1');
    expect(component.listings.length).toBe(5);
  });

  it('should generate charts', () => {
    // Mock canvas elements
    spyOn(document, 'getElementById').and.callFake((id) => {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      return canvas;
    });

    component.generateCharts();
    expect(component.priceChart).toBeDefined();
    expect(component.categoryChart).toBeDefined();
    expect(component.monthlyChart).toBeDefined();
  });

  it('should destroy existing charts before generating new ones', () => {
    // First create charts
    spyOn(document, 'getElementById').and.callFake((id) => {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      return canvas;
    });
    component.generateCharts();
    
    const destroySpy = spyOn(Chart.prototype, 'destroy').and.callThrough();
    component.generateCharts();
    
    expect(destroySpy).toHaveBeenCalledTimes(3); // Once for each chart
  });

  it('should correctly count listings by category', () => {
    const counts = component.countByCategory(mockListings);
    expect(counts['Garden']).toBe(2);
    expect(counts['Education']).toBe(2);
    expect(counts['Technology']).toBe(2);
  });
/*
  it('should stop adding listings when interval is cleared', () => {
    component.newListings = mockListings.slice(0, 2);
    component.currentIndex = 0;
    
    component.startAddingListings();
    component.startAddingListings(); // This should clear the interval
    
    jasmine.clock().install();
    jasmine.clock().tick(5000);
    
    expect(component.addingInterval).toBeNull();
    jasmine.clock().uninstall();
  });*/
});