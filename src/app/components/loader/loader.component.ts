import { LoaderService } from './../../core/services/loader.service';
import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent implements OnInit {
  color = 'primary';
  mode = 'indeterminate';
  value = 50;
  isLoading: Subject<number> = this.loaderService.isLoading;

  constructor(private loaderService: LoaderService) { }

  ngOnInit() {
  }

}
