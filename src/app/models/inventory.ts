export interface Inventory {
  BOX_CODE: number;
  LAST_ACTIVITY_DATE: string;
  STORAGE_LOCATION: string;
  CONTAINER_NUMBER: number;
  CLIENT_CONTAINER_NUMBER: string;
  QUANTITY: number;
  PROTOCOL_ID: number;
  isSelect?: boolean;
  composedVal?: string;
  REPORT_USER_ID?: number;
  USER_REPORT_ID?: number;
  REPORT_TOKEN_ID?: string;
  REPORT_ID?: number;
  rownum?: number;
  DISPOSITION_STATUS_ID?: number;
  DISPOSITION_DETAIL_ID?: number;
  isNewlyAdded?: boolean;
}
