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
import * as $ from 'jquery'; // import Jquery here
import { cloneDeep, orderBy } from 'lodash';
import { DatePipe } from '@angular/common';
import { InventoryHelperService } from 'src/app/core/services/inventory-helper.service';


enum LockStates {
  ACTIVATE_LOCK = 'ACTIVATE_LOCK',
  LOCK_ACTIVATED = 'LOCK_ACTIVATED',
  UN_LOCK = 'UN_LOCK'
}
const mainDomOccupiedHeight = 50;
@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss'],
  providers: [DatePipe]
})
export class InventoryListComponent implements OnInit, AfterViewInit, OnDestroy {
  public selectedInventoryType: string;
  public columnsList: { label: string, value: string, sort?: boolean, type?: any, width?: any, id?: string }[];
  public selectedColumn: string;
  public selectedDisposition: string;
  private subscriptions$ = new Subject<void>();
  public selectAll = false;
  public searchValue: string;
  public dispositionTypes;
  public recordsPerScreenOptions = [5, 10, 15, 20, 25, 30];
  public recordsPerScreen = 5;
  public lockedColumns: { label: string, value: string, sort?: boolean, id?: string }[] = [];
  public unLockedColumns: { label: string, value: string, sort?: boolean, id?: string }[] = [];
  public lockLable = 'Activate lock';
  public lockState: LockStates = LockStates.ACTIVATE_LOCK;
  public currentPage = 1;
  public goToPage = 1;
  public noOfPages = 0;
  public startIndex = 0;
  public endIndex = 0;
  filterOptions;
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
  public storesListCopy: Inventory[] = []; // stores list
  public returnsListCopy: Inventory[] = []; // returns list
  public destroyListCopy: Inventory[] = []; // destroy list
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
  isInitSet = false;
  isColumnResized = false;
  allTdWidth = [];
  onMouseDownIndex = -1;
  bgColorWidth = 0;
  personalizedDataCopy;
  basicPersonalizedDataCopy;
  @ViewChild('searchFilter', { static: false }) searchFilter;
  @ViewChild('inventoryTable', { static: false }) public inventoryTable: any;
  constructor(private ngZone: NgZone, private inventoryService: InventoryService,
    private modalService: BsModalService, private activatedRoute: ActivatedRoute, private InventoryHelperService: InventoryHelperService,
    public renderer: Renderer2, private loaderService: LoaderService, private datePipe: DatePipe) { }
  ngOnInit() {
    this.inventoryService.getAssetCredentials().subscribe(data => {
      this.getQueryParams();
    });
    this.onPageLoad();
    this.ngZone.runOutsideAngular(() => {
      window.setInterval(() => {
        const iFrame: any = parent.document.querySelector('#right-content iframe');
        const containerHeight = document.querySelector('#main-container').clientHeight;
        if (iFrame && containerHeight !== this.previousHeight) {
          const pullOutContainer: any = parent.document.querySelector('#pulloutContainer');
          this.previousHeight = containerHeight;
          iFrame.style.height = containerHeight + mainDomOccupiedHeight + 'px';
          pullOutContainer.style.height = parent.document.documentElement.scrollHeight + 'px';
        }
      }, 50);
    });


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

    fromEvent(window, 'resize').pipe(
      debounceTime(500),
      throttleTime(500),
      tap(() => {
        this.addLeftPsotionstoTable();
      })).subscribe();
  }

