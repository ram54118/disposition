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
    url =  url + `?user_id=${userId}&module_id=4&sub_module_id=1` 
    return this.http.get(this.baseUrl + url);
  }

  savePersonalizedData(userId, url, personalizedData) {
    url = url + `?user_id=${userId}&module_id=4&sub_module_id=1` 
    return this.http.post(this.baseUrl + url, personalizedData);
  }
}