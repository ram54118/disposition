import { LoaderService } from './core/services/loader.service';
import { CookieService } from 'ngx-cookie-service';
import { Component, OnInit } from '@angular/core';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  cookieAuthorized: boolean;
  isLoading;
  constructor(private cookieService: CookieService, private loaderService: LoaderService) {
  }
  ngOnInit() {
    // this.cookieAuthorized = !!this.cookieService.get('valid-cookie');
    this.cookieAuthorized = true;
    this.isLoading = this.loaderService.isLoading;
  }
}
