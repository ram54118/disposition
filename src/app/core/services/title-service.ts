import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TitleService {
  private title$: Observable<string>;
  private titleSubject: Subject<string> = new Subject();
  constructor() {
    this.title$ = this.titleSubject.asObservable();
  }
  setTitle(title: string) {
    this.titleSubject.next(title);
  }

  getTitle(): Observable<string> {
    return this.title$;
  }
}
