import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, retry, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServerProxyService {
  // private baseUrl = 'http://dev-fcsosb.thermofisher.net/DashBoardApp/';
  // private baseUrl = './../assets/json/';
  private baseUrl = 'https://dev.globalpatientgateway.com/fcsosb/v1/';
  constructor(private http: HttpClient) { }

  get(url) {
    return this.http.get(this.baseUrl + url);
  }

  post(url, data: any) {
    return this.http.post(this.baseUrl + url, data);
  }
}
