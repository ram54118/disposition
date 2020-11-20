import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, retry, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServerProxyService {
  private baseUrl = '';
  constructor(private http: HttpClient) { }

  get(url) {
    return this.http.get(this.baseUrl + url);
  }

  post(url, data: any) {
    return this.http.post(this.baseUrl + url, data);
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getPersonalizedData(userId, url) {
    const headers: HttpHeaders = new HttpHeaders();
    headers.append('userId', userId);
    headers.append('moduleId', '5');
    headers.append('Sub moduleId', '1');
    headers.append('Operation', 'R');
    headers.append('input_personlization_json_clobe', null);
    return this.http.get(this.baseUrl + url, { headers });
  }

  savePersonalizedData(userId, url, personalizedData) {
    const headers: HttpHeaders = new HttpHeaders();
    headers.append('userId', userId);
    headers.append('moduleId', '5');
    headers.append('Sub moduleId', '1');
    headers.append('Operation', 'R');
    headers.append('input_personlization_json_clobe', personalizedData);
    return this.http.get(this.baseUrl + url, { headers });
  }
}
