import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, retry, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServerProxyService {

  //https://dev-fcsosb.thermofisher.net/v1/
  //private baseUrl = 'http://dev-fcsosb.thermofisher.net/v1/';
  // private baseUrl = './../assets/json/';
  //private baseUrl = 'https://dev.globalpatientgateway.com/fcsosb/v1/';
  // private baseUrl = 'https://dev-globalgateway.amer.thermo.com/fcsosb/v1/';
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
}
