import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Link {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SnipApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  createLink(url: string): Observable<Link> {
    return this.http.post<Link>(`${this.apiUrl}/api/links`, { url });
  }

  getLinks(): Observable<Link[]> {
    return this.http.get<Link[]>(`${this.apiUrl}/api/links`);
  }
}
