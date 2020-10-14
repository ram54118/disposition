import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ServerProxyService } from './server-proxy.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  constructor(private serverProxyService: ServerProxyService, private http: HttpClient) { }
  getInventoryList(minRow, maxRow, metaData): Observable<any> {
    const userId = metaData.USER_ID;
    const reportId = metaData.REPORT_ID;
    const token = metaData.DISPOSITION_HEADER_TOKEN;
    const url = token == "null" ? `getInventoryDispositionDetails/get?user_id=${userId}&report_id=${reportId}&minrow=${minRow}&maxrow=${maxRow}` : `getInventoryDispositionDetails/get?user_id=${userId}&report_id=${reportId}&disposition_header_token=${token}&minrow=${minRow}&maxrow=${maxRow}`;
    return this.serverProxyService.get(url).pipe(catchError((error) => {
      return of([]);
    }));
  }

  sendDispositionDetains(result) {
    const url = 'InventoryDisposition/set';
    return this.serverProxyService.post(url, result).pipe(catchError((error) => {
      return of([]);
    }));
  }

  getInventoryListCount(metaData): Observable<any> {
    const userId = metaData.USER_ID;
    const reportId = metaData.REPORT_ID;
    const token = metaData.DISPOSITION_HEADER_TOKEN;
    const url = token == "null" ? `InventoryDispositionRecordCount/get?user_id=${userId}&report_id=${reportId}` : `InventoryDispositionRecordCount/get?user_id=${userId}&report_id=${reportId}&disposition_header_token=${token}`;
    return this.serverProxyService.get(url).pipe(catchError((error) => {
      return of(null);
    }));
  }

  getPDFUrl(metaData): Observable<any> {
    const reportId = metaData.REPORT_ID;
    const url = `InventoryDispositionReportURL/get?report_type_id=10002&report_id=${reportId}`;
    return this.serverProxyService.get(url).pipe(catchError((error) => {
      return of(null);
    }));
  }

  public getAssetCredentials(): Observable<any> {
    const url = 'assets/json/mobileVariables.json';
    // const url = 'api/ePlyMobile/mobileVariables';
    return this.serverProxyService.get(url).pipe(
      tap((response: any) => {
        this.serverProxyService.setBaseUrl(this.getBaseUrl(response))
      }),
      catchError((error) => {
        return of(null);
      }));
  }

  private getBaseUrl(response: any): string {
    if (response && response.WS_OSB_GG) {
      const detials = response.WS_OSB_GG.split('|||');
      return detials[detials.length - 1];
    } else {
      return 'https://dev.globalpatientgateway.com/fcsosb/v1/';
    }
  }
}
