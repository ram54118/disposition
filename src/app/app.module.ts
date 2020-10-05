import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InventoryListComponent } from './components/inventory-list/inventory-list.component';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ReportModalComponent } from './components/report-modal/report-modal.component';
import { LoaderInterceptorService } from './core/services/loader-intercepter.service';
import { LoaderComponent } from './components/loader/loader.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CookieService } from 'ngx-cookie-service';
import { InformationModalComponent } from './components/information-modal/information-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    InventoryListComponent,
    ReportModalComponent,
    LoaderComponent,
    InformationModalComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    MatIconModule,
    BrowserAnimationsModule,
    PaginationModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    ModalModule.forRoot(),
    MatProgressSpinnerModule,
  ],
  providers: [
    CookieService
  ],
  entryComponents: [ReportModalComponent, InformationModalComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
