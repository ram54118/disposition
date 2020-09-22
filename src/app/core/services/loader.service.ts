import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  isLoading = new Subject<number>();
  show(progressCount?: number) {
    console.log('pro', progressCount);
    this.isLoading.next(progressCount);
  }
  hide() {
    this.isLoading.next();
  }
  constructor() { }
}
