import { Injectable, OnDestroy } from '@angular/core';
import { FuellingPointModeOperationChangedArgs } from 'app/shared/signalr-server-responses/multiTpvHub/fuelling-point-mode-operation-changed-args';
import { FuellingPointModeOperationResponse } from 'app/shared/signalr-server-responses/multiTpvHub/fuelling-point-mode-operation-response';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { ServiceModeType } from 'app/shared/fuelling-point/service-mode-type.enum';
import { FuellingPointsInternalService } from 'app/services/fuelling-points/fuelling-points-internal.service';
import { AppDataConfiguration } from 'app/config/app-data.config';
import { ISignalRMultiTPVConnectionManager } from 'app/shared/isignalr-multitpv-conection-manager';
import { FuellingPointOperationModeInitialResponse } from 'app/shared/signalr-server-responses/multiTpvHub/fuelling-point-operation-mode-initial-response';
import { NotifyGenericChangesArgs } from 'app/shared/signalr-server-responses/multiTpvHub/notify-generic-changes-args';
import { MinimumNeededConfiguration } from 'app/config/minimum-needed.config';
import { StatusBarService } from 'app/services/status-bar/status-bar.service';
import { ConnectionStatus } from 'app/shared/connection-status.enum';

@Injectable()
export class SignalRMultiTPVService implements OnDestroy {
    private _hubProxy: SignalR.Hub.Proxy;
    private _connectionManager: ISignalRMultiTPVConnectionManager;
    connectionStatus = ConnectionStatus;

    constructor(
      private _fpInternalSvc: FuellingPointsInternalService,
      private _appDataConfig: AppDataConfiguration,
      private _conf: MinimumNeededConfiguration,
      private _statusBarService: StatusBarService
    ) {
    }

//#region Conection

init(): SignalRMultiTPVService {
  try {
      this._hubProxy = this._connectionManager.createHubProxy('multiTPVHub');
      this._hubProxy.on('FuellingPointModeOperationChanged',
      (param: FuellingPointModeOperationChangedArgs) => this.onUpdateFuellingPointModeOperationChanged(param));
      this._hubProxy.on('NotifyGenericChanges',
      (param: NotifyGenericChangesArgs) => this.onManageNotifyGenericChanges(param));
  } catch (error) {
      console.log(error);
  }
  return this;
}

/**
 *
 *
 * @param {ISignalRMultiTPVConnectionManager} connectionManager
 * @returns {ISignalRHub}
 * @memberof SignalRMultiTPVService
 * @throws {Error} when connectionManager is null
 */
setConnectionManager(connectionManager: ISignalRMultiTPVConnectionManager): SignalRMultiTPVService {
  if (connectionManager == undefined) {
    const errorMessage: string = 'ERROR -> connectionManager MultiTPV parameter cannot be null';
    throw new Error(errorMessage);
  }
  this._connectionManager = connectionManager;
  return this;
}

ngOnDestroy(): void {
  this._hubProxy.off('FuellingPointModeOperationChanged', _ => this.onUpdateFuellingPointModeOperationChanged(undefined));
  this._hubProxy.off('NotifyGenericChanges', _ => this.onManageNotifyGenericChanges(undefined));
}

//#endregion

//#region Methods

  onUpdateFuellingPointModeOperationChanged(param: FuellingPointModeOperationChangedArgs) {
    this._fpInternalSvc.updateModeOperationSubject(param);
  }

  onManageNotifyGenericChanges(param: NotifyGenericChangesArgs) {
    switch (param.methodInvoke) {
      case 'SuppliesAnulated':
        this._fpInternalSvc.fnSuppliesAnulatedRedSubject(true);
        break;
      case 'resetServerTPVCtrlF5':
        this._statusBarService.setMultiTPVConectionChange(this.connectionStatus.reconnected);
        break;
      default:
    }
  }

//#endregion

//#region MethodsSignalR

requestChangeServiceModeMultiTPV(targetMode: ServiceModeType, idFuellingPoint: number,
    tpv: string,
    hasPostPaidTransaction: boolean,
    hasPrePaidTransaction: boolean,
    targetModeOld: ServiceModeType,
    hasPostPaidTransactionOld: boolean,
    hasPrePaidTransactionOld: boolean,
    operatorId: string): Observable<FuellingPointModeOperationResponse> {
  const doms =  this._appDataConfig.getConfigurationParameterByName('PSS_IP', 'PSS_CONNECTION').meaningfulStringValue;
  const request = {
        tpv:  tpv,
        fuellingPointId: idFuellingPoint,
        doms: doms,
        isAttend: (ServiceModeType.AttendPaid === targetMode) ? true : false,
        isPreAuthorized: (ServiceModeType.PreAuthorized === targetMode) ? true : false,
        modeType: targetMode,
        hasPostPaidTransaction : hasPostPaidTransaction,
        hasPrePaidTransaction : hasPrePaidTransaction,
        modeTypeOld: targetModeOld,
        hasPostPaidTransactionOld : hasPostPaidTransactionOld,
        hasPrePaidTransactionOld : hasPrePaidTransactionOld,
  };
  const requestObservable: Observable<FuellingPointModeOperationResponse>
  = this._createObservableFromPromise('ChangeFuellingPointOperationModeRemote', request);
  requestObservable.first()
  .subscribe(
    response => {
        if (response === undefined) {
          this.onUpdateFuellingPointModeOperationChanged(request);
        }
    }
  );
  return requestObservable;
}

requestServiceModeInitialMultiTPVHead(): Observable<FuellingPointOperationModeInitialResponse> {
  return this._createObservableFromPromise('FuellingPointOperationModeInitial');
}

requestNotifyGenericChangesRed(methodInvoke: string): Observable<FuellingPointModeOperationResponse> {
  const request = {
        tpv:  this._conf.POSInformation.code,
        methodInvoke: methodInvoke,
  };
  const requestObservable: Observable<FuellingPointModeOperationResponse>
  = this._createObservableFromPromise('NotifyGenericChangesRed', request);
  requestObservable.first()
  .subscribe();
  return requestObservable;
}

sendFuellingPointOperationModeToServer(
  listFuellingPointMode: Array<FuellingPointModeOperationChangedArgs>): Observable<FuellingPointOperationModeInitialResponse> {
  const request = {
    fpList: listFuellingPointMode
  }
  return this._createObservableFromPromise('FuellingPointOperationModeClientToServer', request);
}

//#endregion

//#region PRIVATE FUNCTIONS SIGNALR

private _createObservableFromPromise<T>(actionName: string, params?: any): Observable<T> {
  return Observable.create((observer: Subscriber<T>) => {
    if (params != undefined) {
      if (this._hubProxy.connection.state === 1) {
      this._hubProxy.invoke(actionName, params).then(
        (response: T) => observer.next(response),
        failResponse => observer.error(failResponse));
      }
      else { observer.next(undefined); }
    } else {
      this._hubProxy.invoke(actionName).then(
        (response: T) => observer.next(response),
        failResponse => observer.error(failResponse));
    }
  });
}

//#endregion
}
