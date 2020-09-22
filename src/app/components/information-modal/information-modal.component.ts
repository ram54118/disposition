import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';


@Component({
  selector: 'app-info-modal',
  templateUrl: './information-modal.component.html',
  styleUrls: ['./information-modal.component.scss']
})
export class InformationModalComponent implements OnInit {
  onClose: Subject<boolean>;
  title: string;
  messages = [];

  constructor(public bsModalRef: BsModalRef, private formBuilder: FormBuilder) {
    this.onClose = new Subject<boolean>();
  }

  ngOnInit() {

  }

  close() {
    this.bsModalRef.hide();
  }


}
