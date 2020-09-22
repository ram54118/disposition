import { CookieService } from 'ngx-cookie-service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  cookieAuthorized: boolean;
  constructor(private cookieService: CookieService) {
  }
  ngOnInit() {
    // this.cookieAuthorized = !!this.cookieService.get('valid-cookie');
    this.cookieAuthorized = true;
  }
}
