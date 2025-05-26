import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { CreateListingsComponent } from './create-listings/create-listings.component';
import { ListingsPageComponent } from './listings-page/listings-page.component';
import { MyListingsComponent } from './my-listings/my-listings.component'; // ✅ Import
import { StatisticsPageComponent } from './statistics-page/statistics-page.component'; // ✅ Import statistics page component

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'create', component: CreateListingsComponent },
  { path: 'listings', component: ListingsPageComponent },
  { path: 'my-listings', component: MyListingsComponent }, // ✅ New Route
  { path: "statistics", component: StatisticsPageComponent }, // ✅ Add statistics route
];
