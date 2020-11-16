import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { data } from 'jquery';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ServerProxyService } from './server-proxy.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryHelperService {
  constructor(private serverProxyService: ServerProxyService, private http: HttpClient) { }
  getColumnsList() {
    return forkJoin([this.getColumns(), this.getPersonData()]).pipe(
      map(response => this.getPeronalColumns(response))
    );
  }

  private getPeronalColumns(response) {
    let recordsPerScreen = 5;
    let personalDataColumnOrder;
    let sortedColumns;
    let freezeColumns;
    let freezePosition;
    const columnsList: any = [
      {
        value: 'check_box',
        label: ''
      },
      {
        value: 'DISPOSITION_STATUS_ID',
        label: 'Action',
      }
    ];
    const columns = response[0].result;
    const personalData = response[1].USER_PERSON_DATA;
    personalData.forEach(action => {
      if (action.UI_ACTION_NAME === 'ORDER') {
        personalDataColumnOrder = action.ID_VALUE;
      } else if (action.UI_ACTION_NAME === 'ROWS') {
        recordsPerScreen = action.ID_VALUE.INVENTORY_TABLE;
      } else if (action.UI_ACTION_NAME === 'FREEZE') {
        freezeColumns = action.ID_VALUE;
      } else if (action.UI_ACTION_NAME === 'SORT') {
        sortedColumns = action.ID_VALUE;
      }
    });
    const keys = Object.keys(personalDataColumnOrder);
    if (keys && keys.length) {
      keys.forEach(key => {
        const position = Number(personalDataColumnOrder[key]);
        const column = columns.find(col => col.REPORT_UI_COLUMN_ID == key);
        if (column) {
          columnsList[position] = {
            value: column.REPORT_COLUMN_NAME,
            label: column.COLUMN_DESCRIPTION,
            id: column.REPORT_UI_COLUMN_ID
          };
        } else {
          console.log(key);
        }
      });
    } else {
      columns.forEach(col => {
        columnsList.push({
          value: col.REPORT_COLUMN_NAME,
          label: col.COLUMN_DESCRIPTION,
          id: col.REPORT_UI_COLUMN_ID
        });
      });
    }

    const sortedColumnKeys = Object.keys(sortedColumns);
    if (sortedColumnKeys && sortedColumnKeys.length) {
      sortedColumnKeys.forEach(columnName => {
        const column = columnsList.find(col => col.value === columnName);
        column.sort = sortedColumns[columnName];
      });
    }

    const freezeColumnKeys = Object.keys(freezeColumns);
    if (freezeColumnKeys && freezeColumnKeys.length) {
      for (const i in freezeColumns) {
        if (freezeColumns[i]) {
          const position = Number(freezeColumns[i]);
          freezePosition = freezePosition ? freezePosition < position ? position : freezePosition : position;
        }
      }
    }
    return { columnsList, recordsPerScreen, freezePosition };
  }

  public savePersonData(peronData) {
    const personalData = {
      USER_PERSON_DATA: [
        {
          UI_TYPE: 'COLUMN',
          UI_ACTION_NAME: 'VISIBLE',
          ID_VALUE: {}
        },
        {
          UI_TYPE: 'COLUMN',
          UI_ACTION_NAME: 'ORDER',
          ID_VALUE: this.getColumnsOrder(peronData.columnsList)
        },
        {
          UI_TYPE: 'COLUMN',
          UI_ACTION_NAME: 'FREEZE',
          ID_VALUE: {
            // 18: '1'
          }
        },
        {
          UI_TYPE: 'COLUMN',
          UI_ACTION_NAME: 'SORT',
          ID_VALUE: this.getSortedColumns(peronData.columnsList)
        },
        {
          UI_TYPE: 'ROWS',
          UI_ACTION_NAME: 'ROWS',
          ID_VALUE: {
            INVENTORY_TABLE: peronData.recordsPerScreen
          }
        }
      ]
    };

    console.log(personalData);
  }

  private getColumnsOrder(columnsList) {
    const orderMap = {};
    columnsList.forEach((col, index) => {
      if (col.id) {
        orderMap[col.id] = index.toString();
      }
    });
    return orderMap;
  }

  private getSortedColumns(columnsList) {
    const orderMap = {};
    columnsList.forEach((col) => {
      if (col.hasOwnProperty('sort')) {
        orderMap[col.value] = col.sort;
      }
    });
    return orderMap;
  }

  private getColumns() {
    const url = 'assets/json/columns-list.json';
    // const url = "";
    // return this.serverProxyService.get(url);
    return this.http.get(url);
  }
  private getPersonData() {
    const url = 'assets/json/USER_PERSON_DATA.json';
    // const url = "";
    // return this.serverProxyService.get(url);
    return this.http.get(url);
  }
}
