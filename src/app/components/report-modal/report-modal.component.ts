import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';


@Component({
  selector: 'app-report-modal',
  templateUrl: './report-modal.component.html',
  styleUrls: ['./report-modal.component.scss']
})
export class ReportModalComponent implements OnInit {
  onClose: Subject<boolean>;
  title: string;
  reportForm: FormGroup;

  constructor(public bsModalRef: BsModalRef, private formBuilder: FormBuilder) {
    this.onClose = new Subject<boolean>();
  }

  ngOnInit() {
    this.reportForm = this.formBuilder.group(
      {
        reportName: ['', Validators.required],
        reportDescription: ['', Validators.required],
      }
    );
  }

  close() {
    this.bsModalRef.hide();
  }

  saveReport() {
    if (this.reportForm.valid) {
      this.bsModalRef.hide();
      this.onClose.next(this.reportForm.value);
    }
  }
}