  private getQueryParams() {
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
      switchMap(params => this.loadMetadata())
    ).subscribe();
  }

  loadMetadata() {
    return forkJoin([this.getInventoryListCount(), this.getMetaData()]);
  }

  private getMetaData() {
    return this.InventoryHelperService.getMetaData(this.queryParams).pipe(
      tap(response => {
        this.personalizedDataCopy = response.personalData;
        this.basicPersonalizedDataCopy = response.basic;
        this.loadPersonalizedData();
      }));
  }

  loadBasicPersonalizedData() {
    this.personalizedDataCopy = cloneDeep(this.basicPersonalizedDataCopy);
    this.loadPersonalizedData(true);
    this.savePersonalizedData(true);
  }

  loadPersonalizedData(fromReset?: boolean) {
    this.columnsList = cloneDeep(this.personalizedDataCopy.columnsList);
    this.recordsPerScreen = this.personalizedDataCopy.recordsPerScreen || 5;
    if (this.personalizedDataCopy.freezePosition) {
      this.lockState = LockStates.UN_LOCK;
      this.lockLable = 'Unlock';
      this.lockedColumns = this.columnsList.slice(0, this.personalizedDataCopy.freezePosition);
    } else if (this.personalizedDataCopy.lockedColumns && this.personalizedDataCopy.lockedColumns.length) {
      this.lockState = LockStates.UN_LOCK;
      this.lockLable = 'Unlock';
      this.lockedColumns = cloneDeep(this.personalizedDataCopy.lockedColumns);
    } else {
      this.lockState = LockStates.UN_LOCK;
      this.lockedColumns = [];
    }
    if (fromReset) {
      // this.showOnlyTableData(this.selectedInventoryType, false, true);
      this.getTableDataByType(this.selectedInventoryType, true);
      this.calculatePaginatorPoints();
      setTimeout(() => {
        this.moveColumns();
      });
    } else {
      this.filterOptions = this.columnsList.filter(col => col.label && col.label !== 'Action').map(col => ({ label: col.label, value: col.value }));
    }
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

  savePersonalizedData(isBasicData?: boolean) {
    const personalizedData = { columnsList: this.columnsList, recordsPerScreen: this.recordsPerScreen, lockedColumns: this.lockedColumns };
    this.InventoryHelperService.savePersonalizedData(personalizedData, this.queryParams).subscribe(res => {
      if (!isBasicData) {
        this.personalizedDataCopy = personalizedData;
        this.showInfoModal('Information', ['Personalized information saved']);
      } else {
        this.showInfoModal('Information', ['Clear Personalized information saved']);
      }
    });
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
        response[0].forEach((inv) => {
          inv.BATCH_EXPIRATION_DATE = inv.BATCH_EXPIRATION_DATE ?
            this.datePipe.transform(new Date(inv.BATCH_EXPIRATION_DATE), 'd/MMM/yyyy') : inv.BATCH_EXPIRATION_DATE
        });
        const remainIngList = response.flat(1);
        this.totalinventoryList = cloneDeep(remainIngList);
        this.paginationRecords = cloneDeep(this.totalinventoryList);
        this.getCategories(true);
        this.inventoryList = cloneDeep(this.totalinventoryList.slice(0, this.recordsPerScreen));
        this.addLeftPsotionstoTable();

        this.goToPage = 1;
        this.calculatePaginatorPoints();
        this.plsSaveYourChanges();
        const sortedColumns = this.columnsList.filter(col => col.hasOwnProperty('sort'));
        sortedColumns.forEach(col => this.sortColumn(col));
        setTimeout(() => {
          this.moveColumns();
        });
        this.loadingInBackground = false;
      })
    );
  }

  getCategories(isOnload?: boolean) {
    this.storesList = cloneDeep(this.totalinventoryList.filter(inv => !(inv.DISPOSITION_STATUS_ID === 2 || inv.DISPOSITION_STATUS_ID === 3)));
    this.returnsList = cloneDeep(this.totalinventoryList.filter(inv => inv.DISPOSITION_STATUS_ID === 2));
    this.destroyList = cloneDeep(this.totalinventoryList.filter(inv => inv.DISPOSITION_STATUS_ID === 3));
    if (isOnload) {
      this.storesListCopy = cloneDeep(this.storesList);
      this.returnsListCopy = cloneDeep(this.returnsList);
      this.destroyListCopy = cloneDeep(this.destroyList);
    }
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
    if (this.inventoryList.length < Number(this.recordsPerScreen)) {
      this.selectAll = false;
    } else if (this.selectAll) {
      const remainingList = cloneDeep(this.inventoryList.slice(this.recordsPerScreen));
      remainingList.forEach((inv) => {
        inv.isSelect = false;
        this.selectInventory(inv, true);
      });
    }
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
        // distinctUntilChanged(),
        tap(val => this.filterTableFromValue(val))
      ).subscribe();
  }

  filterTableFromValue(value: string) {
    if (value) {
      this.getFilterTableDataByType(this.selectedInventoryType);
      this.paginationRecords = this.paginationRecords.filter(inventory => {
        return String(inventory[this.selectedColumn]).toLowerCase().indexOf(value.toLowerCase()) >= 0;
      });
      this.inventoryList = this.paginationRecords.slice(0, this.recordsPerScreen);
      this.totalPaginationRecords = this.paginationRecords.length;
    } else {
      this.showOnlyTableData(this.selectedInventoryType, false, true);
    }
    this.addLeftPsotionstoTable();
    this.calculatePaginatorPoints();
    if (this.inventoryList && this.inventoryList.length) {
      this.selectAll = this.inventoryList.every(inv => inv.isSelect !== undefined && inv.isSelect === true);
    }
  }

  private getFilterTableDataByType(type) {
    switch (type) {
      case ('store'):
        this.paginationRecords = cloneDeep(this.totalinventoryList.filter(inv => !(inv.DISPOSITION_STATUS_ID === 2 || inv.DISPOSITION_STATUS_ID === 3)));
        break;
      case ('return'):
        this.paginationRecords = cloneDeep(this.totalinventoryList.filter(inv => inv.DISPOSITION_STATUS_ID === 2));
        break;
      case ('destroy'):
        this.paginationRecords = cloneDeep(this.totalinventoryList.filter(inv => inv.DISPOSITION_STATUS_ID === 3));
        break;
      default:
        this.paginationRecords = cloneDeep(this.totalinventoryList);
    }
  }

  selectInventory(inventory: Inventory, ignoreSelectAll?: boolean) {
    if (inventory.isSelect) {
      this.selectedInventoryList.push(inventory);
      if (!ignoreSelectAll) {
        this.selectAll = this.inventoryList.every(inv => inv.isSelect !== undefined && inv.isSelect === true);
      }
    } else {
      const inventoryIndex = this.selectedInventoryList.findIndex(selectedInventory => selectedInventory.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
      this.selectedInventoryList.splice(inventoryIndex, 1);
      if (!ignoreSelectAll) {
        this.selectAll = false;
      }
    }
    const paginationRecord = this.paginationRecords.find(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
    paginationRecord.isSelect = inventory.isSelect;

    const paginationRecordFromList = this.totalinventoryList.find(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
    paginationRecordFromList.isSelect = inventory.isSelect;
  }

  selectOrUnSelectAll(event: any) {
    if (event.target.checked) {
      this.inventoryList.forEach(inventory => {
        inventory.isSelect = true;
        const paginationRecord = this.paginationRecords.find(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
        paginationRecord.isSelect = inventory.isSelect;

        const paginationRecordFromList = this.totalinventoryList.find(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
        paginationRecordFromList.isSelect = inventory.isSelect;

        const selectedInvIndex = this.selectedInventoryList.findIndex(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
        if (selectedInvIndex === -1) {
          this.selectedInventoryList.push(inventory);
        }
      });

    } else {
      this.inventoryList.forEach(inventory => {
        inventory.isSelect = false;
        const selectedInvIndex = this.selectedInventoryList.findIndex(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
        this.selectedInventoryList.splice(selectedInvIndex, 1);
        const paginationRecord = this.paginationRecords.find(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
        paginationRecord.isSelect = inventory.isSelect;

        const paginationRecordFromList = this.totalinventoryList.find(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
        paginationRecordFromList.isSelect = inventory.isSelect;
      });
    }
  }

  public pageChanged(selectedPage) {
    this.inventoryList = cloneDeep(this.paginationRecords.slice((selectedPage.page - 1) * this.recordsPerScreen,
      selectedPage.page * this.recordsPerScreen));
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
    this.loadPersonalizedData(true);
    this.removeWidthOfHeaders();
    this.storesList = cloneDeep(this.storesListCopy);
    this.returnsList = cloneDeep(this.returnsListCopy);
    this.destroyList = cloneDeep(this.destroyListCopy);
    // this.recordsPerScreen = this.personalizedDataCopy.recordsPerScreen || 5;
    // this.lockState = LockStates.UN_LOCK;
    // this.changeLockState();
    // this.getCategories();
    this.selectedInventoryList = [];
    this.showOnlyTableData(this.selectedInventoryType);
    this.calculatePaginatorPoints();
    this.resetFilters();
    this.paginationRecords.forEach(inventory => inventory.isSelect = false);
    this.inventoryList.forEach(inventory => inventory.isSelect = false);
    setTimeout(() => {
      this.moveColumns();
    });
  }

  resetFilters() {
    this.selectedColumn = null;
    this.searchValue = null;
    this.selectedDisposition = null;
    this.columnsList.forEach(col => delete col.sort);
    this.selectAll = false;
    this.totalinventoryList.forEach(inv => inv.isSelect = false);
  }

  showAll(event?) {
    if (event) {
      this.resetFilters();
      this.inventoryList = [...cloneDeep(this.storesList), ...cloneDeep(this.destroyList), ...cloneDeep(this.returnsList)].slice(0, this.recordsPerScreen);
      this.paginationRecords = [...cloneDeep(this.storesList), ...cloneDeep(this.destroyList), ...cloneDeep(this.returnsList)];
    } else {
      this.inventoryList = cloneDeep(this.totalinventoryList.slice(0, this.recordsPerScreen));
      this.paginationRecords = cloneDeep(this.totalinventoryList);
    }
    this.totalPaginationRecords = this.paginationRecords.length;
    this.addLeftPsotionstoTable();
    this.selectedInventoryType = '';
    this.calculatePaginatorPoints();
    this.currentPage = 1;
  }

  moveDisposition(data, targetList, soruceList1, sourceList2, dispositionStatusId) {
    const inventory = cloneDeep(data);
    const targetIndex = targetList.findIndex(inventoryFromList =>
      inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
    if (targetIndex === -1) {
      inventory.isNewlyAdded = true;
      inventory.DISPOSITION_STATUS_ID = dispositionStatusId;
      inventory.isSelect = false;
      targetList.push(inventory);
    }

    const returnIndex = soruceList1.findIndex(inventoryFromList =>
      inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
    if (returnIndex >= 0) {
      soruceList1.splice(returnIndex, 1);
    }

    const destroyIndex = sourceList2.findIndex(inventoryFromList =>
      inventoryFromList.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
    if (destroyIndex >= 0) {
      sourceList2.splice(destroyIndex, 1);
    }

    const invOnTable = this.inventoryList.find(inv => inv.DISPOSITION_DETAIL_ID === data.DISPOSITION_DETAIL_ID);
    if (invOnTable) {
      invOnTable.DISPOSITION_STATUS_ID = dispositionStatusId;
    }
    const paginationRecord = this.paginationRecords.find(inv => inv.DISPOSITION_DETAIL_ID === inventory.DISPOSITION_DETAIL_ID);
    if (paginationRecord) {
      paginationRecord.DISPOSITION_STATUS_ID = dispositionStatusId;
    }
  }

  act(type: string) {
    if (type) {
      switch (type) {
        case ('allOthers'):
          this.selectedInventoryList.forEach(inventory => {
            this.moveDisposition(inventory, this.storesList, this.returnsList, this.destroyList, 1);
          });
          break;
        case ('return'):
          this.selectedInventoryList.forEach(inventory => {
            this.moveDisposition(inventory, this.returnsList, this.storesList, this.destroyList, 2);
          });
          break;
        case ('destroy'):
          this.selectedInventoryList.forEach(inventory => {
            this.moveDisposition(inventory, this.destroyList, this.storesList, this.returnsList, 3);
          });
          break;
      }
      this.inventoryList.forEach(inventory => inventory.isSelect = false);
      this.storesList.forEach(inventory => inventory.isSelect = false);
      this.paginationRecords.forEach(inv => inv.isSelect = false);
      this.totalinventoryList.forEach(inv => inv.isSelect = false);
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

  showOnlyTableData(type: string, clearFilters?: boolean, filterData?: boolean) {
    if (filterData) {
      this.getFilterTableDataByType(type);
    } else {
      this.getTableDataByType(type);
    }
    this.totalPaginationRecords = this.paginationRecords.length;
    this.addLeftPsotionstoTable();
    this.calculatePaginatorPoints();
    if (clearFilters) {
      this.resetFilters();
      this.inventoryList = cloneDeep(this.paginationRecords.slice(0, this.recordsPerScreen));
      this.currentPage = 1;
      this.selectedInventoryList = [];
    } else {
      this.inventoryList = cloneDeep(this.paginationRecords.slice((this.goToPage - 1) * this.recordsPerScreen,
        this.goToPage * this.recordsPerScreen));
    }
  }

  private getTableDataByType(type, listByType?: boolean) {
    switch (type) {
      case ('store'):
        this.selectedInventoryType = 'store';
        this.paginationRecords = cloneDeep(this.storesList);
        break;
      case ('return'):
        this.selectedInventoryType = 'return';
        this.paginationRecords = cloneDeep(this.returnsList);
        break;
      case ('destroy'):
        this.selectedInventoryType = 'destroy';
        this.paginationRecords = cloneDeep(this.destroyList);
        break;
      default:
        this.showAll(listByType);
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
          const colId = element.dataset.columId;
          if (this.lockedColumns.length && (!colId || this.lockedColumns.find(col => col.id == colId))) {
            element.style.left = this.lockState === LockStates.ACTIVATE_LOCK || this.lockState === LockStates.LOCK_ACTIVATED ? 'auto' : (left - 1) + 'px';
            for (let j = i; j < data.length; j += headers.length) {
              const td = data[j];
              td.style.left = this.lockState === LockStates.ACTIVATE_LOCK || this.lockState === LockStates.LOCK_ACTIVATED ? 'auto' : (left - 1) + 'px';
            }
          }


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
    const iFrame: any = parent.document.querySelector('#right-content iframe');
    if (iFrame) {
      const pullout = parent.document.querySelector('#pulloutContainer');
      pullout.remove();
    }
    this.subscriptions$.next();
    this.subscriptions$.complete();
  }

  sortColumn(column: any, index?: number) {
    if (this.isColumnResized) {
      this.isColumnResized = false;
      return;
    }
    if (this.lockState !== this.states.LOCK_ACTIVATED) {
      if (column.label !== 'Action') {
        column.sort = column.sort ? false : true;
        switch (column.type) {
          // case ('string'):
          //   this.paginationRecords = orderBy(this.paginationRecords, (o) => {
          //     return o[column.value];
          //   }, column.sort ? 'desc' : 'asc');
          //   break;
          case ('date'):
            this.paginationRecords = orderBy(this.paginationRecords, (o) => {
              return new Date(o[column.value]);
            }, column.sort ? 'desc' : 'asc');

            break;
          default:
            this.paginationRecords = orderBy(this.paginationRecords, (o) => {
              return o[column.value];
            }, column.sort ? 'desc' : 'asc');
        }
        this.inventoryList = (this.paginationRecords.slice((this.goToPage - 1) * this.recordsPerScreen,
          this.goToPage * this.recordsPerScreen));
        this.addLeftPsotionstoTable();
      }
    } else {
      this.lockOrUnLockColumn(index);
    }
    if (index) {
      const col = this.columnsList[index];
      const thEle = $('.table tr th:nth-child(' + (index + 1) + ')');
      const maxWidth = thEle.css('max-width');
      if (maxWidth && maxWidth != 'none') {
        const width = parseInt(maxWidth.replace(/[^0-9]/g, ''));
        col.width = width;
      }
    }
  }

  public getReportDetails(headerFlag: string) {
    const initialState = {
      title: 'Disposition Report'
    };
    this.isModalOpen = true;
    const bsModalRef = this.modalService.show(ReportModalComponent, {
      backdrop: 'static',
      keyboard: false,
      class: 'modal-md',
      initialState
    });
    this.showOrHideModalBackDrop(true);
    bsModalRef.content.onClose.subscribe((response) => {
      this.isModalOpen = false;
      this.showOrHideModalBackDrop(false);
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
                this.storesListCopy = cloneDeep(this.storesList);
                this.returnsListCopy = cloneDeep(this.returnsList);
                this.destroyListCopy = cloneDeep(this.destroyList);
                this.totalinventoryList = [...cloneDeep(this.storesList), ...cloneDeep(this.destroyList), ...cloneDeep(this.returnsList)];
                this.getTableDataByType(this.selectedInventoryType);
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
    this.isModalOpen = true;
    const initialState = {
      messages,
      title
    };

    const modal = this.modalService.show(InformationModalComponent, {
      backdrop: 'static',
      keyboard: false,
      class: 'modal-md info-modal',
      initialState
    });
    this.showOrHideModalBackDrop(true);
    modal.content.onClose.subscribe(() => {
      this.isModalOpen = false;
      this.showOrHideModalBackDrop(false);
    });
    return modal;
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
    setTimeout(() => {
      const spinner = document.querySelector('.spinner') as HTMLElement;
      spinner.style.top = this.getScrollPosition() + 'px';
      // this.showOrHideModalBackDrop(true);
    });
    const element = parent.document.getElementsByClassName('goBackToReport');
    const firstElement = element[0] as HTMLElement;
    if (element && firstElement) {
      firstElement.click();
    }
  }
  private plsSaveYourChanges() {
    this.ngZone.runOutsideAngular(() => {
      // interval to show modal for every 2mins
      window.setTimeout(() => {
        if (!this.isModalOpen) {
          const modal = this.showInfoModal('Please save your changes.', '');
          modal.content.onClose.subscribe(() => {
            this.plsSaveYourChanges();
          });
        }

      }, 300000);
    });
  }
  private onPageLoad() {
    const iFrame: any = parent.document.querySelector('#right-content iframe');
    if (iFrame) {
      const pullout = '<div id=\'pulloutContainer\'><div class=\'pull-out-handle\'><div class=\'pull-out-handle-icon\'>+</div></div><div class=\'seperator\'></div><div class=\'pull-out-panel\'><div class=\'panel-data\'><div class=\'title\'>Actions</div><div class=\'description\'>Global Gateway℠ puts you in control of the data. Here are some tools to help you make the most of it.</div><div class=\'sub-title\'>Save Table Settings</div><div class=\'message\'>Save table settings for future use within the module</div><div class=\'settings-buttons\'><button class=\'pull-out-save-btn btn btn-primary l-btn mr-2\' type=\'button\'>Save</button><button class=\'pull-out-clear-btn btn btn-primary l-btn mr-2\' type=\'button\'>clear</button></div></div></div></div>'
      $(parent.document.body).append(pullout);
      this.addPulloutEvents();
    }
    this.ngZone.runOutsideAngular(() => {
      // interval to change iframe height
      window.setInterval(() => {
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

      this.createModalBackDrop();
    });
  }

  private addPulloutEvents() {
    const pullOutContainer: any = parent.document.querySelector('#pulloutContainer');
    const handle = parent.document.querySelector('.pull-out-handle-icon');
    const saveBtn = parent.document.querySelector('.pull-out-save-btn');
    const clearBtn = parent.document.querySelector('.pull-out-clear-btn');
    const panel = parent.document.querySelector('.pull-out-panel');
    pullOutContainer.style.height = parent.document.documentElement.scrollHeight + 'px';
    handle.addEventListener('click', () => {
      showOrHidePanel(panel);
    }, false);

    saveBtn.addEventListener('click', () => {
      showOrHidePanel(panel);
      this.savePersonalizedData();
    }, false);

    clearBtn.addEventListener('click', () => {
      showOrHidePanel(panel);
      this.loadBasicPersonalizedData();
    }, false);

    function showOrHidePanel(panelContainer) {
      if (panelContainer.classList.contains('show-panel')) {
        panelContainer.classList.remove('show-panel');
      } else {
        panelContainer.classList.add('show-panel');
      }
    }
  }

  // Column Width Adjuster
  public onMouseDown(event, index) {
    if (event.stopPropagation) {
      event.stopPropagation();
    }
    if (event.preventDefault) {
      event.preventDefault();
    }
    if (event.target.classList.contains('ui-column-resizer')) {
      this.pressed = true;
    }
    this.start = event.target;
    this.startX = event.x;
    this.startWidth = $(this.start).parent().width();
    this.onMouseDownIndex = index;
    if (event.target.classList.contains('ui-column-resizer')) {
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
    width = width < 1 ? 1 : width;
    const thEle = $(this.start).parent();
    thEle.css({ 'min-width': width, 'max-width': width });
    thEle.find('div.column-name').css({ width: width - 8 });
    const i = $(this.start).parent().index() + 1;
    $('.table tr td:nth-child(' + i + ')').css({ 'min-width': width, 'max-width': width });
    $('.table tr td:nth-child(' + i + ')').find('div.col-value').css({ width: width - 15 });
    this.isColumnResized = true;
    this.columnsList[this.onMouseDownIndex].width = width;
    if (this.lockedColumns.length > 0 && this.lockState !== LockStates.LOCK_ACTIVATED) {
      this.addLeftPsotionstoTable();
    }
  }

  private moveColumns() {
    let _this = this;
    const $table = $('#inv-table');
    const cols = $table.find('thead tr th');
    const options = {
      drag: true,
      dragClass: 'drag',
      movedContainerSelector: '.move-column',
      overClass: 'over',
      onDragEnd: ''
    };
    let dragSrcEl;
    let dragSrcEnter;
    [].forEach.call(cols, (col) => {
      col.setAttribute('draggable', true);
      $(col).on('dragstart', handleDragStart);
      $(col).on('dragenter', handleDragEnter);
      $(col).on('dragover', handleDragOver);
      $(col).on('dragleave', handleDragLeave);
      $(col).on('drop', handleDrop);
      $(col).on('dragend', handleDragEnd);
    });

    function handleDragStart(e) {

      $(e.target).addClass(options.dragClass);
      dragSrcEl = e.currentTarget;
      e.originalEvent.dataTransfer.effectAllowed = 'copy';
      e.originalEvent.dataTransfer.setData('text/html', e.target.id);
    }

    function handleDragOver(e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.originalEvent.dataTransfer.dropEffect = 'copy';
      return;
    }
    function handleDragEnter(e) {
      this.dragSrcEnter = e.target;
      [].forEach.call(cols, function (col) {
        $(col).removeClass(options.overClass);
      });
      $(e.target).addClass(options.overClass);
      return;
    }
    function handleDragLeave(e) {
      if (dragSrcEnter !== e) {
      }
    }
    function handleDrop(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      if (dragSrcEl !== e) {
        copyColumns($(dragSrcEl).index(), $(this).index());
      }
      return;
    }
    function handleDragEnd(e) {
      const colPositions = {
        array: [],
        object: {}
      };
      [].forEach.call(cols, function (col) {
        const name = $(col).attr('data-name') || $(col).index();
        $(col).removeClass(options.overClass);
        colPositions.object[name] = $(col).index();
        colPositions.array.push($(col).index());
      });
      $(dragSrcEl).removeClass(options.dragClass);
      return;
    }

    function insertAfter(elem, refElem) {
      return refElem.parentNode.insertBefore(elem, refElem.nextSibling);
    }

    function copyColumns(fromIndex, toIndex) {
      if (fromIndex >= 2 && toIndex >= 2) {
        const rows = $table.find(options.movedContainerSelector);
        for (let i = 0; i < rows.length; i++) {
          if (toIndex > fromIndex) {
            insertAfter(rows[i].children[fromIndex], rows[i].children[toIndex]);
          } else if (toIndex < $table.find('thead tr th').length - 1) {
            rows[i].insertBefore(rows[i].children[fromIndex], rows[i].children[toIndex]);
          }
        }
        const col = _this.columnsList[fromIndex];
        _this.columnsList.splice(fromIndex, 1);
        _this.columnsList.splice(toIndex, 0, col);
        // _this.initResizableColumns();
      }
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

  private removeWidthOfHeaders(): void {
    const tableElement = this.inventoryTable ? this.inventoryTable.nativeElement : undefined;
    for (let i = 0; i < this.columnsList.length; i++) {
      if (this.columnsList[i].width) {
        delete this.columnsList[i].width;
      }
    }
    const headers = tableElement ? tableElement.querySelectorAll('th') : undefined;
    for (let i = 0; headers && i < headers.length; i++) {
      headers[i].style.removeProperty('width');
      headers[i].style.removeProperty('min-width');
      headers[i].style.removeProperty('max-width');
      const column = headers[i].querySelectorAll('.column-name');
      for (let j = 0; column && j < column.length; j++) {
        column[j].style.removeProperty('width');
      }
    }
  }

  private createModalBackDrop() {
    const iFrame: any = parent.document.querySelector('#right-content iframe');
    const backdrop = parent.document.querySelector('.modal-back-drop');
    if (iFrame && !backdrop) {
      const elemDiv = document.createElement('div');
      elemDiv.classList.add('modal-back-drop');
      elemDiv.style.cssText = 'top:0;position:fixed;width:100%;height:100%;opacity:0.5;z-index:9999;background:#000;display:none';
      parent.document.body.appendChild(elemDiv);
    }
  }

  private showOrHideModalBackDrop(val: boolean) {
    const modalBackDrop = parent.document.getElementsByClassName('modal-back-drop');
    if (modalBackDrop && modalBackDrop[0]) {
      const iFrame: any = parent.document.querySelector('#right-content iframe');
      if (iFrame && val) {
        iFrame.style['z-index'] = 99999;
        const scrollPosition = this.getScrollPosition();
        const modals = document.querySelectorAll('.modal') as any;
        if (modals && modals.length) {
          modals.forEach(modal => modal.style.top = scrollPosition + 'px');
        }
      } else {
        iFrame.style['z-index'] = 9;
      }

      const elem = modalBackDrop[0] as HTMLElement;
      elem.style.cssText = val ? 'top:0;position:fixed;width:100%;height:100%;opacity:0.5;z-index:9999;background:#000;display:block' :
        'top:0;position:fixed;width:100%;height:100%;opacity:0.5;z-index:9999;background:#000;display:none';
    }
  }

  private getScrollPosition() {
    let sy, d = parent.document,
      r = d.documentElement,
      b = d.body;
    sy = r.scrollTop || b.scrollTop || 0;
    return sy;
  }
}