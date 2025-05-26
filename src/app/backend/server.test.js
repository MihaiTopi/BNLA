const request = require('supertest');
const app = require('./server');  // Use the correct file path here

describe('Listings API', () => {
  beforeEach(async () => {
    await request(app).post('/api/listings/reset');
  });

  it('should return an empty list after reset', async () => {
    const res = await request(app).get('/api/listings');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should create a new listing', async () => {
    const listing = {
      title: 'Laptop',
      category: 'Technology',
      price: 45,
      description: 'Nice laptop',
      owner: 'Alice',
      uploadDate: '2025-04-07',
      location: 'Berlin'
    };

    const res = await request(app).post('/api/listings').send(listing);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject(listing);
    expect(res.body).toHaveProperty('id');
  });

  it('should update an existing listing', async () => {
    const res = await request(app).post('/api/listings').send({
      title: 'Tablet',
      category: 'Technology',
      price: 20,
      description: 'Old tablet',
      owner: 'Bob',
      uploadDate: '2025-04-07',
      location: 'Paris'
    });

    const updated = {
      title: 'New Tablet',
      category: 'Technology',
      price: 25,
      description: 'Updated',
      owner: 'Bob',
      uploadDate: '2025-04-07',
      location: 'Paris'
    };

    const updateRes = await request(app).put(`/api/listings/${res.body.id}`).send(updated);
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.title).toBe('New Tablet');
  });

  it('should delete a listing', async () => {
    const res = await request(app).post('/api/listings').send({
      title: 'Chair',
      category: 'Home',
      price: 5,
      description: 'Wooden chair',
      owner: 'Carl',
      uploadDate: '2025-04-07',
      location: 'London'
    });

    const deleteRes = await request(app).delete(`/api/listings/${res.body.id}`);
    expect(deleteRes.statusCode).toBe(204);
  });

  it('should return an error if creating a listing with invalid data', async () => {
    const invalidListing = {
      title: '',  // invalid title
      category: 'Unknown',  // invalid category
      price: 'not-a-number',  // invalid price
      description: 'Invalid listing',
      owner: 'Alice',
      uploadDate: '2025-04-07',
      location: 'Berlin'
    };

    const res = await request(app).post('/api/listings').send(invalidListing);
    expect(res.statusCode).toBe(400);  // Expecting a Bad Request response
    expect(res.body).toHaveProperty('error'); // Check if error property exists
  });

  it('should return 404 when trying to update a non-existent listing', async () => {
    const res = await request(app).put('/api/listings/999').send({
      title: 'Non-existent Listing',
      category: 'Technology',
      price: 50,
      description: 'This should not exist',
      owner: 'Non Owner',
      uploadDate: '2025-04-07',
      location: 'Nowhere'
    });

    expect(res.statusCode).toBe(404);  // Expecting 404 status code
    expect(res.body).toHaveProperty('message', 'Listing not found');  // Expect error message
  });

  it('should return status "ok" for ping', async () => {
    const res = await request(app).get('/api/listings/ping');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should reset the listings to empty', async () => {
    await request(app).post('/api/listings').send({
      title: 'Some Listing',
      category: 'Technology',
      price: 50,
      description: 'Some description',
      owner: 'TestOwner',
      uploadDate: '2025-04-07',
      location: 'TestCity',
    });

    const resBeforeReset = await request(app).get('/api/listings');
    expect(resBeforeReset.body.length).toBeGreaterThan(0);  // Should have listings before reset

    await request(app).post('/api/listings/reset');

    const resAfterReset = await request(app).get('/api/listings');
    expect(resAfterReset.body).toEqual([]);  // Should be empty after reset
  });

  it('should update partial fields of a listing', async () => {
    const res = await request(app).post('/api/listings').send({
      title: 'Old Laptop',
      category: 'Technology',
      price: 40,
      description: 'Old but working laptop',
      owner: 'Charlie',
      uploadDate: '2025-04-07',
      location: 'New York',
    });

    const updated = {
      price: 35,  // Only updating price
    };

    const updateRes = await request(app).put(`/api/listings/${res.body.id}`).send(updated);
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.price).toBe(35);
    expect(updateRes.body.title).toBe('Old Laptop');  // Ensure title remains unchanged
  });

  it('should return 404 when trying to delete a non-existent listing', async () => {
    const deleteRes = await request(app).delete('/api/listings/9999');  // Non-existent ID
    expect(deleteRes.statusCode).toBe(404);
  });

  it('should allow listing with a future upload date', async () => {
    const listing = {
      title: 'Future Tech',
      category: 'Technology',
      price: 100,
      description: 'Cutting edge tech coming soon',
      owner: 'Techie',
      uploadDate: '2026-01-01',  // Future date
      location: 'FutureLand',
    };

    const res = await request(app).post('/api/listings').send(listing);
    expect(res.statusCode).toBe(201);
    expect(res.body.uploadDate).toBe('2026-01-01');
  });
});

