// app.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let listings = [
  {
    id: 1,
    title: 'Bicycle',
    category: 'Sports',
    price: 25,
    description: 'Mountain bike, good condition.',
    owner: 'John Doe',
    uploadDate: '2025-04-01',
    location: 'New York'
  }
];
let nextId = 2;

app.get('/api/listings', (req, res) => res.json(listings));

app.post('/api/listings', (req, res) => {
  const newListing = { id: nextId++, ...req.body };
  listings.push(newListing);
  res.status(201).json(newListing);
});

app.put('/api/listings/:id', (req, res) => {
  const index = listings.findIndex(l => l.id == req.params.id);
  if (index === -1) return res.status(404).send('Not found');
  listings[index] = { ...listings[index], ...req.body };
  res.json(listings[index]);
});

app.delete('/api/listings/:id', (req, res) => {
  listings = listings.filter(l => l.id != req.params.id);
  res.status(204).end();
});

app.post('/api/reset', (req, res) => {
  listings = [];
  nextId = 1;
  res.status(200).send('Reset');
});

module.exports = app;
