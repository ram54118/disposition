import { InformationModalComponent } from './../information-modal/information-modal.component';
import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subject, forkJoin, Observable, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil, tap, throttleTime, switchMap, filter } from 'rxjs/operators';
import { ReportModalComponent } from '../report-modal/report-modal.component';
import { InventoryService } from './../../core/services/inventory.service';
import { Inventory } from './../../models/inventory';
import { ActivatedRoute } from '@angular/router';
import { PdfModalComponent } from '../pdf-modal/pdf-modal.component';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

enum LockStates {
  ACTIVATE_LOCK = 'ACTIVATE_LOCK',
  LOCK_ACTIVATED = 'LOCK_ACTIVATED',
  UN_LOCK = 'UN_LOCK'
}
const mainDomOccupiedHeight = 150;
@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, AfterViewInit, OnDestroy {
  public selectedInventoryType: string;
  public inventoryList: Inventory[];
  public totalinventoryList: Inventory[];
  public selectedInventoryList: Inventory[] = [];
  public storesList: Inventory[] = [];
  public returnsList: Inventory[] = [];
  public destroyList: Inventory[] = [];
  public columnsList: { label: string, value: string, sort?: boolean, type?: any }[];
  public selectedColumn: string;
  public selectedDisposition: string;
  private subscriptions$ = new Subject<void>();
  public paginationRecords: Inventory[];
  public selectAll = false;
  public searchValue: string;
  public dispositionTypes;
  public recordsPerScreenOptions = [5, 10, 15, 20, 25, 30];
  public recordsPerScreen = 5;
  public lockedColumns: { label: string, value: string, sort?: boolean }[] = [];
  public unLockedColumns: { label: string, value: string, sort?: boolean }[] = [];
  public lockLable = 'Activate lock';
  public lockState: LockStates = LockStates.ACTIVATE_LOCK;
  public currentPage = 1;
  public goToPage = 1;
  public noOfPages = 0;
  public startIndex = 0;
  public endIndex = 0;
  showCompleteBtn: boolean;
  bsModalRef: BsModalRef;
  states = LockStates;
  totalRecords: number;
  metaData;
  loadingInBackground: boolean;
  totalPaginationRecords: number;
  maxList = 1000;
  queryParams;
  mainElement: HTMLElement;
  previousHeight: number;
  @ViewChild('searchFilter', { static: false }) searchFilter;
  @ViewChild('inventoryTable', { static: false }) public inventoryTable: any;
  constructor(private ngZone: NgZone, private inventoryService: InventoryService, private modalService: BsModalService, private activatedRoute: ActivatedRoute) { }
  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      window.setInterval(() => {
        const iFrame: any = parent.document.querySelector('#right-content iframe');
        const containerHeight = document.querySelector('#main-container').clientHeight;
        if (iFrame && containerHeight !== this.previousHeight) {
          this.previousHeight = containerHeight;
          iFrame.style.height = containerHeight + mainDomOccupiedHeight + 'px';
        }
      }, 50);
    });
    this.activatedRoute.queryParams.pipe(
      tap(params => {
        if (!(params.USER_ID && params.REPORT_ID && params.DISPOSITION_HEADER_TOKEN)) {
          this.showInfoModal('Information', ['Query params missing']);
        } else {
          this.queryParams = {
            USER_ID: params.USER_ID,
            REPORT_ID: params.REPORT_ID,
            DISPOSITION_HEADER_TOKEN: params.DISPOSITION_HEADER_TOKEN
          };
        }
      }),
      filter(params => !!(this.queryParams)),
      switchMap(params => this.getInventoryListCount())
    ).subscribe();

    this.dispositionTypes = [
      {
        label: 'Return',
        value: 'return'
      },
      {
        label: 'Destroy',
        value: 'destroy'
      },
      {
        label: 'Store',
        value: 'allOthers'
      }
    ];
    this.columnsList = [
      {
        value: 'check_box',
        label: ''
      },
      {
        value: 'DISPOSITION_STATUS_ID',
        label: 'Type',
        type: 'number'
      },
      {
        label: 'Client',
        value: 'CLIENT_NAME',
        type: 'string'
      },
      {
        label: 'Protocol',
        value: 'PROTOCOL',
        type: 'string'
      },
      {
        label: 'Facility',
        value: 'FACILITY_NAME',
        type: 'string'
      },
      {
        label: 'Part ID',
        value: 'COMPONENT_CODE',
        type: 'string'
      },
      {
        label: 'Client Part ID',
        value: 'CLIENT_PRODUCT_ID',
        type: 'number'
      },
      {
        label: 'Description (unblinded)',
        value: 'COMPONENT_DESCRIPTION',
        type: 'string'
      },
      {
        label: 'Lot ID (Manufacturer)',
        value: 'MANUFACTURERS_LOT_NUMBER',
        type: 'number'
      },
      {
        label: 'Lot ID (Client)',
        value: 'CLIENT_LOT_NUMBER',
        type: 'number'
      },
      {
        label: 'Expiry Date',
        value: 'BATCH_EXPIRATION_DATE',
        type: 'date'
      },
      {
        label: 'Receipt ID',
        value: 'RECEIPT_CODE',
        type: 'string'
      },
      {
        label: 'Box ID',
        value: 'BOX_CODE',
        type: 'number'
      },
      {
        label: 'Client Container ID',
        value: 'CLIENT_CONTAINER_NUMBER',
        type: 'number'
      },
      {
        label: 'Lot Status',
        value: 'BATCH_STATUS',
        type: 'string'
      },
      {
        label: 'Box Status',
        value: 'INVENTORY_STATUS',
        type: 'string'
      },
      {
        label: 'Quantity',
        value: 'QUANTITY',
        type: 'number'
      },

      {
        label: 'Unit of Measure',
        value: 'UOM',
        type: 'number'
      },
      {
        label: 'Sample Type',
        value: 'SAMPLE_TYPE',
        type: 'string'
      },
      {
        label: 'Warehouse',
        value: 'WAREHOUSE_NAME',
        type: 'string'
      },
      {
        label: 'Location',
        value: 'STORAGE_LOCATION',
        type: 'string'
      },
    ];

    fromEvent(window, 'resize').pipe(
      debounceTime(500),
      throttleTime(500),
      tap(() => {
        this.addLeftPsotionstoTable();
      })).subscribe();
  }

  getInventoryListCount() {
    this.loadingInBackground = true;
    return this.inventoryService.getInventoryListCount(this.queryParams).pipe(
      tap(list => {
        if (list.result.data.record_count === 0) {
          this.showInfoModal('Information', ['No records Available']);
          this.loadingInBackground = false;
        } else {
          this.metaData = list.result.data;
          this.totalPaginationRecords = list.result.data.record_count;
        }
      }),
      filter(list => !!(list && list.result.data.record_count)),
      switchMap(result => this.getTotalRecords())
    );
  }

  getTotalRecords(): Observable<any> {
    const callsList = this.metaData.record_count / this.maxList;
    const requests = [];
    for (let i = 0; i < callsList; i++) {
      requests.push(this.getDispositionListByRows(this.maxList * i + 1, this.maxList * (i + 1)));
    }

    return forkJoin(requests).pipe(
      map((response: any) => response.map(r => r.result.data.getDispositionDetOutput)),
      tap(response => {
        const remainIngList = response.flat(1);
        this.totalinventoryList = [...remainIngList];
        this.paginationRecords = [...this.totalinventoryList];
        this.getCategories();
        this.loadingInBackground = false;
        this.inventoryList = this.totalinventoryList.slice(0, this.recordsPerScreen);
        this.addLeftPsotionstoTable();

        this.goToPage = 1;
        this.calculatePaginatorPoints();
      })
    );
  }

  getCategories() {
    this.storesList = this.totalinventoryList.filter(inv => !(inv.DISPOSITION_STATUS_ID === 2 || inv.DISPOSITION_STATUS_ID === 3));
    this.returnsList = this.totalinventoryList.filter(inv => inv.DISPOSITION_STATUS_ID === 2);
    this.destroyList = this.totalinventoryList.filter(inv => inv.DISPOSITION_STATUS_ID === 3);
    if ((this.returnsList.length > 0 || this.destroyList.length > 0)) {
      this.showCompleteBtn = true;
    }
  }

  getDispositionListByRows(minRow, maxRow) {
    return this.inventoryService.getInventoryList(minRow, maxRow, this.queryParams);
  }

  changeLockState() {
    switch (this.lockState) {
      case (LockStates.ACTIVATE_LOCK):
        this.lockState = LockStates.LOCK_ACTIVATED;
        this.lockLable = 'Lock';
        break;
      case (LockStates.LOCK_ACTIVATED):
        this.lockState = LockStates.UN_LOCK;
        this.lockLable = 'Unlock';
        break;
      case (LockStates.UN_LOCK):
        this.lockedColumns = [];
        this.lockState = LockStates.ACTIVATE_LOCK;
        this.lockLable = 'Activate lock';
        break;

    }
  }

  lockOrUnLockColumn(index: number) {
    this.lockedColumns = this.columnsList.slice(0, index + 1);
    this.unLockedColumns = this.columnsList.slice(index + 1);
  }

  isColumnLocked(column: any): boolean {
    return !!(this.lockedColumns.find(col => col.value === column));
  }


  tableRecordsChanged() {
    this.inventoryList = this.paginationRecords.slice(0, this.recordsPerScreen);
    this.addLeftPsotionstoTable();
    this.calculatePaginatorPoints();
  }

  ngAfterViewInit() {
    fromEvent<any>(this.searchFilter.nativeElement, 'keyup')
      .pipe(
        takeUntil(this.subscriptions$),
        map(event => event.target.value),
        debounceTime(400),
        distinctUntilChanged(),
        tap(val => this.filterTableFromValue(val))
      ).subscribe();
  }

  filterTableFromValue(value: string) {
    if (value) {
      const list = this.paginationRecords.filter(inventory => {
        return String(inventory[this.selectedColumn]).indexOf(value) >= 0;
      });
      this.inventoryList = list.slice(0, this.recordsPerScreen);
      this.totalPaginationRecords = list.length;
    } else {
      this.inventoryList = this.paginationRecords.slice(0, this.recordsPerScreen);
      this.totalPaginationRecords = this.paginationRecords.length;
    }
    this.addLeftPsotionstoTable();
  }

  selectInventory(inventory: Inventory) {
    if (inventory.isSelect) {
      this.selectedInventoryList.push(inventory);
    } else {
      const inventoryIndex = this.selectedInventoryList.findIndex(selectedInventory => selectedInventory.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
      this.selectedInventoryList.splice(inventoryIndex, 1);
    }
  }

  selectOrUnSelectAll(event: any) {
    if (event.target.checked) {
      this.inventoryList.forEach(inventory => inventory.isSelect = true);
      this.selectedInventoryList = [...this.inventoryList];

    } else {
      this.inventoryList.forEach(inventory => inventory.isSelect = false);
      this.selectedInventoryList = [];
    }
  }

  public pageChanged(selectedPage) {
    this.inventoryList = [...this.paginationRecords.slice((selectedPage.page - 1) * this.recordsPerScreen,
      selectedPage.page * this.recordsPerScreen)];
    this.addLeftPsotionstoTable();
    if (this.inventoryList && this.inventoryList.length) {
      this.selectAll = this.inventoryList.every(inv => inv.isSelect !== undefined && inv.isSelect === true);
    } else {
      this.selectAll = false;
    }
    this.goToPage = selectedPage.page;
    this.calculatePaginatorPoints();
  }

  reset() {
    this.getCategories();
    this.selectedColumn = null;
    this.searchValue = null;
    this.selectedDisposition = null;
    this.inventoryList.forEach(inventory => inventory.isSelect = false);
    this.selectedInventoryList = [];
  }

  showAll() {
    this.inventoryList = [...this.totalinventoryList.slice(0, this.recordsPerScreen)];
    this.paginationRecords = [...this.totalinventoryList];
    this.totalPaginationRecords = this.paginationRecords.length;
    this.addLeftPsotionstoTable();
    this.selectedInventoryType = '';
  }

  act(type: string) {
    if (type) {
      switch (type) {
        case ('allOthers'):
          this.selectedInventoryList.forEach(inventory => {
            const storeIndex = this.storesList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (storeIndex === -1) {
              inventory.isNewlyAdded = true;
              inventory.DISPOSITION_STATUS_ID = 1;
              this.storesList.push(inventory);
            }

            const returnIndex = this.returnsList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (returnIndex >= 0) {
              this.returnsList.splice(returnIndex, 1);
            }

            const destroyIndex = this.destroyList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (destroyIndex >= 0) {
              this.destroyList.splice(destroyIndex, 1);
            }
          });
          break;
        case ('return'):
          this.selectedInventoryList.forEach(inventory => {
            const returnIndex = this.returnsList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (returnIndex === -1) {
              inventory.isNewlyAdded = true;
              inventory.DISPOSITION_STATUS_ID = 2;
              this.returnsList.push(inventory);
            }

            const storesIndex = this.storesList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (storesIndex >= 0) {
              this.storesList.splice(storesIndex, 1);
            }

            const destroyIndex = this.destroyList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (destroyIndex >= 0) {
              this.destroyList.splice(destroyIndex, 1);
            }
          });
          break;
        case ('destroy'):
          this.selectedInventoryList.forEach(inventory => {
            const destroyIndex = this.destroyList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (destroyIndex === -1) {
              inventory.isNewlyAdded = true;
              inventory.DISPOSITION_STATUS_ID = 3;
              this.destroyList.push(inventory);
            }
            const storesIndex = this.storesList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (storesIndex >= 0) {
              this.storesList.splice(storesIndex, 1);
            }

            const retunsIndex = this.returnsList.findIndex(inventoryFromList => inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
            if (retunsIndex >= 0) {
              this.returnsList.splice(retunsIndex, 1);
            }
          });
          break;
      }
      this.inventoryList.forEach(inventory => inventory.isSelect = false);
      this.storesList.forEach(inventory => inventory.isSelect = false);
      this.selectedInventoryList = [];
      this.selectAll = false;
      if ((this.returnsList.length > 0 || this.destroyList.length > 0)) {
        this.showCompleteBtn = true;
      }
      if (this.selectedInventoryType) {
        this.showOnlyTableData(this.selectedInventoryType);
      }
    }
  }

  onDispositionChange() {
    this.act(this.selectedDisposition);
  }

  showOnlyTableData(type: string) {
    switch (type) {
      case ('store'):
        this.selectedInventoryType = 'store';
        this.paginationRecords = [...this.storesList];
        break;
      case ('return'):
        this.selectedInventoryType = 'return';
        this.paginationRecords = [...this.returnsList];
        break;
      case ('destroy'):
        this.selectedInventoryType = 'destroy';
        this.paginationRecords = [...this.destroyList];
        break;
    }
    this.totalPaginationRecords = this.paginationRecords.length;
    this.inventoryList = [...this.paginationRecords.slice(0, this.recordsPerScreen)];
    this.addLeftPsotionstoTable();
  }

  addLeftPsotionstoTable() {
    setTimeout(() => {
      const tableElement = this.inventoryTable ? this.inventoryTable.nativeElement : undefined;
      const headers = tableElement ? tableElement.querySelectorAll('th') : undefined;
      const data = tableElement ? tableElement.querySelectorAll('td') : undefined;

      if (headers && headers.length > 0) {
        let left = 0;
        for (let i = 0; i <= headers.length - 1; i++) {
          const element = headers[i];
          element.style.left = (left - 1) + 'px';
          const colName = element.innerText.trim();

          for (let j = i; j < data.length; j += headers.length) {
            const td = data[j];
            td.style.left = (left - 1) + 'px';
          }
          left += headers[i].offsetWidth;
        }
      }
    }, 100);
  }

  selectColumn(event) {
    this.selectedColumn = event.target.value;
  }
  ngOnDestroy() {
    this.subscriptions$.next();
    this.subscriptions$.complete();
  }


  sortColumn(column: any, index: number) {
    if (this.lockState !== this.states.LOCK_ACTIVATED) {
      column.sort = column.sort ? false : true;
      switch (column.type) {
        case ('number'):
          if (column.sort) {
            this.inventoryList = this.inventoryList.sort((a, b) => b[column.value] && a[column.value] && Number(b[column.value]) - Number(a[column.value]));
          } else {
            this.inventoryList = this.inventoryList.sort((a, b) => b[column.value] && a[column.value] && Number(a[column.value]) - Number(b[column.value]));
          }
          break;
        case ('string'):
          if (column.sort) {
            this.inventoryList = this.inventoryList.sort((a, b) => b[column.value] && a[column.value] && a[column.value].localeCompare(b[column.value]));
          } else {
            this.inventoryList = this.inventoryList.sort((a, b) => b[column.value] && a[column.value] && b[column.value].localeCompare(a[column.value]));
          }
          break;
        case ('date'):
          if (column.sort) {
            this.inventoryList = this.inventoryList.sort((a, b) =>
              b[column.value] && a[column.value] && new Date(b[column.value]).valueOf() - new Date(a[column.value]).valueOf());
          } else {
            this.inventoryList = this.inventoryList.sort((a, b) =>
              b[column.value] && a[column.value] && new Date(a[column.value]).valueOf() - new Date(b[column.value]).valueOf());
          }
          break;
        default:
          if (column.sort) {
            this.inventoryList = this.inventoryList.sort((a, b) => b[column.value] && a[column.value] && a[column.value].localeCompare(b[column.value]));
          } else {
            this.inventoryList = this.inventoryList.sort((a, b) => b[column.value] && a[column.value] && b[column.value].localeCompare(a[column.value]));
          }
      }
      this.addLeftPsotionstoTable();
    } else {
      this.lockOrUnLockColumn(index);
    }
  }

  public getReportDetails(headerFlag: string) {
    const initialState = {
      title: 'Disposition Report'
    };
    const bsModalRef = this.modalService.show(ReportModalComponent, {
      backdrop: 'static',
      keyboard: false,
      class: 'modal-md',
      initialState
    });
    bsModalRef.content.onClose.subscribe((response) => {
      const reportDetails = this.totalinventoryList[0];
      if (response && reportDetails) {
        const result = {
          user_id: reportDetails.REPORT_USER_ID,
          report_id: reportDetails.USER_REPORT_ID,
          disposition_header_token: reportDetails.REPORT_TOKEN_ID,
          disposition_header_flag: headerFlag,
          report_schedule_name: response.reportName,
          report_schedule_string: response.reportDescription,
          disposition_details: [{
            disposition_details_item: this.getDispositionList()
          }]
        };
        Object.assign(result, this.queryParams);
        this.inventoryService.sendDispositionDetains(result).pipe(
          tap((apiResponse: any) => {
            if (apiResponse.status.status_code === '200') {
              if (headerFlag === 'S') {
                this.showInfoModal('Information', [apiResponse.status.status_msg]);
              } else {
                this.openPDF([apiResponse.status.status_msg]);
              }
            } else {
              this.showInfoModal('Information', [apiResponse.status.status_msg]);
            }
          })
        ).subscribe();
      }
    });
  }

  private getDispositionList() {
    const returnsList = this.returnsList.filter(inv => inv.isNewlyAdded).map(returnVal => ({
      disposition_details_id: returnVal.DISPOSITION_DETAIL_ID, type: 'returns', disposition_details_status_id: 2
    }));
    const destroyList = this.destroyList.filter(inv => inv.isNewlyAdded).map(destroyVal => ({
      disposition_details_id: destroyVal.DISPOSITION_DETAIL_ID, type: 'destroy', disposition_details_status_id: 3
    }));

    const storeList = this.storesList.filter(inv => inv.isNewlyAdded).map(destroyVal => ({
      disposition_details_id: destroyVal.DISPOSITION_DETAIL_ID, type: 'store', disposition_details_status_id: 1
    }));

    return [...returnsList, ...destroyList, ...storeList];
  }

  private showInfoModal(title, messages) {
    const initialState = {
      messages,
      title
    };
    return this.modalService.show(InformationModalComponent, {
      backdrop: 'static',
      keyboard: false,
      class: 'modal-md info-modal',
      initialState
    });
  }

  private openPDF(messages) {
    this.inventoryService.getPDFUrl(this.queryParams).pipe(
      tap(response => {
        window.open(response.result.data.report_url, '_blank');
        const modal = this.showInfoModal('Disposition Report', ['Your disposition report has been generated:', 'Acces the report from the Reporting dashboard. Please print, review and sign, then provide to yout Project Manager for further processing.']);
        modal.content.onClose.subscribe(() => {
          if (response.result.data.report_url) {
            // const elem = parent.document.getElementsByClassName('goBackToReport')[0] as HTMLElement;
            // elem.click();
          }
        });
      })
    ).subscribe();
  }

  private openPdfModal(sucessMsg: string, url: string) {
    const initialState = {
      messages: [sucessMsg],
      title: 'Information',
      pdfUrl: url
    };
    const modal = this.modalService.show(PdfModalComponent, {
      backdrop: 'static',
      keyboard: false,
      class: 'modal-lg',
      initialState
    });
    modal.content.onClose.subscribe((response) => {
      // const el = parent.document.getElementsByClassName('goBackToReport')[0] as HTMLElement;
      // el.click();;
    });
  }

  public onKeyUpEvent(event: any): void {
    if (event.keyCode === 13) {
      this.goToPage = parseInt(event.target.value);
      this.currentPage = this.goToPage;
      this.calculatePaginatorPoints();
    }
  }

  private calculatePaginatorPoints() {
    this.recordsPerScreen = parseInt(this.recordsPerScreen.toString());
    this.noOfPages = Math.ceil(this.totalPaginationRecords / this.recordsPerScreen);
    this.startIndex = (this.goToPage - 1) * this.recordsPerScreen;
    this.endIndex = this.startIndex < this.totalPaginationRecords ? Math.min(this.startIndex + this.recordsPerScreen, this.totalPaginationRecords) : this.startIndex + this.recordsPerScreen;
  }
  discardDisposition(){
    const el = parent.document.getElementsByClassName('goBackToReport')[0] as HTMLElement;
    el.click();
  }
}
