import { Component, OnInit, OnDestroy } from '@angular/core';
import { FuellingPointsService } from 'app/services/fuelling-points/fuelling-points.service';
import { FuellingPointInfo } from 'app/shared/fuelling-point/fuelling-point-info';
import { FuellingPointsInternalService } from 'app/services/fuelling-points/fuelling-points-internal.service';
import { FuellingPointsSignalrUpdatesService } from 'app/services/fuelling-points/fuelling-points-signalr-updates.service';
import { AuxiliarActionsManagerService } from 'app/services/auxiliar-actions/auxiliar-actions-manager.service';
import {
  FuellingPointTransactionCountChangedArgs
} from 'app/shared/fuelling-point/signalR-Response/fuelling-point-transaction-count-changed-args';
import { FuellingPointFormatConfiguration } from 'app/shared/fuelling-point/fuelling-point-format-configuration';
import { Subscription } from 'rxjs/Subscription';
import { PetrolStationMode } from 'app/shared/fuelling-point/petrol-station-mode.enum';

import { SignalRPSSService } from 'app/services/signalr/signalr-pss.service';
// import { DocumentService } from 'app/services/document/document.service';
import { RoundPipe } from 'app/pipes/round.pipe';
import { DocumentLinePromotion } from 'app/shared/document/document-line-promotion';
import { DocumentLine } from 'app/shared/document/document-line';
import { Customer } from 'app/shared/customer/customer';
import { FuellingPointSupplyLineData } from 'app/shared/fuelling-point/fuelling-point-supply-line-data';
import { FuellingPointSupplyLine } from 'app/shared/fuelling-point/fuelling-point-supply-line';
import { CustomerService } from 'app/services/customer/customer.service';
import { AppDataConfiguration } from 'app/config/app-data.config';
import { CashPaymentService } from 'app/services/payments/cash-payment.service';
import { Operator } from 'app/shared/operator/operator';
import { OperatorInternalService } from 'app/services/operator/operator-internal.service';
import { ServiceModeType } from 'app/shared/fuelling-point/service-mode-type.enum';
import { PromotionsService } from 'app/services/promotions/promotions.service';
import { ResponseStatus } from 'app/shared/response-status.enum';
import { ChangePaymentInternalService } from 'app/services/payments/change-payment-internal.service';
import { Globals } from 'app/services/Globals/Globals';
import { LanguageService } from 'app/services/language/language.service';
import { FuellingPointMainStates } from 'app/shared/fuelling-point/fuelling-point-main-states.enum';
import { MinimumNeededConfiguration } from 'app/config/minimum-needed.config';
import { LockSupplyTransactionStatus } from 'app/shared/hubble-pos-signalr-responses/lock-supply-transaction-status.enum';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { SuplyTransaction } from 'app/shared/fuelling-point/suply-transaction';
import { CreditCardPaymentService } from 'app/services/payments/credit-card-payment.service';


@Component({
  selector: 'tpv-fuelling-points',
  templateUrl: './fuelling-points.component.html',
  styleUrls: ['./fuelling-points.component.scss']
})
export class FuellingPointsComponent implements OnInit, OnDestroy {
  // stores the information about fuelling points on the service station
  fpInformation: Array<FuellingPointInfo>;
  private _subscriptions: Subscription[] = [];
  // private _subscriptionOnFuellingPoint: Subscription = new Subscription();
  valor: number = 0;
  btnStopCheckStatus: boolean;
  btnNightCheckStatus: boolean;
  isTicket: boolean;
  fpFormatConfig: FuellingPointFormatConfiguration;
  mapfpAttendValor: Map<number, number>;
  PostIDTPV: number;
  isCreditCardPayment: boolean;
  private _pauseRunOnFuellingPointUpdate: boolean;

  public get pauseRunOnFuellingPointUpdate(): boolean {
    return this._pauseRunOnFuellingPointUpdate;
  }

  public set pauseRunOnFuellingPointUpdate(value: boolean) {
    this._pauseRunOnFuellingPointUpdate = value;
  }

