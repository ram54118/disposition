import { LoaderService } from './../../core/services/loader.service';
import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, ViewChild, Renderer2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { forkJoin, fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, takeUntil, tap, throttleTime } from 'rxjs/operators';
import { ReportModalComponent } from '../report-modal/report-modal.component';
import { InventoryService } from './../../core/services/inventory.service';
import { Inventory } from './../../models/inventory';
import { InformationModalComponent } from './../information-modal/information-modal.component';
import * as $ from 'jquery';// import Jquery here

enum LockStates {
  ACTIVATE_LOCK = 'ACTIVATE_LOCK',
  LOCK_ACTIVATED = 'LOCK_ACTIVATED',
  UN_LOCK = 'UN_LOCK'
}
const mainDomOccupiedHeight = 50;
@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, AfterViewInit, OnDestroy {
  public selectedInventoryType: string;
  public columnsList: { label: string, value: string, sort?: boolean, type?: any, width?: any }[];
  public selectedColumn: string;
  public selectedDisposition: string;
  private subscriptions$ = new Subject<void>();
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
  metaData;
  loadingInBackground: boolean;
  totalPaginationRecords: number; // total records on table
  public inventoryList: Inventory[]; // records to show on table view
  public totalinventoryList: Inventory[]; // total inventory list from API
  public selectedInventoryList: Inventory[] = []; // selected list by checkbox
  public storesList: Inventory[] = []; // stores list
  public returnsList: Inventory[] = []; // returns list
  public destroyList: Inventory[] = []; // destroy list
  public paginationRecords: Inventory[]; // records to show on table
  maxList = 1000;
  queryParams;
  mainElement: HTMLElement;
  previousHeight: number;
  private isModalOpen: boolean;
  start: any;
  pressed: boolean;
  startX: any;
  startWidth: any;
  isInitSet: boolean = false;
  isColumnResized: boolean = false;
  allTdWidth = [];
  onMouseDownIndex = -1;
  bgColorWidth = 0;
  @ViewChild('searchFilter', { static: false }) searchFilter;
  @ViewChild('inventoryTable', { static: false }) public inventoryTable: any;
  constructor(private ngZone: NgZone, private inventoryService: InventoryService,
    private modalService: BsModalService, private activatedRoute: ActivatedRoute,
    public renderer: Renderer2, private loaderService: LoaderService) { }
  ngOnInit() {

    this.onPageLoad();
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
        label: 'Action',
        type: 'string'
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
        type: 'string'
      },
      {
        label: 'Description (unblinded)',
        value: 'COMPONENT_DESCRIPTION',
        type: 'string'
      },
      {
        label: 'Lot ID (Manufacturer)',
        value: 'MANUFACTURERS_LOT_NUMBER',
        type: 'string'
      },
      {
        label: 'Lot ID (Client)',
        value: 'CLIENT_LOT_NUMBER',
        type: 'string'
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
        type: 'string'
      },
      {
        label: 'Client Container ID',
        value: 'CLIENT_CONTAINER_NUMBER',
        type: 'string'
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
        type: 'string'
      },

      {
        label: 'Unit of Measure',
        value: 'UOM',
        type: 'string'
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
        this.lockState = LockStates.ACTIVATE_LOCK;
        this.lockLable = 'Activate lock';
        break;
    }
    this.addLeftPsotionstoTable();
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
      this.getTableDataByType(this.selectedInventoryType);
      this.paginationRecords = this.paginationRecords.filter(inventory => {
        return String(inventory[this.selectedColumn]).toLowerCase().indexOf(value.toLowerCase()) >= 0;
      });
      this.inventoryList = this.paginationRecords.slice(0, this.recordsPerScreen);
      this.totalPaginationRecords = this.paginationRecords.length;
    } else {
      // this.inventoryList = this.paginationRecords.slice(0, this.recordsPerScreen);
      // this.totalPaginationRecords = this.paginationRecords.length;
      this.showOnlyTableData(this.selectedInventoryType);
    }
    this.addLeftPsotionstoTable();
  }

  selectInventory(inventory: Inventory) {
    if (inventory.isSelect) {
      this.selectedInventoryList.push(inventory);
      this.selectAll = this.inventoryList.every(inv => inv.isSelect !== undefined && inv.isSelect === true);
    } else {
      const inventoryIndex = this.selectedInventoryList.findIndex(selectedInventory => selectedInventory.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
      this.selectedInventoryList.splice(inventoryIndex, 1);
      this.selectAll = false;
    }
  }

  selectOrUnSelectAll(event: any) {
    if (event.target.checked) {
      this.inventoryList.forEach(inventory => inventory.isSelect = true);
      this.selectedInventoryList = [...this.selectedInventoryList, ...this.inventoryList];

    } else {
      this.inventoryList.forEach(inventory => {
        inventory.isSelect = false;
        const selectedInvIndex = this.selectedInventoryList.findIndex(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
        this.selectedInventoryList.splice(selectedInvIndex, 1);
      });
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
    this.paginationRecords.forEach(inventory => inventory.isSelect = false);
    this.selectedInventoryList = [];
    this.showOnlyTableData(this.selectedInventoryType);
    this.calculatePaginatorPoints();
  }

  showAll() {
    this.inventoryList = [...this.totalinventoryList.slice(0, this.recordsPerScreen)];
    this.paginationRecords = [...this.totalinventoryList];
    this.totalPaginationRecords = this.paginationRecords.length;
    this.addLeftPsotionstoTable();
    this.selectedInventoryType = '';
    this.calculatePaginatorPoints();
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
      setTimeout(() => {
        this.selectedDisposition = null;
      });

      this.selectAll = false;
      if ((this.returnsList.length > 0 || this.destroyList.length > 0)) {
        this.showCompleteBtn = true;
      } else {
        this.showCompleteBtn = false;
      }
      if (this.selectedInventoryType) {
        this.showOnlyTableData(this.selectedInventoryType);
      }
    }
  }

  onDispositionChange() {
    this.act(this.selectedDisposition);
    this.calculatePaginatorPoints();
  }

  showOnlyTableData(type: string) {
    this.getTableDataByType(type);
    this.totalPaginationRecords = this.paginationRecords.length;
    this.inventoryList = [...this.paginationRecords.slice((this.goToPage - 1) * this.recordsPerScreen,
      this.goToPage * this.recordsPerScreen)];
    this.addLeftPsotionstoTable();
    this.calculatePaginatorPoints();
  }

  private getTableDataByType(type) {
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
      default:
        this.showAll();
    }
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
          let colName = element.innerText.trim().toLowerCase().replace('keyboard_arrow_up', '');
          colName = colName.replace('keyboard_arrow_down', '');
          colName = colName.replace('\n', '');
          if (this.lockedColumns.find(col => col.label && col.label.trim().toLowerCase().includes(colName))) {
            console.log('colName', colName);
            element.style.left = this.lockState === LockStates.ACTIVATE_LOCK ? 'auto' : (left - 1) + 'px';

            for (let j = i; j < data.length; j += headers.length) {
              const td = data[j];
              td.style.left = this.lockState === LockStates.ACTIVATE_LOCK ? 'auto' : (left - 1) + 'px';
            }
          }

          // console.log('colName', colName);
          left += headers[i].offsetWidth;
        }
      }
      this.lockedColumns = this.lockState === LockStates.ACTIVATE_LOCK ? [] : this.lockedColumns;
    }, 100);
  }

  selectColumn(event) {
    this.selectedColumn = event.target.value;
  }
  ngOnDestroy() {
    this.subscriptions$.next();
    this.subscriptions$.complete();
  }

  sortColumn(column: any, index: number, event: any) {
    if (this.isColumnResized) {
      this.isColumnResized = false;
      return;
    }
    if (this.lockState !== this.states.LOCK_ACTIVATED) {
      if (column.label !== 'Action') {
        column.sort = column.sort ? false : true;
        let sortingList;
        switch (column.type) {
          case ('string'):
            if (column.sort) {
              sortingList = this.paginationRecords.sort(function (a, b) {
                return a[column.value] === null ? -1 : b[column.value] === null ? 1 : a[column.value].toString().localeCompare(b[column.value]);
              });
            } else {
              sortingList = this.paginationRecords.sort(function (a, b) {
                return b[column.value] === null ? -1 : a[column.value] === null ? 1 : b[column.value].toString().localeCompare(a[column.value]);
              });
            }
            break;
          case ('date'):
            if (column.sort) {
              sortingList = this.paginationRecords.sort((a, b) =>
                b[column.value] !== null && a[column.value] !== null && new Date(b[column.value]).valueOf() - new Date(a[column.value]).valueOf());
            } else {
              sortingList = this.paginationRecords.sort((a, b) =>
                b[column.value] !== null && a[column.value] !== null && new Date(a[column.value]).valueOf() - new Date(b[column.value]).valueOf());
            }
            break;
          default:
            if (column.sort) {
              sortingList = this.paginationRecords.sort((a, b) => b[column.value] !== null && a[column.value] !== null && a[column.value].localeCompare(b[column.value]));
            } else {
              sortingList = this.paginationRecords.sort((a, b) => b[column.value] !== null && a[column.value] !== null && b[column.value].localeCompare(a[column.value]));
            }
        }
        this.inventoryList = sortingList.slice(0, this.recordsPerScreen);
        this.addLeftPsotionstoTable();
      }
    } else {
      this.lockOrUnLockColumn(index);
    }

    const col = this.columnsList[index];
    const thEle = $('.table tr th:nth-child(' + (index + 1) + ')');
    const maxWidth = thEle.css('max-width');
    if (maxWidth && maxWidth != 'none') {
      const width = parseInt(maxWidth.replace(/[^0-9]/g, ''));
      col['width'] = width;
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
        const modal = this.showInfoModal('Disposition Report', ['Your disposition report has been generated:', 'Access the report from the Reporting dashboard. Please print, review and sign, then provide to your Project Manager for further processing.']);
        window.open(response.result.data.report_url, '_blank');
        modal.content.onClose.subscribe(() => {
          if (response.result.data.report_url) {
            const elem = parent.document.getElementsByClassName('goBackToReport')[0] as HTMLElement;
            elem.click();
            this.loaderService.show();
          }
        });
      })
    ).subscribe();
  }



  public onKeyUpEvent(event: any): void {
    if (event.keyCode === 13) {
      this.goToPage = parseInt(event.target.value);
      if (this.goToPage > this.noOfPages) {
        this.goToPage = this.noOfPages;
      }
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

  discardDisposition() {
    this.loaderService.show();
    const element = parent.document.getElementsByClassName('goBackToReport');
    const firstElement = element[0] as HTMLElement;
    if (element && firstElement) {
      firstElement.click();
    }
  }

  private onPageLoad() {
    this.ngZone.runOutsideAngular(() => {
      // interval to show modal for every 2mins
      window.setInterval(() => {
        if (!this.isModalOpen) {
          this.isModalOpen = true;
          const modal = this.showInfoModal('Please save your changes.', '');
          modal.content.onClose.subscribe(() => {
            this.isModalOpen = false;
          });
        }

      }, 300000);

      // interval to change iframe height
      window.setInterval(() => {
        const iFrame: any = parent.document.querySelector('#right-content iframe');
        const containerHeight = document.querySelector('#main-container').clientHeight;
        if (iFrame && containerHeight !== this.previousHeight) {
          this.previousHeight = containerHeight;
          iFrame.style.height = containerHeight + mainDomOccupiedHeight + 'px';
        }
      }, 50);

      // interval to click some element
      window.setInterval(() => {
        const backToREportElem = parent.document.getElementsByClassName('sessionButton');
        if (backToREportElem && backToREportElem[0]) {
          const elem = backToREportElem[0] as HTMLElement;
          elem.click();
        }
      }, 60000);

      // hiding some parent div element
      const emptyDiv = parent.document.getElementById('pt1:breadcrumbTrail');
      if (emptyDiv) {
        emptyDiv.style.cssText = 'display:none; height: 0px';
      }
    });
  }

  // Column Width Adjuster
  public onMouseDown(event, index) {
    if (event.target.className === 'ui-column-resizer') {
      this.pressed = true;
    }
    this.start = event.target;
    this.startX = event.x;
    this.startWidth = $(this.start).parent().width();
    this.onMouseDownIndex = index;
    if (!this.isInitSet && event.target.className === 'ui-column-resizer') {
      this.initResizableColumns();
      this.isInitSet = true;
    }
  }

  private initResizableColumns() {
    this.renderer.listen('body', 'mousemove', (event) => {
      if (this.pressed && this.isThElements($(this.start).parent())) {
        this.resizeAllColumn(event);
      }
    });
    this.renderer.listen('body', 'mouseup', (event) => {
      if (this.pressed) {
        this.pressed = false;
        if (this.lockState !== LockStates.LOCK_ACTIVATED) {
          this.addLeftPsotionstoTable();
        }
      }
    });
  }

  private resizeAllColumn(event: any) {
    let width = this.startWidth + (event.x - this.startX + 16);
    const thEle = $(this.start).parent();
    thEle.css({ 'min-width': width, 'max-width': width });
    thEle.find("div.column-name").css({ 'width': width - 8 });
    let i = $(this.start).parent().index() + 1;
    $('.table tr td:nth-child(' + i + ')').css({ 'min-width': width, 'max-width': width });
    $('.table tr td:nth-child(' + i + ')').find("div.col-value").css({ 'width': width - 15 });
    this.isColumnResized = true;
    this.columnsList[this.onMouseDownIndex]['width'] = width;
    if (this.lockedColumns.length > 0 && this.lockState !== LockStates.LOCK_ACTIVATED) {
      this.addLeftPsotionstoTable();
    }
  }

  private isThElements(arr: any): boolean {
    for (let i = 0; arr && i < arr.length; i++) {
      const item = arr[i];
      const tagName = item.tagName.toString().toLowerCase().trim();
      if (tagName === 'th') {
        return true;
      }
    }
    return false;
  }
}