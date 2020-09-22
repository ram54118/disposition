import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';


@Component({
    selector: 'app-pdf-modal',
    templateUrl: './pdf-modal.component.html',
    styleUrls: ['./pdf-modal.component.scss']
})
export class PdfModalComponent implements OnInit {
    onClose: Subject<boolean>;
    title: string;
    messages = [];
    pdfUrl: string;

    constructor(public bsModalRef: BsModalRef, private formBuilder: FormBuilder) {
        this.onClose = new Subject<boolean>();
    }

    ngOnInit() {
    }

    close() {
        this.bsModalRef.hide();
        this.onClose.next();
    }
}