  constructor(
    private _fuellingPointsSvc: FuellingPointsService,
    private _internalSvc: FuellingPointsInternalService,
    private _fpSignalR: FuellingPointsSignalrUpdatesService,
    private _auxActionMngr: AuxiliarActionsManagerService,
    private _signalr: SignalRPSSService,
    // private _documentService: DocumentService,
    private _roundPipe: RoundPipe,
    private _cashPaymentService: CashPaymentService,
    private _customerService: CustomerService,
    private _appDataConfig: AppDataConfiguration,
    private _operador: OperatorInternalService,
    private _promotionsService: PromotionsService,
    private _changeDelivered: ChangePaymentInternalService,
    private _languageService: LanguageService,
    private _conf: MinimumNeededConfiguration,
    private cardPayment: CreditCardPaymentService

  ) {
  }


  ngOnInit() {
    this.isTicket = false;
    this.isCreditCardPayment = false;
    this.pauseRunOnFuellingPointUpdate = false;
    this.fpFormatConfig = this._internalSvc.formatConfiguration;
    this.PostIDTPV = parseFloat(this._appDataConfig.userConfiguration.PosId.toString().substring(5));

    // retrieving fp info
    this._subscriptions.push(this._fpSignalR.onAllFuellingPoints()
      .subscribe(data => {
        this.fnLoadfpInformationStatus(data).first().subscribe(
          response => {
              if (response) {
                  data = response;
                  data.forEach(e => {
                    if (e.posIDTPV === this.PostIDTPV) {
                      if ( (e.hasTransactions && //tiene transaciones
                        e.serviceModeType == ServiceModeType.PostPaid && //el modo es postpago
                        !e.hasPostPaidTransaction && //tiene transaciones postpago
                        !e.isAttend  //no es atendido
                        && !e.hasPrePaidTransaction)  || (e.hasTransactions && e.isPreAuthorized)
                        ) {
                          if (e.serviceModeType == ServiceModeType.PostPaid) {
                            e.oldHasPostPaidTransaction = e.hasPostPaidTransaction;
                            e.hasPostPaidTransaction = true;
                          }
                        e.isPreAuthorized = true;
                        this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(ServiceModeType.PreAuthorized, e.id,
                          this._conf.POSInformation.code, e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                          e.serviceModeType,
                          e.oldHasPostPaidTransaction,
                          e.oldHasPrePaidTransaction)
                          .first().subscribe(responseMultiTpv => {
                            this._signalr.requestChangeServiceMode(ServiceModeType.PreAuthorized, e.id, '').first().subscribe();
                          });
                      } else if (!e.hasTransactions && e.hasPostPaidTransaction && e.isPreAuthorized) {
                        e.oldHasPostPaidTransaction = e.hasPostPaidTransaction;
                        e.hasPostPaidTransaction = false;
                        e.isPreAuthorized = false;
                        this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(ServiceModeType.PostPaid, e.id,
                          this._conf.POSInformation.code, e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                          e.serviceModeType,
                          e.oldHasPostPaidTransaction,
                          e.oldHasPrePaidTransaction)
                          .first().subscribe(responseMultiTpv => {
                            this._signalr.requestChangeServiceMode(ServiceModeType.PostPaid, e.id, '')
                              .first().subscribe();
                          });
                      } /*else if (!e.hasTransactions && e.hasPrePaidTransaction && !e.isAttend ) {
                        e.oldHasPrePaidTransaction = e.hasPrePaidTransaction,
                        e.hasPrePaidTransaction = false;
                        this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(e.oldServiceModeType, e.id, this._conf.POSInformation.code,
                          e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                          e.serviceModeType,
                          e.oldHasPostPaidTransaction,
                          e.oldHasPrePaidTransaction)
                          .first().subscribe(
                            response => {
                              this._signalr.requestChangeServiceMode(e.oldServiceModeType, e.id, '')
                                .first().subscribe();
                            }
                          );
                      }*/
                    }
                  });
                  this.fpInformation = data;
                  this.setfuellingPointInformation();
              }
          }
        );
      }));

    this._subscriptions.push(this._fpSignalR.onFuellingPointTransactionCountChange()
      .subscribe(eventParam => {
        this.TransformPostPaidWithTransactionToPreAuthorized(eventParam.fuellingPointId,
          eventParam.transactionCount, eventParam.listSupplyTransaction).first().subscribe(response => {
          if (response) {
            this.onFuellingPointTransactionCountChange(eventParam, response);
          }
          else {
            this.onFuellingPointTransactionCountChange(eventParam, response);
          }
        });
      }));

    // *** VERSIÓN RÉPLICA ***
    // this._fuellingPointsSvc.requestAllSuplyTransactionsAnulated()

    // Cargamos los suministros anulados.
    this._subscriptions.push(this.fnGetAllSuppliesAnulatedByShop().subscribe());

    this._changeDelivered.changedPayment$.subscribe(p => {
      this.isTicket = p.isTicket;
    });

    this._subscriptions.push(this._internalSvc.onAllFuellingPointsFromComponent()
      .subscribe(data => {
        this.fpInformation = data;
      }));

    this._subscriptions.push(this._fpSignalR.onFuellingPointUpdate()
      .subscribe(fp => {
        if (this.pauseRunOnFuellingPointUpdate) {
            return;
        }
        // if (fp.mainState != FuellingPointMainStates.Fuelling) {
        //   if (fp.isAttend == true) {
        //     this.currentDocument.isatend = this.getLiteral('fuelling_points_component', 'header_FuellingPointAction_Served');
        //     if (fp.hasFreeBuffer == false) {
        //       if (this.PostIDTPV == fp.posIDTPV) {
        //         this.ObtenerCombustible(fp.id);
        //       }
        //     }
        //   }
        // }
        if (fp.mainState != FuellingPointMainStates.Fuelling) {
          if (fp.isAttend == true) {
              if (fp.hasFreeBuffer == false) {
                if (this.PostIDTPV == fp.posIDTPV) {
                  const currentDocument: any = {
                    currencyId: this._appDataConfig.baseCurrency.id,
                    customer: undefined,
                    emissionLocalDateTime: undefined,
                    isatend: '',
                    lines: [] ,
                    operator: undefined,
                    plate: undefined,
                    series: undefined,
                    showAlertInsertCustomer: false,
                    showAlertInsertOperator: false,
                    totalAmountWithTax: 0,
                    usedDefaultOperator: false
                  };
                  currentDocument.isatend = this.getLiteral('fuelling_points_component', 'header_FuellingPointAction_Served');
                  this.ObtenerCombustible(fp.id, currentDocument);
                }
              }
            }
        }
        this.onFuellingPointUpdate(fp);
        this.setfuellingPointInformation();
    }));

    this._subscriptions.push(this._internalSvc.onUpdateModeOperationSubject()
      .subscribe(data => {
        try {
          if (data) {
            this.pauseRunOnFuellingPointUpdate = true;
            this._updateFuellingPointOperationMode(data);
            if (this.fpInformation) {
              const fp1 = this.fpInformation.find(x => x.id === data.fuellingPointId);
              fp1.isAttend = data.isAttend;
              fp1.isPreAuthorized = data.isPreAuthorized;
              fp1.posIDTPV = parseInt(data.tpv,0);
              fp1.serviceModeType = data.modeType;
              fp1.hasPostPaidTransaction = data.hasPostPaidTransaction;
              fp1.hasPrePaidTransaction = data.hasPrePaidTransaction;
              fp1.oldServiceModeType = data.modeTypeOld;
              fp1.oldHasPostPaidTransaction = data.hasPostPaidTransactionOld;
              fp1.oldHasPrePaidTransaction = data.hasPrePaidTransactionOld;
              /*if (fp1.hasPostPaidTransaction || fp1.hasPrePaidTransaction) {
                fp1.hasTransactions = true;
              }*/
              this.onFuellingPointUpdate(fp1);
              // const paramrequest = {
              //   fuellingPointId: fp1.id,
              //   transactionCount: -1,
              // };
              // // tslint:disable-next-line:max-line-length
              // if ((fp1.serviceModeType === ServiceModeType.PostPaid && fp1.hasPostPaidTransaction) || (fp1.isPreAuthorized)) {
              //   this._fpSignalR.updateFuellingPointTransactionFromServer(paramrequest);
              // }
            }
          }
          this.pauseRunOnFuellingPointUpdate = false;
        } catch (error) {
          this.pauseRunOnFuellingPointUpdate = false;
        }
      }));

    this._subscriptions.push(this._internalSvc.fpSuppliesAnulatedRedSubject$
      .subscribe(data => {
        if (data === true) {
          // Invocar al metodo que obtena las transacciones anuladas y repinte el pump
          this.fnGetAllSuppliesAnulatedByShop().subscribe(response => {
              if (response === true) {
                for (let index = 0; index < this.fpInformation.length; index++) {
                  const pump = this.fpInformation[index];
                  this.fpInformation[index] = this.updateReference(pump);
                }
              }
            });
        }
      }));

      this._subscriptions.push(this._internalSvc.fpStopButton$
        .subscribe(data => {
          if ((data === true) && (this.fpInformation)) {
            this.checkStates();
          }
        }));

        this._subscriptions.push(this._fuellingPointsSvc.fpVerifyReconexion$
        .subscribe(response => {
          if (this.fpInformation) {
            for (let index = 0; index < this.fpInformation.length; index++) {
              const pump = this.fpInformation[index];
              pump.isOnline = response;
              this.fpInformation[index] = this.updateReference(pump);
            }
          }
        }));
        this._subscriptions.push(this.cardPayment.$isCreditCardPayment
          .subscribe( respuest => {
            this.isCreditCardPayment = respuest;
        }));
  }

