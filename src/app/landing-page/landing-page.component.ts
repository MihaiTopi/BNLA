import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule for two-way data binding

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
  imports: [CommonModule, FormsModule],
})
export class LandingPageComponent {
  username = '';
  email = '';
  password = '';
  message = '';

  constructor(private http: HttpClient) {}

  register() {
    this.http.post('/api/register', {
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => this.message = res.message,
      error: err => this.message = err.error?.error || 'Registration failed'
    });
  }

  login() {
    this.http.post('/api/login', {
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => this.message = res.message,
      error: err => this.message = err.error?.error || 'Login failed'
    });
  }
}
