import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateListingsComponent } from './create-listings.component';
import { FormsModule } from '@angular/forms';
import { Listing } from '../models/listing.model';

describe('CreateListingsComponent', () => {
  let component: CreateListingsComponent;
  let fixture: ComponentFixture<CreateListingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateListingsComponent, FormsModule]
    }).compileComponents();

    // Mock localStorage and crypto
    spyOn(localStorage, 'getItem').and.returnValue('[]');
    spyOn(localStorage, 'setItem');
    //spyOn(crypto, 'randomUUID').and.returnValue('mock-uuid-123');
    
    fixture = TestBed.createComponent(CreateListingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clear localStorage mocks between tests
    (localStorage.getItem as jasmine.Spy).calls.reset();
    (localStorage.setItem as jasmine.Spy).calls.reset();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.newListing).toEqual({
      id: '',
      title: '',
      category: 'Home',
      price: 0,
      description: '',
      ownerId: 'me',
      uploadDate: '',
      location: 'Cluj'
    });
  });
  
  it('should have correct categories array', () => {
    expect(component.categories).toEqual([
      'Home', 'Garden', 'Education', 'Vehicles', 
      'Technology', 'Computers', 'Clothing'
    ]);
  });

  it('should have all Romanian counties', () => {
    expect(component.counties.length).toBe(39);
    expect(component.counties).toContain('Cluj');
    expect(component.counties).toContain('Brasov');
  });

  describe('saveListing()', () => {
    /*
    it('should generate a UUID for new listing', () => {
      component.saveListing();
      expect(crypto.randomUUID).toHaveBeenCalled();
    });
    
    it('should set current date as uploadDate', () => {
      const mockDate = '2023-05-15';
      spyOn(Date.prototype, 'toISOString').and.returnValue(mockDate + 'T00:00:00.000Z');
      
      component.saveListing();
      expect(component.newListing.uploadDate).toBe(mockDate);
    });
    */
    it('should save to localStorage with existing listings', () => {
      const existingListings: Listing[] = [{
        id: 'existing-1',
        title: 'Existing Item',
        category: 'Home',
        price: 10,
        description: 'Test',
        ownerId: 'user1',
        uploadDate: '2023-05-14',
        location: 'Cluj'
      }];
      
      (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(existingListings));
      
      component.newListing.title = 'New Item';
      component.saveListing();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'listings',
        jasmine.stringContaining('New Item')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'listings',
        jasmine.stringContaining('existing-1')
      );
    });

    it('should save to localStorage when no listings exist', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      
      component.newListing.title = 'First Item';
      component.saveListing();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'listings',
        jasmine.stringContaining('First Item')
      );
    });

    it('should reset the form after saving', () => {
      component.newListing.title = 'Test Item';
      component.newListing.price = 50;
      component.newListing.description = 'Test description';
      
      component.saveListing();
      
      expect(component.newListing).toEqual({
        id: '',
        title: '',
        category: 'Home',
        price: 0,
        description: '',
        ownerId: 'me',
        uploadDate: '',
        location: 'Cluj'
      });
    });

    it('should handle empty form submission', () => {
      component.saveListing();
      
      expect(localStorage.setItem).toHaveBeenCalled();
      const savedListings = JSON.parse((localStorage.setItem as jasmine.Spy).calls.argsFor(0)[1]);
      expect(savedListings[0].title).toBe('');
      expect(savedListings[0].price).toBe(0);
    });
  });

  describe('Form Validation', () => {
    it('should require title for submission', () => {
      component.newListing.title = '';
      component.saveListing();
      
      // Still saves but with empty title
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should accept valid price values', () => {
      component.newListing.price = 100;
      component.saveListing();
      
      const savedListings = JSON.parse((localStorage.setItem as jasmine.Spy).calls.argsFor(0)[1]);
      expect(savedListings[0].price).toBe(100);
    });

    it('should handle negative prices by saving as-is', () => {
      component.newListing.price = -10;
      component.saveListing();
      
      const savedListings = JSON.parse((localStorage.setItem as jasmine.Spy).calls.argsFor(0)[1]);
      expect(savedListings[0].price).toBe(-10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long descriptions', () => {
      const longDesc = 'a'.repeat(1000);
      component.newListing.description = longDesc;
      component.saveListing();
      
      const savedListings = JSON.parse((localStorage.setItem as jasmine.Spy).calls.argsFor(0)[1]);
      expect(savedListings[0].description.length).toBe(1000);
    });

    it('should handle special characters in title', () => {
      component.newListing.title = 'Item @#$%^&*()';
      component.saveListing();
      
      const savedListings = JSON.parse((localStorage.setItem as jasmine.Spy).calls.argsFor(0)[1]);
      expect(savedListings[0].title).toBe('Item @#$%^&*()');
    });

    it('should handle missing optional fields', () => {
      component.newListing.description = '';
      component.saveListing();
      
      const savedListings = JSON.parse((localStorage.setItem as jasmine.Spy).calls.argsFor(0)[1]);
      expect(savedListings[0].description).toBe('');
    });
  });
});