  TransformPostPaidWithTransactionToPreAuthorized(id: number, contTransact: number,
    listSupplyTransaction: SuplyTransaction[]): Observable<FuellingPointInfo> {
    // tslint:disable-next-line: no-unsafe-any
    return Observable.create((observer: Subscriber<FuellingPointInfo>) => {
      const displayPreAut = this._appDataConfig.getConfigurationParameterByName('DISPLAY_MODE_PRE-AUTHORIZED', 'GENERAL');
      let displayValuePreAut: boolean;
      if (displayPreAut == undefined) {
        displayValuePreAut = true;
      }
      else {
        displayValuePreAut = displayPreAut.meaningfulStringValue.toUpperCase() == 'TRUE' ? true : false;
      }
      if (displayValuePreAut) {
        if (this.fpInformation != undefined) {
          const e: FuellingPointInfo = this.fpInformation.find(X => X.id === id);
          if (contTransact > 0) {
            e.hasTransactions = true;
          } else {
            e.hasTransactions = false;
          }
          if (e) {
            if (e.posIDTPV === this.PostIDTPV) {
              if ( (e.hasTransactions && //tiene transaciones
                e.serviceModeType == ServiceModeType.PostPaid && //el modo es postpago
                !e.hasPostPaidTransaction && //tiene transaciones postpago
                !e.isAttend  //no es atendido
                //e.oldServiceModeType != ServiceModeType.PrePaid //el anterior modo es prepago
                && !e.hasPrePaidTransaction && e.mainState == FuellingPointMainStates.Idle)
                || (e.hasTransactions && e.isPreAuthorized && e.mainState == FuellingPointMainStates.Idle)
              ) {
                if (e.serviceModeType == ServiceModeType.PostPaid) {
                  e.oldHasPostPaidTransaction = e.hasPostPaidTransaction,
                  e.hasPostPaidTransaction = true;
                }
                this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(ServiceModeType.PreAuthorized, id,
                  this._conf.POSInformation.code, e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                  e.serviceModeType,
                  e.oldHasPostPaidTransaction,
                  e.oldHasPrePaidTransaction)
                  .first().subscribe(response => {
                    this._signalr.requestChangeServiceMode(ServiceModeType.PreAuthorized, e.id, '')
                      .first().subscribe();
                  });
              } else if (contTransact == 0 && e.hasPostPaidTransaction && e.isPreAuthorized) {
                e.oldHasPostPaidTransaction = e.hasPostPaidTransaction;
                e.hasPostPaidTransaction = false;
                this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(ServiceModeType.PostPaid, id, this._conf.POSInformation.code,
                  e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                  e.serviceModeType,
                  e.oldHasPostPaidTransaction,
                  e.oldHasPrePaidTransaction)
                  .first().subscribe(response => {
                    this._signalr.requestChangeServiceMode(ServiceModeType.PostPaid, e.id, '')
                      .first().subscribe();
                  });
              }
              else if (e.hasTransactions && e.hasPrePaidTransaction && !e.isAttend) {
                // tslint:disable-next-line: max-line-length
                const existPrepaid = listSupplyTransaction.find(x=> (x.fuellingPointId == e.id) && (x.money!=undefined) && (x.fuellingLimitValue!=undefined));
                if (!existPrepaid) {
                  return;
                }
                e.oldHasPrePaidTransaction = e.hasPrePaidTransaction;
                e.hasPrePaidTransaction = false;
                const trxPrepaidInCompleted = listSupplyTransaction.find(x=> x.fuellingPointId == e.id
                  && ( (x.fuellingLimitType ===0) ? (x.money!=x.fuellingLimitValue) : (x.money != (x.fuellingLimitValue *x.gradeUnitPrice)) )
                  )
                if (!trxPrepaidInCompleted){
                  this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(e.oldServiceModeType, id, this._conf.POSInformation.code,
                    e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                    e.serviceModeType,
                    e.oldHasPostPaidTransaction,
                    e.oldHasPrePaidTransaction)
                  .first().subscribe(
                    response => {
                      this._signalr.requestChangeServiceMode(e.oldServiceModeType, e.id, '')
                        .first().subscribe();
                    }
                  );
                } else {
                  if (e.oldServiceModeType == ServiceModeType.PostPaid) {
                                          e.isPreAuthorized = true;
                                          e.hasPostPaidTransaction = true;
                                          this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(ServiceModeType.PreAuthorized, id,
                                            this._conf.POSInformation.code, e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                                            e.serviceModeType,
                                            e.oldHasPostPaidTransaction,
                                            e.oldHasPrePaidTransaction)
                                            .first().subscribe(response => {
                                              this._signalr.requestChangeServiceMode(ServiceModeType.PreAuthorized, e.id, '')
                                                .first().subscribe();
                                            });
                                        } else {
                                            this._fuellingPointsSvc.requestChangeServiceModeMultiTPV(e.oldServiceModeType, id, this._conf.POSInformation.code,
                                              e.hasPostPaidTransaction, e.hasPrePaidTransaction,
                                              e.serviceModeType,
                                              e.oldHasPostPaidTransaction,
                                              e.oldHasPrePaidTransaction)
                                            .first().subscribe(
                                              response => {
                                                this._signalr.requestChangeServiceMode(e.oldServiceModeType, e.id, '')
                                                  .first().subscribe();
                                              }
                                            );
                                        } 
                }
              }
              observer.next(e);
             }
           else { observer.next(undefined); }
          }
          else {
            observer.next(undefined);
          }
        }
        else { observer.next(undefined); }
      }
    });
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  fuellingPointSelected(fp: FuellingPointInfo) {
    this._auxActionMngr.requestFuellingPointOperations(fp, this.fpInformation);
  }

  btnStopClick(isStop: boolean) {
    this._fuellingPointsSvc.manageRequestEmergencyStop(isStop)
      .first().subscribe();
  }

  btnNigthClick(isNight: boolean) {
    this._fuellingPointsSvc.requestChangePetrolStationMode(
      isNight ? PetrolStationMode.Night : PetrolStationMode.Default)
      .first().subscribe(response => {
        // si el cambio es ok, cambiamos el estado del boton.
        if (response) {
          this.btnNightCheckStatus = !this.btnNightCheckStatus;
        }
      });
  }

  btnTransactionsClick() {
    this._auxActionMngr.requestWaitingOperations();
  }

  createRange(index: number, positionNumber: number): Array<boolean> {
    let elements: number = 0;
    if (index == 0) {
      elements = positionNumber;
    } else {
      elements = positionNumber - this.fpInformation[index - 1].positionNumber;
    }

    const ret = new Array<boolean>(elements - 1);
    return ret;
  }

  private onFuellingPointUpdate(fp: FuellingPointInfo) {
    if (this.fpInformation == undefined) {
      return;
    }
    for (let index = 0; index < this.fpInformation.length; index++) {
      const pump = this.fpInformation[index];
      if (pump.id != fp.id) {
        continue;
      }

      fp.hasTransactions = pump.hasTransactions; // salvamos estado anterior, se modifica por otra parte
      fp.hasPostPaidTransaction = pump.hasPostPaidTransaction; // Salvamos el estado de postpago con transacciones
      //fp.hasPrePaidTransaction = pump.hasPrePaidTransaction;
      // angular change detection will trigger and update the pump bounded
      this.fpInformation[index] = this.updateReference(fp);
      this.checkStates();
      break;
    }
  }


  private ObtenerCombustible(id: number, currentDocument: any) {
    this._fuellingPointsSvc.requestSuplyTransactions(id)
      .first().subscribe(response => {
        const operator: Operator = this._operador.currentOperator == undefined ? undefined : this._operador.currentOperator;
        currentDocument.operator = operator;

        // response.forEach(trans =>
        //   this._signalr.unlockSupplyTransaction(operator.id,
        //     trans.id, trans.fuellingPointId).first().subscribe(responseUnlock => {
        //       console.log('Desbloqueo de Supply: ' + responseUnlock);
        //     })
        // );

        // response.filter(e => (e.lockingPOSId !== undefined && e.lockingPOSId !== null)).forEach(x => {
        //   this.valor = 0; this.addFpAttendValor(id, 0); return;
        // });
        // const transaccion = response[0];

        const filterTransactions = response.filter(e => (e.lockingPOSId == undefined));
        if (filterTransactions) {
        } else {
          return;
        }
        const transaccion = filterTransactions[0];
        currentDocument.emissionLocalDateTime = new Date();
        // const customer: Customer = this._customer.currentCustomer  == undefined ? undefined : this._customer.currentCustomer
        this._customerService.getCustomerById(this._appDataConfig.unknownCustomerId)
          .subscribe((customer: Customer) => {
            currentDocument.customer = customer;
            try {
              this._signalr.lockSupplyTransaction(operator.id,
                customer.id, transaccion.id, transaccion.fuellingPointId).subscribe((respn) => {
                  if (respn.status === LockSupplyTransactionStatus.Successful) {
                    const supplyLineData: FuellingPointSupplyLineData = {
                      fpSvc: this._fuellingPointsSvc,
                      supplyTransaction: transaccion,
                      lineNumberInDocument: 1
                    };
                    const specificLine: FuellingPointSupplyLine = new FuellingPointSupplyLine(supplyLineData);
                    const line: DocumentLine[] = [{
                      businessSpecificLineInfo: specificLine,
                      description: 'S: ' + transaccion.fuellingPointId + ' ' + respn.productName,
                      discountAmountWithTax: respn.discountedAmount,
                      discountPercentage: respn.discountPercentage,
                      originalPriceWithTax: respn.unitaryPricePreDiscount,
                      priceWithTax: respn.unitaryPricePreDiscount,
                      productId: respn.productReference,
                      quantity: respn.correspondingVolume,
                      taxAmount: 0,
                      taxPercentage: respn.taxPercentage,
                      totalAmountWithTax: respn.finalAmount,
                      typeArticle: respn.typeArticle,
                      appliedPromotionList: [],
                      priceWithoutTax: this._roundPipe.transformInBaseCurrency(respn.unitaryPricePreDiscount / (1 + (respn.taxPercentage / 100))),
                      isConsigna: respn.isConsigna,
                      idCategoria: '',
                      nameCategoria: ''
                    }];
                    currentDocument.lines = line;
                    this.GenerarTicket(id, currentDocument);
                  } else {
                    this._signalr.unlockSupplyTransaction(operator.id,
                      transaccion.id, transaccion.fuellingPointId);
                  }
                });
            } catch (error) {
              this.valor = 0;
              this._signalr.unlockSupplyTransaction(operator.id,
                transaccion.id, transaccion.fuellingPointId);
            }
          }, error => {
            this.valor = 0;
            this._signalr.unlockSupplyTransaction(operator.id,
              transaccion.id, transaccion.fuellingPointId);
          });
      }, error => {
        this.valor = 0;
      });
  }


  private onFuellingPointTransactionCountChange(param: FuellingPointTransactionCountChangedArgs, fp: FuellingPointInfo) {
    if (param == undefined) {
      return;
    }
    if (this.fpInformation == undefined) {
      return;
    }

    for (let index = 0; index < this.fpInformation.length; index++) {
      const pump = this.fpInformation[index];
      if (pump.id != param.fuellingPointId) {
        continue;
      }
      if (param.transactionCount != -1) {
        pump.hasTransactions = param.transactionCount > 0;
      }
      if (fp) {
        if (pump.id === fp.id) {
          pump.hasPostPaidTransaction = fp.hasPostPaidTransaction;
          pump.hasPrePaidTransaction = fp.hasPrePaidTransaction;
        }
      }
      // angular change detection will trigger and update the pump bounded
      this.fpInformation[index] = this.updateReference(pump);
      break;
    }
  }

  // should be called after a update in the fpInformation
  private checkStates() {
    let allStoped = true;
    for (let i = 0; i < this.fpInformation.length; i++) {
      const pivote = this.fpInformation[i];
      allStoped = allStoped && pivote.isStopped;
    }
    this.btnStopCheckStatus = allStoped;
    this._changeDelivered.fnEstadoParar(this.btnStopCheckStatus);
  }

  // angular change detection for arrays only check reference to fire onChange
  private updateReference<T>(object: T): T {
    return JSON.parse(JSON.stringify(object));
  }


  GenerarTicket(id: number = 0,currentDocument: any) {
    this._promotionsService.cleanLocalTarif(currentDocument); // Pana - Se limpian las tarifas locales si se han aplicado
    this._promotionsService.calculatePromotions(currentDocument)
      .subscribe(
        calculatePromotionsResponse => {
          if (calculatePromotionsResponse.status === ResponseStatus.success) {
            const receivedPromotionsList = calculatePromotionsResponse.object;
            this._setPromotions(receivedPromotionsList,currentDocument);
          }
          this._cashPaymentService.sendSaleAutomatic(currentDocument).subscribe(
            respon => {
              if (respon) {
                this.valor = 0;
              }
            }
            , error => {
              this.valor = 0;
            }
          );
          return;
        },
        error => {
          this.valor = 0;
        }
      );

  }
  private _setPromotions(receivedPromotionList: Array<DocumentLinePromotion>, currentDocument: any) {
    let totalDiscountByPromotions: number = 0;
    this._clearPromotions(currentDocument);
    receivedPromotionList.forEach(promotion => {
      if (!currentDocument.lines[promotion.referredLineNumber - 1].appliedPromotionList) {
        currentDocument.lines[promotion.referredLineNumber - 1].appliedPromotionList = [];
      }
      currentDocument.lines[promotion.referredLineNumber - 1].appliedPromotionList.push(promotion);
      totalDiscountByPromotions += promotion.discountAmountWithTax;
    });
    //(`Total descuento aplicado al documento con las promociones: ${totalDiscountByPromotions.toString()}`);
    currentDocument.totalAmountWithTax = this._roundPipe.transformInBaseCurrency(
      currentDocument.totalAmountWithTax - totalDiscountByPromotions
    );
  }
  private _clearPromotions(currentDocument: any) {
    let calculatedTotalAmountWithTax: number = 0;
    if (currentDocument && currentDocument.lines) {
      currentDocument.lines.forEach((line: any) => {
        if (line.appliedPromotionList) {
          line.appliedPromotionList = [];
        }
        if (line.appliedPromotionListHTML) {
          line.appliedPromotionListHTML = [];
        }
        calculatedTotalAmountWithTax += line.totalAmountWithTax;
      });
      currentDocument.totalAmountWithTax = this._roundPipe.transformInBaseCurrency(calculatedTotalAmountWithTax);
    }
  }
  getLiteral(group: string, key: string): string {
    return this._languageService.getLiteral(group, key);
  }

  setfuellingPointInformation() {
    this._internalSvc.fpListInternal = this.fpInformation;
  }

  private _updateFuellingPointOperationMode(param: any) {
    let errorMessage: string = '';
    // tslint:disable-next-line: max-line-length
    this._fuellingPointsSvc.UpdateFuellingPointOperationMode(param.fuellingPointId, param.doms, param.isAttend, param.isPreAuthorized, param.tpv, param.hasPostPaidTransaction, param.hasPrePaidTransaction, param.modeType,param.hasPostPaidTransactionOld, param.hasPrePaidTransactionOld, param.modeTypeOld)
      .first()
      .subscribe(
        (response) => {
          if (!response) {
            errorMessage = 'No se pudo actualizar el modo operacion del fuellingpoint con id'
              + param.fuellingPointId + 'en la base local.';
            throw new Error(errorMessage);
          }
        },
        (error) => {
          errorMessage = 'Error al intentar actualizar modo operacion del fuellingpoint con id'
            + param.fuellingPointId + 'en la base local. ->' + error;
          throw new Error(errorMessage);
        }
      );
  }

  private fnGetAllSuppliesAnulatedByShop(): Observable<boolean> {
      return Observable.create((observer: Subscriber<boolean>) => {
        this._fuellingPointsSvc.GetAllSuppliesAnulatedByShop()
        .first().subscribe(response => {
          Globals.Delete();
          if (response != undefined && response.length > 0) {
            response.forEach(x => {
              const point = Globals.Get().find(s => s.id === x.fuellingPointId);
              if (point !== undefined && point !== null) {
                Globals.Put(x.fuellingPointId, true);
              } else {
                Globals.Set(x.fuellingPointId, true);
              }
            });
          };
          observer.next(true);
        }, error => {
          observer.next(false);
        }
        );
      });
  }

fnLoadfpInformationStatus(fpList: Array<FuellingPointInfo>): Observable<Array<FuellingPointInfo>> {
  // tslint:disable-next-line: no-unsafe-any
  return Observable.create((observer: Subscriber<Array<FuellingPointInfo>>) => {
    this._fuellingPointsSvc.GetAllFuellingPointOperationMode()
      .first()
      .subscribe(
        (response) => {
          if (!response ) {
            observer.next(undefined);
          } else {
              if (fpList) {
                for (let index = 0; index < fpList.length; index++) {
                  const fp1 = response.find(x => x.fuellingPointId === fpList[index].id);
                  if (fp1) {
                    fpList[index].isAttend = fp1.isAttend;
                    fpList[index].isPreAuthorized = fp1.isPreAuthorized;
                    fpList[index].posIDTPV = parseInt(fp1.tpv, 0);
                    fpList[index].serviceModeType = fp1.modeType;
                    fpList[index].hasPostPaidTransaction = fp1.hasPostPaidTransaction;
                    fpList[index].hasPrePaidTransaction = fp1.hasPrePaidTransaction;
                    fpList[index].oldServiceModeType = fp1.modeTypeOld;
                    fpList[index].oldHasPostPaidTransaction = fp1.hasPostPaidTransactionOld;
                    fpList[index].oldHasPrePaidTransaction = fp1.hasPrePaidTransactionOld;
                  }
                }
                observer.next(fpList);
              }
          }
        },
        (error) => {
          observer.next(undefined);
        }
      );
  });
}

}
