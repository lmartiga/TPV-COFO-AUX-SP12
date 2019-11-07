import { Subject } from 'rxjs/Subject';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/first';
import 'rxjs/add/observable/zip';
import { RoundPipe } from 'app/pipes/round.pipe';
import { AppDataConfiguration } from 'app/config/app-data.config';
import { HttpService } from 'app/services/http/http.service';
import { Document } from 'app/shared/document/document';
import { DocumentLine } from 'app/shared/document/document-line';
import { FormatHelper } from 'app/helpers/format-helper';
import { LogHelper } from 'app/helpers/log-helper';
import { DocumentInternalService } from 'app/services/document/document-internal.service';
import { FinalizingDocumentFlowType } from 'app/shared/document/finalizing-document-flow-type.enum';
import { DocumentSeriesService } from 'app/services/document/document-series.service';
import { ConfirmPaymentRequest } from 'app/shared/confirm-payment-request';
import { Subscriber } from 'rxjs/Subscriber';
import { PaymentDetail } from 'app/shared/payments/payment-detail';
import { OperatorInternalService } from 'app/services/operator/operator-internal.service';
// import { SignalRPrintingService } from 'app/services/signalr/signalr-printing.service';
import { StatusBarService } from 'app/services/status-bar/status-bar.service';
import { PrintResponseStatuses } from 'app/shared/signalr-server-responses/printingModuleHub/print-response-statuses.enum';
import { IdocumentConfirmActions } from 'app/shared/idocument-confirm-actions';
// import { CalculatePromotionsResponse } from 'app/shared/web-api-responses/calculate-promotions-response';
// import { CalculatePromotionsResponseStatuses } from 'app/shared/web-api-responses/calculate-promotions-response-statuses.enum';
// import { DocumentLinePromotion } from 'app/shared/document/document-line-promotion';
import { IresponseSuccessWithObject } from 'app/shared/iresponse-success-with-object';
import { PaymentPurpose } from 'app/shared/payments/PaymentPurpose.enum';
import { LoyaltyService } from 'app/services/loyalty/loyalty.service';
import { LoyaltyAttributionInformation } from 'app/shared/loyalty/loyalty-attribution-information';
import { LoyaltyActionType } from 'app/shared/loyalty/loyalty-action-type.enum';
import {
  ProcessLoyaltyAttributionAndRedeemBenefitResponse
} from 'app/shared/hubble-pos-web-api-responses/loyalty/process-loyalty-attribution-and-redeem-benefit-response';
import { SeriesType } from 'app/shared/series/series-type';
import { isNumber } from 'util';
import { SignalRTMEService } from '../signalr/signalr-tme.service';
import { TMEButtonExactoResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/tme-button-exacto-response-statuses.enum';
import { GenericHelper } from 'app/helpers/generic-helper';
import { TMEButtonTarjetaResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/tme-button-tarjeta-response-statuses.enum';
import { TMEButtonMixtoResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/tme-button-mixto-response-statuses.enum';
import { TMEButtonRefundFuelResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/tme-button-refund-fuel-response-statuses.enum';
import {
  TMEButtonCanjeCodigoBarrasResponseStatuses
} from 'app/shared/hubble-pos-signalr-responses/tme-button-canje-codigo-barras-response-statuses.enum';
import { SuplyTransaction } from 'app/shared/fuelling-point/suply-transaction';
import { PaymentMethodType } from 'app/shared/payments/payment-method-type.enum';
import { Globals } from '../Globals/Globals';
import { FuellingPointsAnulatedService } from '../fuelling-points/fuelling-points-anulated.service';
import { TMEButtonRefundCompleteResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/tme-button-refund-complete-response-statuses.enum';
// import { IDictionaryStringKey } from 'app/shared/idictionary';
// import { AuxiliarActionsManagerService } from 'app/services/auxiliar-actions/auxiliar-actions-manager.service';
// import { ListaIdSumiAnul } from 'app/shared/fuelling-point/lista-idsumi-anul';
// Cajon Y Visor
import { SignalROPOSService } from 'app/services/signalr/signalr-opos.service';
import { OPOSOpenCashDrawerResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/opos-opencashdrawer-response-statuses.enum';
import { LanguageService } from 'app/services/language/language.service';
import { SearchDocument } from 'app/shared/web-api-responses/search-document';
import { InformeVentasRecaudacion } from 'app/shared/document/InformeVentasRecaudacion';
import { InformeVentasResumen } from 'app/shared/document/InformeVentasResumen';
import { InformeVentasCategorias } from 'app/shared/document/InformeVentasCategorias';
import { TmeService } from '../tme/tme.service';
import { PrintingService } from 'app/services/printing/printing.service';
import { PrintingInternalService } from 'app/services/printing/printing-internal.service';
import { SignalRMultiTPVService } from 'app/services/signalr/signalr-multitpv.service';
import { DocumentList } from 'app/src/custom/models/DocumentList';
import { TMEApplicationInitResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/tme-application-init-response-statuses.enum';

@Injectable()
export class DocumentService {

  _currentDocument: Subject<Document> = new Subject<Document>();
  currentDocument$ = this._currentDocument.asObservable();

  IdDocumento: string;

  DocumentPagoPendiente: Document;
  DocumentsPagosPendientes: SearchDocument[];

  private completeDocuments: Document[];

  constructor(
    private _http: HttpService,
    private _fuellingPointsSvc: FuellingPointsAnulatedService,
    private _appDataConfig: AppDataConfiguration,
    private _docInternalService: DocumentInternalService,
    private _seriesService: DocumentSeriesService,
    private _roundPipe: RoundPipe,
    private _operatorSvc: OperatorInternalService,
    // private _signalRPrintingServ: SignalRPrintingService,
    private _statusBarService: StatusBarService,
    private _documentConfirmActions: IdocumentConfirmActions,
    private _loyaltyService: LoyaltyService,
    private _signalRTMEService: SignalRTMEService,
    private _signalROPOSService: SignalROPOSService,
    private _languageService: LanguageService,
    private _TMEService: TmeService,
    private _PrintingService: PrintingService,
    private _PrintingInternalService: PrintingInternalService,
    private _multiTpvSvc: SignalRMultiTPVService,
  ) { }


  sendRunawayDocuments(documentList: Array<Document>): Observable<boolean> {
    return this._sendDocuments(documentList, 'SALE_FUGADEUDA_COFO');
  }

  sendPaymentRefundDocuments(documentList: Array<Document>): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined) {
      return this._sendDocumentsRefundFuel(documentList, 'REFUNDFUEL', [this._appDataConfig.printerPosCommands.openDrawer]);
    } else {
      return this._sendDocumentsRefundFuel(documentList, 'REFUNDFUEL');
    }
  }

  sendInvoiceDocuments(documentList: Array<Document>): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined) {
      return this._sendDocuments(documentList, 'INVOICE_COFO', [this._appDataConfig.printerPosCommands.openDrawer]);
    } else {
      return this._sendDocuments(documentList, 'INVOICE_COFO');
    }
  }

  sendSaleDocuments(documentList: Array<Document>, printDocument: boolean = true): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined && printDocument) {
      return this._sendDocuments(documentList, 'SALE_COFO', [this._appDataConfig.printerPosCommands.openDrawer]);
    } else if (!printDocument) {
      return this._sendDocumentsNoPrint(documentList);
    } else {
      return this._sendDocuments(documentList, 'SALE_COFO');
    }
  }

  sendSaleDocumentsSorteoEfectivo(documentList: Array<Document>, printDocument: boolean = true): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined && printDocument) {
      // return this._sendDocumentsSorteoEfectivo(documentList, [this._appDataConfig.printerPosCommands.openDrawer]);
      return this._sendDocumentsSorteoEfectivoPrioritarioImpresion(documentList, [this._appDataConfig.printerPosCommands.openDrawer]);
    } else if (!printDocument) {
      return this._sendDocumentsNoPrint(documentList);
    } else {
      // return this._sendDocumentsSorteoEfectivo(documentList);
      return this._sendDocumentsSorteoEfectivoPrioritarioImpresion(documentList);
    }
  }

  sendSaleDocumentPendingSorteoEfectivo(documentList: Array<Document>): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      this._TMEService.setTMEOcupado(true);
      Promise.resolve(this._TMEService.TMEButtonExacto(
        FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
        GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
          if (responseTME.status === TMEButtonExactoResponseStatuses.successful) {
            observer.next(true);
          } else if (responseTME.status === TMEButtonExactoResponseStatuses.genericError) {
            LogHelper.logError(undefined, responseTME.message);
            this._statusBarService.publishMessage(responseTME.message);
            observer.next(false);
          }
          this._TMEService.setTMEOcupado(false);
        });
    });
  }

  sendSaleDocumentsTarjeta(documentList: Array<Document>, printDocument: boolean = true): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined && printDocument) {
      return this._sendDocumentsTarjeta(documentList, [this._appDataConfig.printerPosCommands.openDrawer]);
    } else if (!printDocument) {
      return this._sendDocumentsNoPrint(documentList);
    } else {
      return this._sendDocumentsTarjeta(documentList);
    }
  }

  sendSaleDocumentPendingTarjeta(documentList: Array<Document>): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      this._TMEService.setTMEOcupado(true);
      Promise.resolve(this._TMEService.TMEButtonTarjeta(
        FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
        GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
          if (responseTME.status === TMEButtonTarjetaResponseStatuses.successful) {
            const documentTME: Document = (FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
            documentList[0].paymentDetails = documentTME.paymentDetails;
            observer.next(true);
          } else if (responseTME.status === TMEButtonTarjetaResponseStatuses.genericError) {
            LogHelper.logError(undefined, responseTME.message);
            this._statusBarService.publishMessage(responseTME.message);
            observer.next(false);
          }
          this._TMEService.setTMEOcupado(false);
        });
    });
  }

  sendSaleDocumentsMixto(documentList: Array<Document>, printDocument: boolean = true): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined && printDocument) {
      return this._sendDocumentsMixto(documentList, [this._appDataConfig.printerPosCommands.openDrawer]);
    } else if (!printDocument) {
      return this._sendDocumentsNoPrint(documentList);
    } else {
      return this._sendDocumentsMixto(documentList);
    }
  }

  sendSaleDocumentPendingMixto(documentList: Array<Document>): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      this._TMEService.setTMEOcupado(true);
      Promise.resolve(this._TMEService.TMEButtonMixto(
        FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
        GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
          if (responseTME.status === TMEButtonMixtoResponseStatuses.successful) {
            const documentTME: Document = (FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
            documentList[0].paymentDetails = documentTME.paymentDetails;
            observer.next(true);
          } else if (responseTME.status === TMEButtonMixtoResponseStatuses.genericError) {
            LogHelper.logError(undefined, responseTME.message);
            this._statusBarService.publishMessage(responseTME.message);
            observer.next(false);
          }
          this._TMEService.setTMEOcupado(false);
        });
    });
  }

  sendSaleDocumentsMixtoEfectivo(documentList: Array<Document>, printDocument: boolean = true): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined && printDocument) {
      return this._sendDocumentsMixtoEfectivo(documentList, [this._appDataConfig.printerPosCommands.openDrawer]);
    } else if (!printDocument) {
      return this._sendDocumentsNoPrint(documentList);
    } else {
      return this._sendDocumentsMixtoEfectivo(documentList);
    }
  }

  sendSaleDocumentPendingMixtoEfectivo(documentList: Array<Document>): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      this._TMEService.setTMEOcupado(true);
      Promise.resolve(this._TMEService.TMEButtonMixtoEfectivo(
        FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
        GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
          if (responseTME.status === TMEButtonMixtoResponseStatuses.successful) {
            const documentTME: Document = (FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
            documentList[0].paymentDetails = documentTME.paymentDetails;
            observer.next(true);
          } else if (responseTME.status === TMEButtonMixtoResponseStatuses.genericError) {
            LogHelper.logError(undefined, responseTME.message);
            this._statusBarService.publishMessage(responseTME.message);
            observer.next(false);
          }
        });
      this._TMEService.setTMEOcupado(false);
    });
  }

  sendSaleDocumentsCanjeCodigoBarras(documentList: Array<Document>, printDocument: boolean = true): Observable<boolean> {
    if (this._appDataConfig.printerPosCommands != undefined && printDocument) {
      return this._sendDocumentsCanjeCodigoBarras(documentList, 'SALE_COFO', [this._appDataConfig.printerPosCommands.openDrawer]);
    } else if (!printDocument) {
      return this._sendDocumentsNoPrint(documentList);
    } else {
      return this._sendDocumentsCanjeCodigoBarras(documentList, 'SALE_COFO');
    }
  }

  sendDocumentsNoPrintDocumentList(documentList: Array<Document>): Observable<boolean> {
    let isContingency: boolean = false;
    if (documentList[0].paymentDetails[0].paymentMethodId != undefined) {
      if (documentList[0].paymentDetails[0].paymentMethodId.substring(5) == PaymentMethodType.Contingency.toString()) {
        isContingency = true;
      }
    }
    return this._sendDocumentsNoPrint(documentList, isContingency);
  }

  sendPrint(documentList: Array<Document>): Observable<boolean> {
    if (documentList[0] == undefined) {
      documentList[0] = this.completeDocuments[0];
    }
    let templateTicket = 'SALE_COFO';
    if (documentList[0].pendingAmountWithTax > 0) {
      documentList[0].isDeuda = true; // DEUDA
      templateTicket = 'SALE_FUGADEUDA_COFO';
    }
    // Si el medio de pago es Credito local (13), asignamos la plantilla de credito
    if (documentList[0].paymentDetails[0].paymentMethodId != undefined) {
      if (documentList[0].paymentDetails[0].paymentMethodId.substring(5) == PaymentMethodType.localcredit.toString()) {
        templateTicket = 'SALE_CREDITO_COFO';
      } else {
        /*documentList[0].lines.forEach(linea => {
          if (linea.isConsigna == false) {
            templateTicket = 'SALE_COFO';
        });*/

        if (documentList[0].isCobro != undefined && documentList[0].isCobro) {
          templateTicket = 'COBRO_FUGA_DEUDA';
        }
      }
    }

    if (this._appDataConfig.printerPosCommands != undefined) {
      return this._sendPrint(documentList, templateTicket, [this._appDataConfig.printerPosCommands.openDrawer]);
    } else {
      return this._sendPrint(documentList, templateTicket);
    }
  }

  sendPrintAutomatic(documentList: Array<Document>): Observable<boolean> {
    let useCase = 'SALE_COFO';
    if (documentList[0].pendingAmountWithTax > 0) {
      documentList[0].isDeuda = true; // DEUDA
      useCase = 'SALE_FUGADEUDA_COFO';
    }
    return Observable.create((observer: Subscriber<boolean>) => {
      try {
        this._completeDocument(documentList)
          .first().subscribe(completeDocumentResponse => {

            if (completeDocumentResponse.success != true) {
              console.log('Error estableciendo identificador de documento');
              this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
              // this._statusBarService.publishMessage(
              //  this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
              return observer.next(false);
            }
            this._statusBarService.publishProgress(25);
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PreparingPrinting'));
            // const completeDocuments = completeDocumentResponse.object;


            this._executeLineSpecificActionsAndSendDocumentToService(documentList)
              .first().subscribe(sendDocumentResponse => {
                if (sendDocumentResponse) {
                  if (this.hayPagoEfectivo(documentList)) {
                    this.btnOpenCashDrawer();
                  }
                  this._PrintingInternalService.printDocument(
                    documentList[0],
                    useCase,
                    documentList[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                  ).catch(error => {
                    console.log('Error al generar el documento');
                    this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                    // tslint:disable-next-line:max-line-length
                    // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                  });
                }

                observer.next(true);
              });
          });
      } catch (error) {
        console.log(error);
      }
    });
  }

  sendDeliveryNote(documentList: Array<Document>): Observable<boolean> {
    return this._sendDocuments(documentList, 'DELIVERYNOTE');
  }

  cancelDocumentCOFO(ticket: Document): Observable<boolean> {
    // Variable del documento para identificar que es una anulacion
    ticket.isAnull = true;
    if (this._appDataConfig.printerPosCommands != undefined) {
      return this._cancelDocument(ticket, 'SALE_COFO', [this._appDataConfig.printerPosCommands.openDrawer]);
    } else {
      return this._cancelDocument(ticket, 'SALE_COFO');
    }
  }

  /**
  * Efectua las operaciones de preparacion de documento,
  * prueba de impresion y subida de documentos
  * @param documentList lista de documentos a enviar
  */
  private _sendDocuments(documentList: Array<Document>, useCase: string, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }
          this._statusBarService.publishProgress(25);
          this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PreparingPrinting'));
          const completeDocuments = completeDocumentResponse.object;
          // simulo una impresión del documento para comprobar que la impresora va
          this._PrintingService.simulatePrintDocument(
            completeDocuments[0],
            useCase,
            completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
            commandsList)
            .first().subscribe(response => {
              if (response.status === PrintResponseStatuses.successful) {
                console.log('simulación de impresión satisfactoria. A continuación se enviará el documento al WebAPI');

                const loyaltyAttributionInfo: LoyaltyAttributionInformation = completeDocuments[0].loyaltyAttributionInfo;
                if (loyaltyAttributionInfo != undefined) {
                  let loyaltyOperationObservable: Observable<ProcessLoyaltyAttributionAndRedeemBenefitResponse>;
                  if (loyaltyAttributionInfo) {
                    if (loyaltyAttributionInfo.actionType == LoyaltyActionType.accumulation) {
                      loyaltyOperationObservable = this._loyaltyService.accumulate(loyaltyAttributionInfo.cardNumber,
                        loyaltyAttributionInfo.documentTotalAmount, // OJO. Es el total anterior del documento
                        loyaltyAttributionInfo.currencyId,
                        loyaltyAttributionInfo.localDateTime);


                    } else {
                      loyaltyOperationObservable = this._loyaltyService.redeem(loyaltyAttributionInfo.cardNumber,
                        loyaltyAttributionInfo.documentTotalAmount,
                        loyaltyAttributionInfo.currencyId,
                        loyaltyAttributionInfo.localDateTime,
                        loyaltyAttributionInfo.amountToRedeem,
                        loyaltyAttributionInfo.benefitId);
                    }
                  }

                  loyaltyOperationObservable.subscribe(loyaltyOperationResponse => {
                    console.log('Loyalty operation response->');
                    console.log(loyaltyOperationResponse);
                  });

                  // TODO: Gestionar estados de error. Ahora mismo no se gestiona
                  // Si por ejemplo no hubiese red, no hay implementado política de reintentos
                  /*if (loyaltyOperationObservable != undefined) {
                    loyaltyAcumulationObservable.subscribe(loyaltyOperationResponse => {
                      if (loyaltyOperationResponse.status === ProcessLoyaltyAttributionAndRedeemBenefitResponseStatuses.successful) {

                      } else {
                        LogHelper.logError(undefined, loyaltyOperationResponse.message);
                        this._statusBarService.publishMessage('Error en el módulo de fidelización');
                        observer.next(false);
                      }
                    });
                  }*/
                }

                this._statusBarService.publishProgress(50);
                this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_GeneratingDocument…'));
                // envio el documento al WebApi
                this._executeLineSpecificActionsAndSendDocumentToService(documentList)
                  .first().subscribe(sendDocumentResponse => {
                    if (sendDocumentResponse) {
                      if (this.hayPagoEfectivo(documentList)) {
                        this.btnOpenCashDrawer();
                      }

                      /*
                      this._statusBarService.publishProgress(75);
                      this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_Printing'));
                      // imprimo el documento
                      this._PrintingService.printDocument(
                        completeDocuments[0],
                        useCase,
                        completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                        commandsList)
                        .first().subscribe(respuesta => {
                          // TODO: Diferenciar problemas de impresora de problemas en el módulo o el controlador
                          //      -cuidado con los problemas que puedan afectar a la SUNAT-
                          if (respuesta.status === PrintResponseStatuses.successful) {
                            this._statusBarService.publishProgress(100);
                            this._statusBarService.publishMessage(
                              this._languageService.getLiteral('document_service', 'message_StatusBar_PritingFinished'));
                            console.log('se ha impreso el documento');
                            observer.next(true);
                          } else {
                            LogHelper.logError(undefined, respuesta.message);
                            this._statusBarService.publishMessage(
                              this._languageService.getLiteral('document_service', 'error_StatusBar_PrintingErrorButDocumentGeneratedCopy'));
                            observer.next(false);
                          }
                        });
                        */

                      this._PrintingInternalService.printDocument(
                        completeDocuments[0],
                        useCase,
                        completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                        commandsList).catch(error => {
                          // tslint:disable-next-line:max-line-length
                          this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                        });
                      observer.next(true);

                    } else {
                      observer.next(false);
                    }
                  });
              } else {
                LogHelper.logError(undefined, response.message);
                this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_PreparingPrintingError'));
                observer.next(false);
              }
            });
        });
    });
  }

  private volcarInformacionNoRecibidaTME(document: Document) {
    this.completeDocuments[0].lines = document.lines;
    this.completeDocuments[0].cambio = document.cambio != undefined ? document.cambio : undefined;
    this.completeDocuments[0].isDeuda = document.isDeuda != undefined ? document.isDeuda : undefined;
    this.completeDocuments[0].pendingAmountWithTax = document.pendingAmountWithTax != undefined ? document.pendingAmountWithTax : 0;
    this.completeDocuments[0].discountAmountWithTax = document.discountAmountWithTax != undefined ? document.discountAmountWithTax : 0;
    this.completeDocuments[0].customer.matricula = document.customer.matricula;
  }

  /**
    * Efectua las operaciones de preparacion de documento,
    * prueba de impresion y subida de documentos
    * @param documentList lista de documentos a enviar
    */
  private _sendDocumentsCanjeCodigoBarras(documentList: Array<Document>, useCase: string, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }

      documentList[0].series = this._seriesService.getSeriesByFlow(
        FinalizingDocumentFlowType.EmittingTicket, 0);
      documentList[0].paymentDetails = [];
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }

          const completeDocuments = completeDocumentResponse.object;
          this._TMEService.setTMEOcupado(true);
          Promise.resolve(this._TMEService.TMEButtonCanjeCodigoBarras(
            FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId)
          ).then(responseTME => {
            if (responseTME.status === TMEButtonCanjeCodigoBarrasResponseStatuses.successful) {
              completeDocuments[0] = FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe);
              completeDocumentResponse.object = new Array<Document>(FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
              // Tienming No perder información entre angular y TME, conservando las propiedades de las promociones
              completeDocumentResponse.object[0].lines[0].appliedPromotionList =
                documentList[0].lines[0].appliedPromotionList;
              completeDocumentResponse.object[0].lines[0].appliedPromotionListHTML =
                documentList[0].lines[0].appliedPromotionListHTML;
              this.completeDocuments = completeDocumentResponse.object;
              this._statusBarService.publishProgress(25);
              this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PreparingPrinting'));
              // this.completeDocuments[0].lines = documentList[0].lines;
              // this.completeDocuments[0].cambio = documentList[0].cambio;
              this.volcarInformacionNoRecibidaTME(documentList[0]);
              // simulo una impresión del documento para comprobar que la impresora va
              this._PrintingService.simulatePrintDocument(
                completeDocuments[0],
                useCase,
                completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                commandsList)
                .first().subscribe(response => {
                  if (response.status === PrintResponseStatuses.successful) {
                    console.log('simulación de impresión satisfactoria. A continuación se enviará el documento al WebAPI');
                    const loyaltyAttributionInfo: LoyaltyAttributionInformation = completeDocuments[0].loyaltyAttributionInfo;
                    if (loyaltyAttributionInfo != undefined) {
                      let loyaltyOperationObservable: Observable<ProcessLoyaltyAttributionAndRedeemBenefitResponse>;
                      if (loyaltyAttributionInfo) {
                        if (loyaltyAttributionInfo.actionType == LoyaltyActionType.accumulation) {
                          loyaltyOperationObservable = this._loyaltyService.accumulate(loyaltyAttributionInfo.cardNumber,
                            loyaltyAttributionInfo.documentTotalAmount, // OJO. Es el total anterior del documento
                            loyaltyAttributionInfo.currencyId,
                            loyaltyAttributionInfo.localDateTime);
                        } else {
                          loyaltyOperationObservable = this._loyaltyService.redeem(loyaltyAttributionInfo.cardNumber,
                            loyaltyAttributionInfo.documentTotalAmount,
                            loyaltyAttributionInfo.currencyId,
                            loyaltyAttributionInfo.localDateTime,
                            loyaltyAttributionInfo.amountToRedeem,
                            loyaltyAttributionInfo.benefitId);
                        }
                      }
                      loyaltyOperationObservable.subscribe(loyaltyOperationResponse => {
                        console.log('Loyalty operation response->');
                        console.log(loyaltyOperationResponse);
                      });
                      // TODO: Gestionar estados de error. Ahora mismo no se gestiona
                      // Si por ejemplo no hubiese red, no hay implementado política de reintentos
                      /*if (loyaltyOperationObservable != undefined) {
                        loyaltyAcumulationObservable.subscribe(loyaltyOperationResponse => {
                          if (loyaltyOperationResponse.status === ProcessLoyaltyAttributionAndRedeemBenefitResponseStatuses.successful) {
                          } else {
                            LogHelper.logError(undefined, loyaltyOperationResponse.message);
                            this._statusBarService.publishMessage('Error en el módulo de fidelización');
                            observer.next(false);
                          }
                        });
                      }*/
                    }
                    this._statusBarService.publishProgress(50);
                    this._statusBarService.publishMessage(
                      this._languageService.getLiteral('document_service', 'message_StatusBar_GeneratingDocument…'));
                    this.fnCurrentDocument(this.completeDocuments[0]);
                    // envio el documento al WebApi
                    this._executeLineSpecificActionsAndSendDocumentToService(this.completeDocuments)
                      .first().subscribe(sendDocumentResponse => {
                        if (sendDocumentResponse) {
                          if (this.hayPagoEfectivo(documentList)) {
                            this.btnOpenCashDrawer();
                          }


                          /*
                          this._statusBarService.publishProgress(75);
                          this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_Printing'));
                          // imprimo el documento
                          this._PrintingService.printDocument(
                            completeDocuments[0],
                            useCase,
                            completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                            commandsList)
                            .first().subscribe(respuesta => {
                              // TODO: Diferenciar problemas de impresora de problemas en el módulo o el controlador
                              //      -cuidado con los problemas que puedan afectar a la SUNAT-
                              if (respuesta.status === PrintResponseStatuses.successful) {
                                this._statusBarService.publishProgress(100);
                                this._statusBarService.publishMessage(
                                  this._languageService.getLiteral('document_service', 'message_StatusBar_PritingFinished'));
                                console.log('se ha impreso el documento');
                                observer.next(true);
                              } else {
                                LogHelper.logError(undefined, respuesta.message);
                                this._statusBarService.publishMessage(
                                  this._languageService.getLiteral('document_service', 'error_StatusBar_PrintingErrorButDocumentGeneratedCopy'));
                                observer.next(false);
                              }
                            });
                            */
                          this._PrintingInternalService.printDocument(
                            completeDocuments[0],
                            useCase,
                            completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                            commandsList).catch(error => {
                              // tslint:disable-next-line:max-line-length
                              this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                            });
                          observer.next(true);
                        } else {
                          console.log('Error al generar el documento');
                          // tslint:disable-next-line:max-line-length
                          this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                          // this._statusBarService.publishMessage(
                          //  this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                          observer.next(false);
                        }
                      });
                  } else {
                    LogHelper.logError(undefined, response.message);
                    this._statusBarService.publishMessage(
                      this._languageService.getLiteral('document_service', 'error_StatusBar_PreparingPrintingError'));
                    observer.next(false);
                  }
                });
            } else if (responseTME.status === TMEButtonCanjeCodigoBarrasResponseStatuses.genericError) {
              this._statusBarService.publishMessage(responseTME.message);
              observer.next(false);
            }
            this._TMEService.setTMEOcupado(false);
          }));
        });
    });
  }

  // Nuevo método para recoger datos del suministro original
  // tslint:disable-next-line:max-line-length
  /* private _sendDocumentsSuministros(documentList: Array<Document>,  customer: CustomerSelectedResult, useCase: string, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            this._statusBarService.publishMessage('Error estableciendo identificador de documento.');
            return observer.next(false);
          }
          this._statusBarService.publishProgress(25);
          this._statusBarService.publishMessage('Preparando impresión...');
          const completeDocuments = completeDocumentResponse.object;
          // simulo una impresión del documento para comprobar que la impresora va
          this._signalRPrintingServ.simulatePrintDocument(
            completeDocuments[0],
            useCase,
            completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
            commandsList)
            .first().subscribe(response => {
              if (response.status === PrintResponseStatuses.successful) {
                console.log('simulación de impresión satisfactoria. A continuación se enviará el documento al WebAPI');
                const loyaltyAttributionInfo: LoyaltyAttributionInformation = completeDocuments[0].loyaltyAttributionInfo;
                if (loyaltyAttributionInfo != undefined) {
                  let loyaltyOperationObservable: Observable<ProcessLoyaltyAttributionAndRedeemBenefitResponse>;
                  if (loyaltyAttributionInfo) {
                    if (loyaltyAttributionInfo.actionType == LoyaltyActionType.accumulation) {
                      loyaltyOperationObservable = this._loyaltyService.accumulate(loyaltyAttributionInfo.cardNumber,
                        loyaltyAttributionInfo.documentTotalAmount, // OJO. Es el total anterior del documento
                        loyaltyAttributionInfo.currencyId,
                        loyaltyAttributionInfo.localDateTime);
                    } else {
                      loyaltyOperationObservable = this._loyaltyService.redeem(loyaltyAttributionInfo.cardNumber,
                        loyaltyAttributionInfo.documentTotalAmount,
                        loyaltyAttributionInfo.currencyId,
                        loyaltyAttributionInfo.localDateTime,
                        loyaltyAttributionInfo.amountToRedeem,
                        loyaltyAttributionInfo.benefitId);
                    }
                  }
                  loyaltyOperationObservable.subscribe(loyaltyOperationResponse => {
                    console.log('Loyalty operation response->');
                    console.log(loyaltyOperationResponse);
                  });
                }
                this._statusBarService.publishProgress(50);
                this._statusBarService.publishMessage('Generando documento...');
                // envio el documento al WebApi
                this._executeLineSpecificActionsAndSendDocumentToService(documentList)
                  .first().subscribe(sendDocumentResponse => {
                    if (sendDocumentResponse) {
                      this._statusBarService.publishProgress(75);
                      this._statusBarService.publishMessage('Imprimiendo...');
                      // imprimo el documento
                      this._signalRPrintingServ.printDocument(
                        completeDocuments[0],
                        useCase,
                        completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                        commandsList)
                        .first().subscribe(respuesta => {
                          // TODO: Diferenciar problemas de impresora de problemas en el módulo o el controlador
                          //      -cuidado con los problemas que puedan afectar a la SUNAT-
                          if (respuesta.status === PrintResponseStatuses.successful) {
                            this._statusBarService.publishProgress(100);
                            this._statusBarService.publishMessage('Impresión completada.');
                            console.log('se ha impreso el documento');
                            observer.next(true);
                          } else {
                            LogHelper.logError(undefined, respuesta.message);
                            this._statusBarService.publishMessage(
                              'Error al imprimir. El documento fue generado con éxito. Utilice el comando copia.');
                            observer.next(false);
                          }
                        });
                    } else {
                      this._statusBarService.publishMessage('Error al generar el documento.');
                      observer.next(false);
                    }
                  });
              } else {
                LogHelper.logError(undefined, response.message);
                this._statusBarService.publishMessage('Error al preparar la impresión.');
                observer.next(false);
              }
            });
        });
    });
  }*/

  /**
   * Efectua las operaciones de preparacion de documento,
   * prueba de impresion y subida de documentos
   * @param documentList lista de documentos a enviar
   */
  /*
  private _sendDocumentsSorteoEfectivo(documentList: Array<Document>, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }

          if (documentList[0].isRunAway != undefined && documentList[0].isRunAway) { // FUGA
            this.RecalcularPaymentDetailsFuga(documentList[0]);
          }

          // Comprobamos que no existan mas de dos prepagos en el mismo ticket (Limitación TME)
          if (!this._signalRTMEService.getStatusConnection() ||
            (this._signalRTMEService.getStatusConnection() && !GenericHelper._hasMoreOnePrepaid(documentList[0].lines))) {
            // Sorteo Efectivo TME
            Promise.resolve(this._TMEService.TMEButtonExacto(
              FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
              GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
                if (responseTME.status === TMEButtonExactoResponseStatuses.successful) {
                  completeDocumentResponse.object = new Array<Document>(FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
                  completeDocumentResponse.object[0].pendingAmountWithTax = documentList[0].pendingAmountWithTax;
                  // Tienming No perder información entre angular y TME, conservando las propiedades de las promociones
                  completeDocumentResponse.object[0].lines[0].appliedPromotionList =
                    documentList[0].lines[0].appliedPromotionList;
                  completeDocumentResponse.object[0].lines[0].appliedPromotionListHTML =
                    documentList[0].lines[0].appliedPromotionListHTML;
                  completeDocumentResponse.object[0].totalAmountWithTax = documentList[0].totalAmountWithTax;
                  this.completeDocuments = completeDocumentResponse.object;
                  this._statusBarService.publishProgress(50);
                  this._statusBarService.publishMessage(
                    this._languageService.getLiteral('document_service', 'message_StatusBar_GeneratingDocument…'));
                  // this.completeDocuments[0].lines = documentList[0].lines;
                  // this.completeDocuments[0].cambio = documentList[0].cambio;
                  this.volcarInformacionNoRecibidaTME(documentList[0]);
                  // CAMBIO MEDIOS DE PAGO PARA REPLICA
                  this.completeDocuments[0].isDeuda = documentList[0].isDeuda;
                  if (this.completeDocuments[0].isDeuda != undefined && this.completeDocuments[0].isDeuda) { // Deuda
                    this.RecalcularPaymentDetailsDeuda(this.completeDocuments[0]);
                  }
                  else {
                    this.RecalcularPaymentDetails(this.completeDocuments[0]);
                  }
                  this.fnCurrentDocument(this.completeDocuments[0]);
                  // envio el documento al WebApi
                  this._executeLineSpecificActionsAndSendDocumentToService(this.completeDocuments)
                    .first().subscribe(sendDocumentResponse => {
                      if (sendDocumentResponse) {
                        // cajon
                        this.btnOpenCashDrawer();
                        observer.next(true);
                      } else {
                        console.log('Error al generar el documento');
                        this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                        // this._statusBarService.publishMessage(
                        //  this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                        observer.next(false);
                      }
                    });
                } else if (responseTME.status === TMEButtonExactoResponseStatuses.genericError) {
                  // LogHelper.logError(undefined, responseTME.message);
                  console.log(responseTME.message);
                  this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                  // this._statusBarService.publishMessage(responseTME.message);
                  observer.next(false);
                }
              });
          } else {
            LogHelper.logError(undefined, 'No se puede realizar una venta con dos prepagos');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_NotSale'));
            observer.next(false);
          }
        });
    });
  }
*/

/**
 * Efectua las operaciones de preparacion de documento,
 * prueba de impresion y subida de documentos
 * @param documentList lista de documentos a enviar
 */
private _sendDocumentsSorteoEfectivoPrioritarioImpresion(documentList: Array<Document>, commandsList?: string[]): Observable<boolean> {
  let useCase = 'SALE_COFO';
  if (documentList[0].pendingAmountWithTax > 0) {
    documentList[0].isDeuda = true; // DEUDA
    useCase = 'SALE_FUGADEUDA_COFO';
  }
  return Observable.create((observer: Subscriber<boolean>) => {
    try {
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // this._statusBarService.publishMessage(
            //  this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }
          this._statusBarService.publishProgress(25);
          this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PreparingPrinting'));
          // const completeDocuments = completeDocumentResponse.object;


          this._executeLineSpecificActionsAndSendDocumentToService(documentList)
            .first().subscribe(sendDocumentResponse => {
              if (sendDocumentResponse) {
                if (this.hayPagoEfectivo(documentList)) {
                  this.btnOpenCashDrawer();
                }
                this._PrintingInternalService.printDocument(
                  documentList[0],
                  useCase,
                  documentList[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                ).catch(error => {
                  console.log('Error al generar el documento');
                  this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                  // tslint:disable-next-line:max-line-length
                  // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                });
              }

              // despues de lanzar la impresiÃ³n lo mando al TME
              Promise.resolve(this._TMEService.TMEButtonExacto(
                FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
                GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
                  if (responseTME.status === TMEButtonExactoResponseStatuses.successful) {
                    observer.next(true);
                  } else if (responseTME.status === TMEButtonExactoResponseStatuses.genericError) {
                    // LogHelper.logError(undefined, responseTME.message);
                    console.log(responseTME.message);
                    this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                    // this._statusBarService.publishMessage(responseTME.message);
                    observer.next(true);
                  }
                });
            });
        });
    } catch (error) {
      console.log(error);
    }
  });
}

  /**
   * Efectua las operaciones de preparacion de documento,
   * prueba de impresion y subida de documentos
   * @param documentList lista de documentos a enviar
   */
  private _sendDocumentsTarjeta(documentList: Array<Document>, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (!completeDocumentResponse.success) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }

          // Comprobamos que no existan mas de dos prepagos en el mismo ticket (Limitación TME) a la vez de si está o no conectado el TME
          if (!this._signalRTMEService.getStatusConnection() ||
            (this._signalRTMEService.getStatusConnection() && !GenericHelper._hasMoreOnePrepaid(documentList[0].lines))) {
            this._TMEService.setTMEOcupado(true);
            // Tarjeta TME
            Promise.resolve(this._TMEService.TMEButtonTarjeta(
              FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
              GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
                if (responseTME.status === TMEButtonTarjetaResponseStatuses.successful) {
                  completeDocumentResponse.object = new Array<Document>(FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
                  // Tienming No perder información entre angular y TME, conservando las propiedades de las promociones
                  completeDocumentResponse.object[0].lines[0].appliedPromotionList =
                    documentList[0].lines[0].appliedPromotionList;
                  completeDocumentResponse.object[0].lines[0].appliedPromotionListHTML =
                    documentList[0].lines[0].appliedPromotionListHTML;
                  this.completeDocuments = completeDocumentResponse.object;

                  this._statusBarService.publishProgress(50);
                  this._statusBarService.publishMessage(
                    this._languageService.getLiteral('document_service', 'message_StatusBar_GeneratingDocument…'));
                  // this.completeDocuments[0].lines = documentList[0].lines;
                  this.volcarInformacionNoRecibidaTME(documentList[0]);
                  this.fnCurrentDocument(this.completeDocuments[0]);
                  // envio el documento al WebApi
                  this._executeLineSpecificActionsAndSendDocumentToService(this.completeDocuments) // Se cambio por que no esta liberando Transacción
                    .first().subscribe(sendDocumentResponse => {
                      if (sendDocumentResponse) {
                        // comprueba si hay métodos de pago Efectivo
                        // esto puede suceder si se paga con efectivo pero se fideliza en el TME
                        if (this.hayPagoEfectivo(documentList) || this.hayPagoEfectivo(this.completeDocuments)) {
                          this.btnOpenCashDrawer();
                        }
                        observer.next(true);
                      } else {
                        console.log('Error al generar el documento');
                        this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                        // this._statusBarService.publishMessage(
                        //  this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                        observer.next(false);
                      }
                    });

                } else if (responseTME.status === TMEButtonTarjetaResponseStatuses.genericError) {
                  LogHelper.logError(undefined, responseTME.message);
                  this._statusBarService.publishMessage(responseTME.message);
                  observer.next(false);
                }
                this._TMEService.setTMEOcupado(false);
              });
          } else {
            LogHelper.logError(undefined, 'No se puede realizar una venta con dos prepagos');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_NotSale'));
            observer.next(false);
          }
        });
    });
  }

  fnCurrentDocument(value: Document) {
    this._currentDocument.next(value);
  }

  /**
 * Efectua las operaciones de preparacion de documento,
 * prueba de impresion y subida de documentos
 * @param documentList lista de documentos a enviar
 */
  private _sendDocumentsMixto(documentList: Array<Document>, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            //  this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }

          if (documentList[0].isRunAway != undefined && documentList[0].isRunAway) { // FUGA
            this.RecalcularPaymentDetailsFuga(documentList[0]);
          }

          if (!this._signalRTMEService.getStatusConnection() ||
            (this._signalRTMEService.getStatusConnection() && !GenericHelper._hasMoreOnePrepaid(documentList[0].lines))) {
            this._TMEService.setTMEOcupado(true);
            Promise.resolve(this._TMEService.TMEButtonMixto(
              FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
              GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
                if (responseTME.status === TMEButtonMixtoResponseStatuses.successful) {
                  completeDocumentResponse.object = new Array<Document>(FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
                  completeDocumentResponse.object[0].pendingAmountWithTax = documentList[0].pendingAmountWithTax;
                  completeDocumentResponse.object[0].totalAmountWithTax = documentList[0].totalAmountWithTax;
                  // Tienming No perder información entre angular y TME, conservando las propiedades de las promociones
                  completeDocumentResponse.object[0].lines[0].appliedPromotionList =
                    documentList[0].lines[0].appliedPromotionList;
                  completeDocumentResponse.object[0].lines[0].appliedPromotionListHTML =
                    documentList[0].lines[0].appliedPromotionListHTML;
                  this.completeDocuments = completeDocumentResponse.object;
                  this._statusBarService.publishProgress(50);
                  this._statusBarService.publishMessage(
                    this._languageService.getLiteral('document_service', 'message_StatusBar_GeneratingDocument…'));
                  // this.completeDocuments[0].lines = documentList[0].lines;
                  // this.completeDocuments[0].cambio = documentList[0].cambio;
                  this.volcarInformacionNoRecibidaTME(documentList[0]);
                  // CAMBIO MEDIOS DE PAGO PARA REPLICA
                  this.completeDocuments[0].isDeuda = documentList[0].isDeuda;
                  if (this.completeDocuments[0].isDeuda != undefined && this.completeDocuments[0].isDeuda) { // Deuda
                    this.RecalcularPaymentDetailsDeuda(this.completeDocuments[0]);
                  }
                  else {
                    this.RecalcularPaymentDetails(this.completeDocuments[0]);
                  }
                  this.fnCurrentDocument(this.completeDocuments[0]);
                  // envio el documento al WebApi
                  this._executeLineSpecificActionsAndSendDocumentToService(this.completeDocuments) // Se cambio por que no esta liberando Transacción
                    .first().subscribe(sendDocumentResponse => {
                      if (sendDocumentResponse) {
                        if (this.hayPagoEfectivo(documentList)) {
                          this.btnOpenCashDrawer();
                        }
                        observer.next(true);
                      } else {
                        console.log('Error al generar el documento');
                        this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                        // this._statusBarService.publishMessage(
                        //  this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                        observer.next(false);
                      }
                    });
                } else if (responseTME.status === TMEButtonMixtoResponseStatuses.genericError) {
                  LogHelper.logError(undefined, responseTME.message);
                  this._statusBarService.publishMessage(responseTME.message);
                  observer.next(false);
                }
                this._TMEService.setTMEOcupado(false);
              });
          } else {
            LogHelper.logError(undefined, 'No se puede realizar una venta con dos prepagos');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_NotSale'));
            observer.next(false);
          }
        });
    });
  }

  /**
* Efectua las operaciones de preparacion de documento,
* prueba de impresion y subida de documentos
* @param documentList lista de documentos a enviar
*/
  private _sendDocumentsMixtoEfectivo(documentList: Array<Document>, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }

          if (documentList[0].isRunAway != undefined && documentList[0].isRunAway) { // FUGA
            this.RecalcularPaymentDetailsFuga(documentList[0]);
          }

          if (!this._signalRTMEService.getStatusConnection() ||
            (this._signalRTMEService.getStatusConnection() && !GenericHelper._hasMoreOnePrepaid(documentList[0].lines))) {
            this._TMEService.setTMEOcupado(true);
            Promise.resolve(this._TMEService.TMEButtonMixtoEfectivo(
              FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
              GenericHelper._numberLinePrepaid(documentList[0].lines))).then(responseTME => {
                if (responseTME.status === TMEButtonMixtoResponseStatuses.successful) {
                  completeDocumentResponse.object[0].pendingAmountWithTax = documentList[0].pendingAmountWithTax;
                  completeDocumentResponse.object[0].totalAmountWithTax = documentList[0].totalAmountWithTax;
                  completeDocumentResponse.object = new Array<Document>(FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
                  // Tienming No perder información entre angular y TME, conservando las propiedades de las promociones
                  completeDocumentResponse.object[0].lines[0].appliedPromotionList =
                    documentList[0].lines[0].appliedPromotionList;
                  completeDocumentResponse.object[0].lines[0].appliedPromotionListHTML =
                    documentList[0].lines[0].appliedPromotionListHTML;
                  this.completeDocuments = completeDocumentResponse.object;
                  this._statusBarService.publishProgress(50);
                  this._statusBarService.publishMessage(
                    this._languageService.getLiteral('document_service', 'message_StatusBar_GeneratingDocument…'));
                  // this.completeDocuments[0].lines = documentList[0].lines;
                  // this.completeDocuments[0].cambio = documentList[0].cambio;
                  this.volcarInformacionNoRecibidaTME(documentList[0]);
                  // CAMBIO MEDIOS DE PAGO PARA REPLICA
                  this.completeDocuments[0].isDeuda = documentList[0].isDeuda;
                  if (this.completeDocuments[0].isDeuda != undefined && this.completeDocuments[0].isDeuda) { // Deuda
                    this.RecalcularPaymentDetailsDeuda(this.completeDocuments[0]);
                  }
                  else {
                    this.RecalcularPaymentDetails(this.completeDocuments[0]);
                  }
                  this.fnCurrentDocument(this.completeDocuments[0]);
                  // envio el documento al WebApi
                  this._executeLineSpecificActionsAndSendDocumentToService(this.completeDocuments) // Se cambio por que no esta liberando Transacción
                    .first().subscribe(sendDocumentResponse => {
                      if (sendDocumentResponse) {
                        // cajon
                        this.btnOpenCashDrawer();
                        observer.next(true);
                      } else {
                        console.log('Error al generar el documento');
                        this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                        // tslint:disable-next-line:max-line-length
                        // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                        observer.next(false);
                      }
                    });
                } else if (responseTME.status === TMEButtonMixtoResponseStatuses.genericError) {
                  LogHelper.logError(undefined, responseTME.message);
                  this._statusBarService.publishMessage(responseTME.message);
                  observer.next(false);
                }
              });
          } else {
            LogHelper.logError(undefined, 'No se puede realizar una venta con dos prepagos');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_NotSale'));
            observer.next(false);
          }
          this._TMEService.setTMEOcupado(false);
        });
    });
  }

  private _sendDocumentsRefundFuel(documentList: Array<Document>, useCase: string,
    commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (commandsList == undefined) {
        commandsList = [];
      }
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }

          this._TMEService.setTMEOcupado(true);
          Promise.resolve(this._TMEService.TMEButtonRefundFuel(
            FormatHelper.formatDocumentToServiceExpectedObject(documentList[0], this._appDataConfig.userConfiguration.PosId),
            this._operatorSvc.currentOperator.id)).then(responseTME => {
              if (responseTME.status === TMEButtonRefundFuelResponseStatuses.successful) {
                completeDocumentResponse.object = new Array<Document>(FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe));
                this.completeDocuments = completeDocumentResponse.object;
                this.completeDocuments[0].customer = documentList[0].customer;
                // observer.next(true);

                this._statusBarService.publishProgress(25);
                this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PreparingPrinting'));
                const completeDocuments = completeDocumentResponse.object;
                completeDocuments[0].customer = documentList[0].customer;
                completeDocuments[0].lines[0].businessSpecificLineInfo = documentList[0].lines[0].businessSpecificLineInfo;
                // simulo una impresión del documento para comprobar que la impresora va
                this._PrintingService.simulatePrintDocument(
                  completeDocuments[0],
                  useCase,
                  completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                  commandsList)
                  .first().subscribe(response => {
                    if (response.status === PrintResponseStatuses.successful) {
                      console.log('simulación de impresión satisfactoria. A continuación se enviará el documento al WebAPI');

                      const loyaltyAttributionInfo: LoyaltyAttributionInformation = completeDocuments[0].loyaltyAttributionInfo;
                      if (loyaltyAttributionInfo != undefined) {
                        let loyaltyOperationObservable: Observable<ProcessLoyaltyAttributionAndRedeemBenefitResponse>;
                        if (loyaltyAttributionInfo) {
                          if (loyaltyAttributionInfo.actionType == LoyaltyActionType.accumulation) {
                            loyaltyOperationObservable = this._loyaltyService.accumulate(loyaltyAttributionInfo.cardNumber,
                              loyaltyAttributionInfo.documentTotalAmount, // OJO. Es el total anterior del documento
                              loyaltyAttributionInfo.currencyId,
                              loyaltyAttributionInfo.localDateTime);


                          } else {
                            loyaltyOperationObservable = this._loyaltyService.redeem(loyaltyAttributionInfo.cardNumber,
                              loyaltyAttributionInfo.documentTotalAmount,
                              loyaltyAttributionInfo.currencyId,
                              loyaltyAttributionInfo.localDateTime,
                              loyaltyAttributionInfo.amountToRedeem,
                              loyaltyAttributionInfo.benefitId);
                          }
                        }

                        loyaltyOperationObservable.subscribe(loyaltyOperationResponse => {
                          console.log('Loyalty operation response->');
                          console.log(loyaltyOperationResponse);
                        });

                        // TODO: Gestionar estados de error. Ahora mismo no se gestiona
                        // Si por ejemplo no hubiese red, no hay implementado política de reintentos
                        /*if (loyaltyOperationObservable != undefined) {
                          loyaltyAcumulationObservable.subscribe(loyaltyOperationResponse => {
                            if (loyaltyOperationResponse.status === ProcessLoyaltyAttributionAndRedeemBenefitResponseStatuses.successful) {
                            } else {
                              LogHelper.logError(undefined, loyaltyOperationResponse.message);
                              this._statusBarService.publishMessage('Error en el módulo de fidelización');
                              observer.next(false);
                            }
                          });
                        }*/
                      }

                      this._statusBarService.publishProgress(50);
                      this._statusBarService.publishMessage(
                        this._languageService.getLiteral('document_service', 'message_StatusBar_GeneratingDocument…'));
                      // envio el documento al WebApi
                      this._executeLineSpecificActionsAndSendDocumentToService(documentList)
                        .first().subscribe(sendDocumentResponse => {
                          if (sendDocumentResponse) {

                            // Comprobar si alguno de los metodos de pago es efectivo
                            if (this.hayPagoEfectivo(documentList)) {
                              this.btnOpenCashDrawer();
                            }


                            this._PrintingInternalService.printDocument(
                              completeDocuments[0],
                              useCase,
                              completeDocuments[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
                              commandsList,
                              false).catch(error => {
                                // tslint:disable-next-line:max-line-length
                                this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                              });
                            observer.next(true);

                          } else {
                            console.log('Error al generar el documento');
                            // tslint:disable-next-line:max-line-length
                            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                            // this._statusBarService.publishMessage(
                            //  this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                            observer.next(false);
                          }
                        });
                    } else {
                      LogHelper.logError(undefined, response.message);
                      this._statusBarService.publishMessage(
                        this._languageService.getLiteral('document_service', 'error_StatusBar_PreparingPrintingError'));
                      observer.next(false);
                    }
                  });
              } else if (responseTME.status === TMEButtonRefundFuelResponseStatuses.genericError) {
                LogHelper.logError(undefined, responseTME.message);
                this._statusBarService.publishMessage(responseTME.message);
                observer.next(false);
              }
              this._TMEService.setTMEOcupado(false);
              Promise.resolve(this._signalRTMEService.startInitializationProcess()).then(response => {
                if (response.status === TMEApplicationInitResponseStatuses.successful) {
                  this._signalRTMEService.setStatusConnection(true);
                } else if (response.status === TMEApplicationInitResponseStatuses.genericError) {
                  this._signalRTMEService.setStatusConnection(false);
                }
              });
            });
        });
    });
  }

  private _sendPrint(documentList: Array<Document>, useCase: string, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PreparingPrinting'));
      // simulo una impresión del documento para comprobar que la impresora va
      this._PrintingService.simulatePrintDocument(
        documentList[0],
        useCase,
        documentList[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
        commandsList)
        .first().subscribe(response => {
          if (response.status === PrintResponseStatuses.successful) {
            console.log('simulación de impresión satisfactoria. A continuación se enviará el documento al WebAPI');

            const loyaltyAttributionInfo: LoyaltyAttributionInformation = documentList[0].loyaltyAttributionInfo;
            if (loyaltyAttributionInfo != undefined) {
              let loyaltyOperationObservable: Observable<ProcessLoyaltyAttributionAndRedeemBenefitResponse>;
              if (loyaltyAttributionInfo) {
                if (loyaltyAttributionInfo.actionType == LoyaltyActionType.accumulation) {
                  loyaltyOperationObservable = this._loyaltyService.accumulate(loyaltyAttributionInfo.cardNumber,
                    loyaltyAttributionInfo.documentTotalAmount, // OJO. Es el total anterior del documento
                    loyaltyAttributionInfo.currencyId,
                    loyaltyAttributionInfo.localDateTime);
                } else {
                  loyaltyOperationObservable = this._loyaltyService.redeem(loyaltyAttributionInfo.cardNumber,
                    loyaltyAttributionInfo.documentTotalAmount,
                    loyaltyAttributionInfo.currencyId,
                    loyaltyAttributionInfo.localDateTime,
                    loyaltyAttributionInfo.amountToRedeem,
                    loyaltyAttributionInfo.benefitId);
                }
              }
              loyaltyOperationObservable.subscribe(loyaltyOperationResponse => {
                console.log('Loyalty operation response->');
                console.log(loyaltyOperationResponse);
              });
            }

            // Modificacion Impresion Async
            this._PrintingInternalService.printDocument(
              documentList[0],
              useCase,
              documentList[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
              commandsList).catch(error => {
                this._statusBarService.publishMessage(
                  this._languageService.getLiteral('document_service', 'error_StatusBar_PrintingErrorButDocumentGeneratedCopy'));
              }
              );
            documentList[0].isDeuda = false;
            observer.next(true);

            /* envio el documento al WebApi
            this._statusBarService.publishProgress(75);
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_Printing'));
            // imprimo el documento
            this._PrintingService.printDocument(
              documentList[0],
              useCase,
              documentList[0].pendingAmountWithTax > 0 ? 2 : undefined, // numero de copias si hay importe pendiente
              commandsList)
              .first().subscribe(respuesta => {
                // TODO: Diferenciar problemas de impresora de problemas en el módulo o el controlador
                //      -cuidado con los problemas que puedan afectar a la SUNAT-
                if (respuesta.status === PrintResponseStatuses.successful) {
                  documentList[0].isDeuda = false;
                  this._statusBarService.publishProgress(100);
                  this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PritingFinished'));
                  console.log('se ha impreso el documento');
                  // Limpiamos la variable this.completeDocuments
                  observer.next(true);
                } else {
                  LogHelper.logError(undefined, respuesta.message);
                  this._statusBarService.publishMessage(
                    this._languageService.getLiteral('document_service', 'error_StatusBar_PrintingErrorButDocumentGeneratedCopy'));
                  observer.next(false);
                }
              });
              */

          } else {
            LogHelper.logError(undefined, response.message);
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_PreparingPrintingError'));
            observer.next(false);
          }
        });
    });
  }


  private ProcesarSumiAnul(docSumiAnul: Document) {
    const listaSumiAnul: SuplyTransaction[] = [];
    let cadenaExtraData: string;
    let cont: number = 0;

    docSumiAnul.lines.forEach(linea => {
      if (linea.typeArticle != undefined &&
        linea.typeArticle.includes('COMBU') &&
        linea.businessSpecificLineInfo != undefined &&
        linea.businessSpecificLineInfo.supplyTransaction != undefined &&
        linea.businessSpecificLineInfo.supplyTransaction.anulated != undefined &&
        linea.businessSpecificLineInfo.supplyTransaction.anulated == true) {
        // Añadimos si es Consigna a las lineas de producto de Suministros Anulados.
        linea.isConsigna = linea.businessSpecificLineInfo.supplyTransaction.isConsigna;

        // Rellenamos la lista de los Suministros Anulados que van a ser eliminados.
        listaSumiAnul.push(linea.businessSpecificLineInfo.supplyTransaction);

        // Rellenamos la cadena que contendrá el Extra Data.
        if (cont == 0) {
          cadenaExtraData = linea.businessSpecificLineInfo.supplyTransaction.idMov + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.fecha + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.nSurtidor + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.nBoquerel.trim() + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.gradeReference;
        }
        else {
          cadenaExtraData += '|' + linea.businessSpecificLineInfo.supplyTransaction.idMov + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.fecha + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.nSurtidor + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.nBoquerel.trim() + ';'
            + linea.businessSpecificLineInfo.supplyTransaction.gradeReference;
        }
        cont++;
      }
    });

    if (listaSumiAnul.length > 0) {
      this.DeleteSuppliesAnulated(listaSumiAnul);

      // Incluimos el Extra Data necesario para Suministros Anulados.
      docSumiAnul.extraData = { 'RETURNOIL_ORIGTICKET_ANGULAR': cadenaExtraData };
    }
  }

  DeleteAllSuppliesAnulated(documentList: SuplyTransaction[]) {
    this.DeleteSuppliesAnulated(documentList);
  }

  private RecalcularPaymentDetails(docRecalcular: Document) {
    if (docRecalcular.paymentDetails.length == 1) {
      const importeT = docRecalcular.totalAmountWithTax;
      const cambioT = docRecalcular.cambio;
      docRecalcular.paymentDetails[0].primaryCurrencyGivenAmount = importeT + cambioT;
      docRecalcular.paymentDetails[0].primaryCurrencyTakenAmount = importeT;
    }
  }

  private RecalcularPaymentDetailsFuga(docRecalcular: Document) {
    const importeT = docRecalcular.totalAmountWithTax;
    // const cambioT = docRecalcular.cambio;
    docRecalcular.paymentDetails.find(p => p.paymentMethodId === this._appDataConfig.company.id + '09').primaryCurrencyGivenAmount = 0;
    docRecalcular.paymentDetails.find(p => p.paymentMethodId === this._appDataConfig.company.id + '09').primaryCurrencyTakenAmount = importeT;
  }

  private RecalcularPaymentDetailsDeuda(docRecalcular: Document) {
    // SE COMENTA HASTA QUE SE PUEDA PROBAR BIEN EN LAB
    /*docRecalcular.paymentDetails.forEach(element => {
      element.primaryCurrencyGivenAmount = element.primaryCurrencyTakenAmount;
    });*/
  }


  private _sendDocumentsNoPrint(documentList: Array<Document>, isContingency: boolean = false): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      this._completeDocument(documentList)
        .first().subscribe(completeDocumentResponse => {
          if (completeDocumentResponse.success != true) {
            console.log('Error estableciendo identificador de documento');
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
            // tslint:disable-next-line:max-line-length
            // this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_SettingDocumentNumberError'));
            return observer.next(false);
          }
          // envio el documento al WebApi
          this._executeLineSpecificActionsAndSendDocumentToService(documentList, isContingency)
            .first().subscribe(sendDocumentResponse => {
              if (sendDocumentResponse) {
                /* Al realizar una venta con aspa roja no hay que abrir cajón
                if (this.hayPagoEfectivo(documentList)) {
                  this.btnOpenCashDrawer();
                }
                */
                observer.next(true);
              } else {
                console.log('Error al generar el documento');
                this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_tryAgainOrContingency'));
                // this._statusBarService.publishMessage(
                //  this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                observer.next(false);
              }
            });
        });
    });
  }

  // envio de un pago pendiente
  sendPaymentDetail(documentId: string, paymentDetailList: Array<PaymentDetail>): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (paymentDetailList.length < 1) {
        observer.next(false);
        return;
      }
      const arrObservables: Array<Observable<any>> = [];
      const today = new Date();

      let hayPagoEfectivo: boolean = false;

      for (const payment of paymentDetailList) {

        if (this.EsPagoEfectivo(payment)) {
          hayPagoEfectivo = true;
        }

        const request = {
          identity: this._appDataConfig.userConfiguration.Identity,
          documentId: documentId,
          operatorId: this._getCurrentOperatorId(),
          createDao: {
            localDateTime: FormatHelper.dateToISOString(today),
            utcDateTime: FormatHelper.dateToISOString(
              FormatHelper.formatToUTCDateFromLocalDate(today)
            ),
            paymentMethodId: payment.paymentMethodId,
            currencyId: payment.currencyId,
            changeFactorFromBase: payment.changeFactorFromBase,
            primaryCurrencyGivenAmount: payment.primaryCurrencyGivenAmount,
            primaryCurrencyTakenAmount: payment.primaryCurrencyTakenAmount,
            secondaryCurrencyGivenAmount: payment.secondaryCurrencyGivenAmount,
            secondaryCurrencyTakenAmount: payment.secondaryCurrencyTakenAmount,
            extraData: payment.extraData,
            usageType: PaymentPurpose.PendingPayment
          }
        };

        if (hayPagoEfectivo) {
          this.btnOpenCashDrawer();
        }
        arrObservables.push(
          this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/CreateDocumentPaymentDetail`, request)
        );
      }
      // comprimo las respuestas en una sola
      Observable.zip(...arrObservables) // tomamos la primera salida unicamente
        .first().subscribe(zipResponses => {
          // verifico las respuestas, si alguna dio error devolvemos false
          for (const createResponse of zipResponses) {
            if (createResponse.status != 1) {
              observer.next(false);
              console.log(createResponse.message);
            }
          }
          observer.next(true);
        });
    });
  }

  // envio de un pago pendiente
  sendPaymentDetailMassive(documentIdList: Array<DocumentList>): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      let request: any;
      const listRequest: Array<any> = [];
      const arrObservables: Array<Observable<any>> = [];

      for (const doc of documentIdList) {
        const paymentDetailList: Array<PaymentDetail> = doc.paymentDetailList;
        if (paymentDetailList.length < 1) {
          // observer.next(false);
          continue;
        }

        const today = new Date();
        let hayPagoEfectivo: boolean = false;

        for (const payment of paymentDetailList) {

          if (this.EsPagoEfectivo(payment)) {
            hayPagoEfectivo = true;
          }

          const itemRequest = {
            documentId: this._appDataConfig.company.id + doc.id,
            operatorId: this._getCurrentOperatorId(),
            localDateTime: FormatHelper.dateToISOString(today),
            utcDateTime: FormatHelper.dateToISOString(
              FormatHelper.formatToUTCDateFromLocalDate(today)
            ),
            paymentMethodId: payment.paymentMethodId,
            currencyId: payment.currencyId,
            changeFactorFromBase: payment.changeFactorFromBase,
            primaryCurrencyGivenAmount: payment.primaryCurrencyGivenAmount,
            primaryCurrencyTakenAmount: payment.primaryCurrencyTakenAmount,
            secondaryCurrencyGivenAmount: payment.secondaryCurrencyGivenAmount,
            secondaryCurrencyTakenAmount: payment.secondaryCurrencyTakenAmount,
            extraData: payment.extraData,
            usageType: PaymentPurpose.PendingPayment
          };

          if (hayPagoEfectivo) {
            this.btnOpenCashDrawer();
          }

          listRequest.push(itemRequest);
        }

      }
      request = { identity: this._appDataConfig.userConfiguration.Identity, ListCreateDAO: listRequest };
      arrObservables.push(
        this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/CreateDocumentPaymentDetailMassive`, request)
      );

      // comprimo las respuestas en una sola
      Observable.zip(...arrObservables) // tomamos la primera salida unicamente
        .first().subscribe(zipResponses => {
          // verifico las respuestas, si alguna dio error devolvemos false
          for (const createResponse of zipResponses) {
            if (createResponse.status != 1) {
              observer.next(false);
              console.log(createResponse.message);
            }
          }
          observer.next(true);
        });
    });
  }

  /**
   * Completa el docuento que se obtiene de plataforma.
   * Calcula la lista de ivas, ya que no viene porpltaforma
   *
   * @param {Document} document
   * @memberof DocumentService
   */
  completCopyDocument(document: Document) {
    document.lines.forEach(line => {
      if (line) {
        this._calculateLineDiscountData(line);
        this._calculateLineTaxAmountData(line);
      }
    });
    // cálculos generales del documento
    this._calculateDocumentTaxList(document);
  }

  SetDocumentPagoPendiente(document: Document) {
    this.DocumentPagoPendiente = document;
  }
  SetDocumentsPagosPendientes(documents: SearchDocument[]) {
    this.DocumentsPagosPendientes = documents;
  }

  /**
   *
   * PRIVADAS
   *
   */

  // envia documento cancelado
  private _cancelDocument(ticket: Document, useCase: string, commandsList?: string[]): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      let documentoRectificador = this.generateRectifyingDocument(ticket);
      let documentoPostTME = this.generateRectifyingDocument(ticket);
      console.log(documentoRectificador);
      this._completeDocument([documentoRectificador]).first().subscribe(completeDocumentResponse => {
        documentoRectificador = completeDocumentResponse.object[0];
        this.recalculateTaxList(ticket, documentoRectificador);
        // CRÉDITO LOCAL
        if (documentoRectificador.paymentDetails[0].paymentMethodId.substring(5) == PaymentMethodType.localcredit.toString()) {
          documentoRectificador.paymentDetails[0].extraData = { 'Remarks': 'CREDITO_LOCAL' };
        }
        documentoRectificador.changeDelivered = 0;
        documentoRectificador.operator = this._operatorSvc.currentOperator;
        this._TMEService.setTMEOcupado(true);
        Promise.resolve(this._TMEService.TMEButtonRefundComplete(
          FormatHelper.formatDocumentToServiceExpectedObject(documentoRectificador, this._appDataConfig.userConfiguration.PosId),
          this._operatorSvc.currentOperator.id)).then(responseTME => {
            if (responseTME.status === TMEButtonRefundCompleteResponseStatuses.successful) {
              documentoPostTME = FormatHelper.formatServiceDocument(responseTME.objDocument, this._roundPipe);
              // Obtenemos informacion documento no incluida por el TME
              documentoPostTME.lines = documentoRectificador.lines;
              documentoPostTME.cambio = documentoRectificador.cambio != undefined ? documentoRectificador.cambio : undefined;
              documentoPostTME.pendingAmountWithTax = documentoRectificador.pendingAmountWithTax != undefined ?
                documentoRectificador.pendingAmountWithTax : 0;
              documentoPostTME.isAnull = documentoRectificador.isAnull != undefined ? documentoRectificador.isAnull : undefined;
              documentoPostTME.discountAmountWithTax = documentoRectificador.discountAmountWithTax != undefined ?
                documentoRectificador.discountAmountWithTax : undefined;
              documentoPostTME.subTotal = documentoRectificador.subTotal != undefined ? documentoRectificador.subTotal : undefined;
              documentoPostTME.taxableAmount = documentoRectificador.taxableAmount != undefined ? documentoRectificador.taxableAmount : undefined;
              documentoPostTME.totalTaxAmount = documentoRectificador.totalTaxAmount != undefined ? documentoRectificador.totalTaxAmount : undefined;
              // Tienming No perder información entre angular y TME, conservando las propiedades de las promociones
              documentoPostTME.lines[0].appliedPromotionList =
                documentoRectificador.lines[0].appliedPromotionList;
              documentoPostTME.lines[0].appliedPromotionListHTML =
                documentoRectificador.lines[0].appliedPromotionListHTML;
              this._executeLineSpecificActionsAndSendDocumentToServiceAnnull(new Array<Document>(documentoPostTME), ticket.documentId)
                .first().subscribe(response => {
                  // Si anula suministros => Actualiza la tabla de SUMINISTROS_ANULADOS
                  this._insertSupplyTransaction(ticket);
                  /*
                  this._statusBarService.publishProgress(75);
                  this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_Printing'));
                  // imprimo el documento
                  this._PrintingService.printDocument(documentoRectificador, useCase, undefined, commandsList, false)
                    .first().subscribe(respuesta => {
                      if (respuesta.status === PrintResponseStatuses.successful) {
                        this._statusBarService.publishProgress(100);
                        this._statusBarService.publishMessage(
                          this._languageService.getLiteral('document_service', 'message_StatusBar_PritingFinished'));
                        console.log('se ha impreso el documento');
                        observer.next(true);
                      } else {
                        LogHelper.logError(undefined, respuesta.message);
                        this._statusBarService.publishMessage(
                          this._languageService.getLiteral('document_service', 'error_StatusBar_PrintingErrorButDocumentGeneratedCopy'));
                        observer.next(false);
                      }
                    });
                    */

                  // Comprobar si alguno de los metodos de pago es efectivo
                  if (this.hayPagoEfectivo(new Array<Document>(documentoPostTME))) {
                    this.btnOpenCashDrawer();
                  }

                  this._PrintingInternalService.printDocument(documentoRectificador, useCase, undefined, commandsList, false).catch(error => {
                    // tslint:disable-next-line:max-line-length
                    this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_GeneratingDocumentError'));
                  });
                  observer.next(response);
                });
            } else {
              this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_CancelTME'));
              console.log(responseTME.message);
              observer.next(false);
            }
            Promise.resolve(this._signalRTMEService.startInitializationProcess()).then(response => {
              if (response.status === TMEApplicationInitResponseStatuses.successful) {
                this._signalRTMEService.setStatusConnection(true);
              } else if (response.status === TMEApplicationInitResponseStatuses.genericError) {
                this._signalRTMEService.setStatusConnection(false);
              }
            });
            this._TMEService.setTMEOcupado(false);
          });
      });
    });
  }

  private recalculateTaxList(document: Document, documentRec: Document) {
    for (const key in documentRec.totalTaxList) {
      if (documentRec.totalTaxList.hasOwnProperty(key)) {
        documentRec.totalTaxList[key] = -document.totalTaxList[key + '.0000'];
      }
    }
  }

  // se solicita el identificador y se completa el documento
  private _completeDocument(documentList: Array<Document>): Observable<IresponseSuccessWithObject<Array<Document>>> {
    // Datos adicionales: fechas y calculos finales
    return Observable.create((observer: Subscriber<IresponseSuccessWithObject<Array<Document>>>) => {

      if (documentList[0].ticketFactura == undefined || documentList[0].ticketFactura != true) {
        this._setAdditionalData(documentList);
        // Se agrega subTotal
        let subtotalLines: number = 0;
        for (let i = 0; i < documentList.length; i++) {
          documentList[i].lines.forEach(element => {
            if (isNumber(element.totalAmountWithTax)) {
              subtotalLines += element.totalAmountWithTax;
            }
          });
          documentList[i].subTotal = subtotalLines;
        }
        const documentListJson: any =
          FormatHelper.formatDocumentListToServiceExpectedObject(documentList, this._appDataConfig.userConfiguration.PosId);
        documentListJson.posId = this._appDataConfig.userConfiguration.PosId;

        const request = { identity: this._appDataConfig.userConfiguration.Identity, createDAOList: documentListJson };
        // consigo el mapeo de identificadores del documento
        this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/GetProvisionalIdToDocumentNumberMapping`, request).subscribe(
          response => {
            if (response.status == 1) {
              // aplico el mapeo segun el identificador provisional generado en el formatHelper
              documentList = documentList.map(selectedDocument => {
                // Serializacion de tupla
                const idCodePair: {
                  // id documento
                  item1: string;
                  // document Number
                  item2: string
                } = response.provisionalToDefinitiveDocumentIdDictionary[selectedDocument.provisionalId];
                if (idCodePair !== undefined) {
                  selectedDocument.documentNumber = idCodePair.item2;
                  selectedDocument.documentId = idCodePair.item1;
                  this.IdDocumento = idCodePair.item1;
                  selectedDocument.emissionLocalDateTime = new Date();
                  selectedDocument.emissionUTCDateTime = FormatHelper.formatToUTCDateFromLocalDate(selectedDocument.emissionLocalDateTime);
                  return selectedDocument;
                }
                return selectedDocument;
              });
              observer.next({
                success: true,
                object: documentList
              });
            } else {
              console.error(response.message);
              observer.next({
                success: false,
                object: undefined
              });
            }
          },
          error => {
            console.log(error);
            observer.next({
              success: false,
              object: undefined
            });
          });
      }
      else {
        return observer.next({
          success: true,
          object: documentList
        });
      }

    });
  }

  // se envia documento a servicio
  private _executeLineSpecificActionsAndSendDocumentToService(documentList: Array<Document>, esContigencia: boolean = false): Observable<boolean> {

    // Incluimos la Consigna, eliminamos de la réplica los Sumunistros anulados
    // y añadimos la parte del Extra Data.
    this.ProcesarSumiAnul(documentList[0]);

    return Observable.create((observer: Subscriber<boolean>) => {

      if (documentList[0].ticketFactura == undefined || documentList[0].ticketFactura != true) {
        if (documentList == undefined) {
          observer.next(false);
        }

        const documentListJson: any =
          FormatHelper.formatDocumentListToServiceExpectedObject(documentList, this._appDataConfig.userConfiguration.PosId);
        documentListJson.posId = this._appDataConfig.userConfiguration.PosId;

        const request = { identity: this._appDataConfig.userConfiguration.Identity, createDAOList: documentListJson };
        this.confirmPayActionsDocuments(documentList)
          .first().subscribe(allOk => {
            allOk = esContigencia ? esContigencia : allOk; // Solo para contigencia
            if (!allOk) {
              LogHelper.logError(undefined, 'Error confirmando actiones de pago (antes de createDocument)');
              observer.next(false);
            } else {
              this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/CreateDocuments`, request).subscribe(
                response => {
                  // TODO: ¿Creamos un modelo de respuesta con los códigos específicos para cada una de las llamadas al demonio?
                  if (response.status == 1) {
                    // transacciones huerfanas, informamos que se ha subido correctamente
                    this.confirmTransactionsDocuments(documentList)
                      .first().subscribe(responseConfirmTransactions => {
                        responseConfirmTransactions = esContigencia ? esContigencia : responseConfirmTransactions;
                        if (responseConfirmTransactions) {
                          observer.next(true);
                        } else {
                          LogHelper.logError(undefined, `Error confirmando transacciones`);
                          observer.next(false);
                        }
                      });
                  } else {
                    LogHelper.logError(undefined, `Error al ejecutar CreateDocuments. Respuesta recibida: ${response.message}`);
                    observer.next(false);
                  }
                },
                error => {
                  console.log(error);
                  observer.next(false);
                });
            }
          });

      }
      else {
        return observer.next(true);
      }

    });
  }

  // se envia documento a servicio
  private _executeLineSpecificActionsAndSendDocumentToServiceAnnull(documentList: Array<Document>, nTicketO: String): Observable<boolean> {

    // Incluimos la Consigna, eliminamos de la réplica los Sumunistros anulados
    // y añadimos la parte del Extra Data.
    this.ProcesarSumiAnul(documentList[0]);

    return Observable.create((observer: Subscriber<boolean>) => {

      if (documentList[0].ticketFactura == undefined || documentList[0].ticketFactura != true) {

        if (documentList == undefined) {
          observer.next(false);
        }

        const documentListJson: any =
          FormatHelper.formatDocumentListToServiceExpectedObject(documentList, this._appDataConfig.userConfiguration.PosId);
        documentListJson.posId = this._appDataConfig.userConfiguration.PosId;

        const request = { identity: this._appDataConfig.userConfiguration.Identity, createDAOList: documentListJson };
        this.confirmPayActionsDocuments(documentList)
          .first().subscribe(allOk => {
            if (!allOk) {
              LogHelper.logError(undefined, 'Error confirmando actiones de pago (antes de createDocument)');
              observer.next(false);
            } else {
              this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/CreateDocuments`, request).subscribe(
                response => {
                  // TODO: ¿Creamos un modelo de respuesta con los códigos específicos para cada una de las llamadas al demonio?
                  if (response.status == 1) {
                    // transacciones huerfanas, informamos que se ha subido correctamente
                    this.confirmTransactionsDocuments(documentList)
                      .first().subscribe(responseConfirmTransactions => {
                        if (responseConfirmTransactions) {

                          // Volver a llamar a HubblePOS para actualizar tabla annulled_ticket_cofo
                          const request2 = {
                            identity: this._appDataConfig.userConfiguration.Identity,
                            nticketO: nTicketO,
                            nticketA: documentList[0].documentId,
                            referencias: documentList[0].lines.map(function (v) { return v.productId; })
                          };
                          this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/UpdateAnnulledDocuments`, request2).subscribe(
                            response2 => {
                              if (response.status == 1) {
                                // todo correcto
                                observer.next(true);
                              }
                            });
                        } else {
                          LogHelper.logError(undefined, `Error confirmando transacciones`);
                          observer.next(false);
                        }
                      });
                  } else {
                    LogHelper.logError(undefined, `Error al ejecutar CreateDocuments. Respuesta recibida: ${response.message}`);
                    observer.next(false);
                  }
                },
                error => {
                  console.log(error);
                  observer.next(false);
                });
            }
          });

      }
      else {
        return observer.next(true);
      }

    });
  }

  private confirmTransactionsDocuments(documents: Array<Document>): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      const doc = documents[0];
      this._documentConfirmActions.onSendComplete(doc)
        .first().subscribe(response => {
          observer.next(response);
        });
    });
  }
  private confirmPayActionsDocuments(documents: Array<Document>, index: number = 0): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (index >= documents.length) {
        observer.next(true);
      } else {
        const document = documents[index];
        this.confirmPayActionsDocument(document)
          .first()
          .subscribe(response => {
            if (!response) {
              observer.next(false);
            } else {
              if (index + 1 < documents.length) {
                this.confirmPayActionsDocuments(documents, index + 1)
                  .first().subscribe(nextDocument => {
                    observer.next(nextDocument);
                  });
              } else {
                observer.next(true);
              }
            }
          });
      }
    });
  }

  private confirmPayActionsDocument(document: Document): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      const businessSpecificLines = document.lines.filter(line => line.businessSpecificLineInfo != undefined);
      if (businessSpecificLines == undefined || businessSpecificLines.length == 0) {
        observer.next(true);
      } else {
        const confirmData: ConfirmPaymentRequest = {
          seriesType: document.series.type,
          documentNumber: document.documentNumber, // se ha debido de establecer en el completeDocument
          documentId: document.documentId, // se ha debido de establecer en el completeDocument
          vehicleLicensePlate: document.plate
        };

        if (document.ticketFactura != undefined) {
          confirmData.ticketFactura = document.ticketFactura;
        }

        this.confirmPayActionsRecursive(businessSpecificLines, confirmData)
          .first().subscribe(response => {
            observer.next(response);
          });
      }
    });
  }
  private confirmPayActionsRecursive(
    businessSpecificLines: Array<DocumentLine>, confirmData: ConfirmPaymentRequest, index: number = 0): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (index >= businessSpecificLines.length) {
        observer.next(true);
      } else {

        if (businessSpecificLines[index].businessSpecificLineInfo.type != undefined) {
          const bsl = businessSpecificLines[index].businessSpecificLineInfo;
          bsl.onConfirmPay(confirmData).first().subscribe(response => {
            if (!response) {
              observer.next(false);
            } else {
              if (index + 1 < businessSpecificLines.length) {
                this.confirmPayActionsRecursive(businessSpecificLines, confirmData, index + 1)
                  .first().subscribe(nextResponse => {
                    observer.next(nextResponse);
                  });
              } else {
                observer.next(true);
              }

            }
          });
        } else {
          observer.next(true);
        }
      }
    });
  }
  /// Clona el documento y establece las propiedades de un documento rectificador
  private generateRectifyingDocument(document: Document): Document {
    const rectifierDocument = this._docInternalService.cloneDocument(document);
    rectifierDocument.referencedDocumentIdList = [document.documentId];
    rectifierDocument.documentId = '';
    rectifierDocument.series = this._seriesService.getSeriesByFlow(
      document.series.type == SeriesType.ticket ?
        FinalizingDocumentFlowType.EmittingDevolutionForTicket : FinalizingDocumentFlowType.EmittingDevolutionForBill,
      rectifierDocument.totalAmountWithTax);
    rectifierDocument.referencedDocumentNumberList = [document.documentNumber];
    rectifierDocument.totalAmountWithTax = -document.totalAmountWithTax;
    rectifierDocument.totalTaxableAmount = -document.totalTaxableAmount;
    rectifierDocument.totalTaxAmount = -document.totalTaxAmount;
    if (rectifierDocument.lines != undefined) {
      rectifierDocument.lines.forEach(linea => {
        linea.quantity = -linea.quantity;
        linea.totalAmountWithTax = -linea.totalAmountWithTax;
        linea.discountAmountWithTax = -linea.discountAmountWithTax;
        linea.taxAmount = -linea.taxAmount;
      });
    }
    if (rectifierDocument.paymentDetails != undefined) {
      rectifierDocument.paymentDetails.forEach(pd => {
        pd.primaryCurrencyGivenAmount = -pd.primaryCurrencyGivenAmount;
        pd.primaryCurrencyTakenAmount = -pd.primaryCurrencyTakenAmount;
        pd.secondaryCurrencyGivenAmount = -pd.secondaryCurrencyGivenAmount;
        pd.secondaryCurrencyTakenAmount = -pd.secondaryCurrencyTakenAmount;
      });
    }
    return rectifierDocument;
  }

  // set additional data (discounts, tax amounts, etc.)
  private _setAdditionalData(documentList: Array<Document>) {
    if (documentList) {
      documentList.forEach((document, index) => {
        if (document) {
          // provisionalId
          if (document.provisionalId == undefined || document.provisionalId == 0) {
            document.provisionalId = index + 1;
          }
          // Se sobreescribe la fecha local. Es más reciente que la fecha en el momento de la apertura del panel de pago
          document.emissionLocalDateTime = new Date();
          // cálculos datos de lineas del documento y del documento en general
          document.lines.forEach(line => {
            if (line) {
              this._calculateLineDiscountData(line);
              this._calculateLineTaxAmountData(line);
            }
          });
          // cálculos generales del documento
          this._calculateDocumentTaxList(document);
          this._calculateTaxableAmount(document);
          this._recalculateDocumentGlobalDiscount(document);
          // TODO appliedPromotionList lista de promociones
        }
      });
    }
  }

  // descuentos de linea
  private _calculateLineDiscountData(line: DocumentLine) {
    if (line.discountPercentage > 0) {
      line.discountAmountWithTax =
        (line.priceWithTax - this._roundPipe.transformInBaseCurrency(line.priceWithTax * (100 - line.discountPercentage) / 100)) * line.quantity;
      line.discountAmountWithoutTax =
        (line.priceWithoutTax -
          this._roundPipe.transformInBaseCurrency(line.priceWithoutTax * (100 - line.discountPercentage) / 100)) * line.quantity;
    }
  }

  // cantidad monetaria de impuestos (si hay descuento se aplica)
  private _calculateLineTaxAmountData(line: DocumentLine) {
    // Se comenta el IF para que no recalcule el IVA con las promopciones...
    // ... Ya que todas las promociones están en una sola línea y no sería unh cálculo real

    /* let totalAmountWithTax = line.totalAmountWithTax;
    if (line.appliedPromotionList != undefined && line.appliedPromotionList.length > 0) {
      line.appliedPromotionList.forEach(promotion => {
        totalAmountWithTax = totalAmountWithTax - promotion.discountAmountWithTax;
      });
    } */

    line.taxAmount = this._roundPipe.transform((
      (line.totalAmountWithTax - line.discountAmountWithTax) / (1 + line.taxPercentage / 100) * (line.taxPercentage / 100)),
      this._appDataConfig.decimalPrecisionConfiguration.decimalPositionsForUnitPricesWithoutTax);
  }


  private _calculateTaxableAmount(document: Document): void {
    document.taxableAmount = 0;
    if (!document.lines) {
      return;
    }
    document.lines.forEach(line => {
      let taxableAmount = 0;
      // solo si hay impuesto
      if (line && line.taxPercentage != 0 && line.taxPercentage != undefined) {
        taxableAmount = line.priceWithoutTax * line.quantity;
        // si hay descuento linea se aplica
        if (line.discountPercentage != 0 && line.discountPercentage != undefined) {
          taxableAmount -= line.discountAmountWithoutTax;
        }
        document.taxableAmount += this._roundPipe.transformInBaseCurrency(taxableAmount);
      }
    });
  }

  // calcula una lista con datos: % impuesto + valor monetario a sumar al importe del producto por el impuesto
  // si hay descuento linea, se aplica
  private _calculateDocumentTaxList(document: Document): void {
    document.totalTaxList = {};
    // Si el numero de lineas eliminadas es igual al numero de linas del ticket no se agrega los medios de pago.
    if (document.lines.filter(x => x.isRemoved == false).length != document.lines.length) {
      // Se introduce filtro para que solo se tenga en cuenta el iva de las lineas no eliminadas
      document.lines.filter(x => x.isRemoved != false).forEach((line, index) => {
        if (line && line.isConsigna == false) {
          let tax: number = document.totalTaxList[line.taxPercentage];
          if (tax == undefined) {
            tax = line.taxAmount;
          } else {
            tax += line.taxAmount;
          }
          document.totalTaxList[line.taxPercentage.toString()] = tax;
        }
      });
      for (const key in document.totalTaxList) {
        if (document.totalTaxList.hasOwnProperty(key)) {
          document.totalTaxList[key] = this._roundPipe.transformInBaseCurrency(document.totalTaxList[key]);
        }
      }
    }
  }

  private _recalculateDocumentGlobalDiscount(document: Document): void {
    // TODO Aplicar descuento global a cada elemento monetario (?)
    // Por ello se debería recalcular cada ammount, impuesto, etc.
    // según su proporción en el documento porque es descuento
    // GLOBAL no de linea
  }

  private _getCurrentOperatorId(): string {
    return this._operatorSvc.currentOperator.id;
  }

  private _insertSupplyTransaction(document: Document) {
    const _businessSpecLines = document.lines.filter(x => x.businessSpecificLineInfo != undefined);
    const suppliesList: Array<SuplyTransaction> = [];

    if (_businessSpecLines.length > 0) {
      for (const lineS of _businessSpecLines) {
        if (lineS.businessSpecificLineInfo.supplyTransaction != undefined) {
          suppliesList.push(lineS.businessSpecificLineInfo.supplyTransaction);
        }
      }
    }

    if (suppliesList.length > 0) {
      const request = {
        identity: this._appDataConfig.userConfiguration.Identity,
        supplyTransactionList: suppliesList
      };

      this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/InsertSupplyTransactionAnnulated`, request).subscribe(
        response => {
          // TODO: ¿Creamos un modelo de respuesta con los códigos específicos para cada una de las llamadas al demonio?
          if (response.status == 1) {
            this.notifySaleCancelSuppliesAnulated();
          } else {
            LogHelper.logError(undefined, `Error al ejecutar InsertSupplyTransactionAnnulated. Respuesta recibida: ${response.message}`);
          }
        },
        error => {
          console.log(error);
        });
    }
  }


  private DeleteSuppliesAnulated(listaSumiAnul: SuplyTransaction[]) {
    const request = {
      identity: this._appDataConfig.userConfiguration.Identity,
      supplyTransactionList: listaSumiAnul
    };

    this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/DeleteSuppliesAnulated`, request).subscribe(
      response => {

        // Cargamos los suministros anulados.
        this._fuellingPointsSvc.GetAllSuppliesAnulatedByShop()
          .first().subscribe(res => {
            Globals.Delete();
            if (res != undefined && res.length > 0) {
              res.forEach(x => {
                const point = Globals.Get().find(s => s.id === x.fuellingPointId);

                if (point !== undefined && point !== null) {
                  Globals.Put(x.fuellingPointId, true);
                } else {
                  Globals.Set(x.fuellingPointId, true);
                }
              });
            }
          });

        if (response.status == 1) {
        } else {
          LogHelper.logError(undefined, `Error al ejecutar DeleteSuppliesAnulated. Respuesta recibida: ${response.message}`);
        }
      },
      error => {
        console.log(error);
      });
  }

  UpdateTelCustomerCOFO(documento: Document) {
    const request = {
      identity: this._appDataConfig.userConfiguration.Identity,
      idCustomer: documento.customer.id,
      telephone: documento.customer.phoneNumber
    };

    this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/UpdateTelCustomerCOFO`, request).subscribe(
      response => {
        if (response.status == 1) {
        } else {
          LogHelper.logError(undefined, `Error al ejecutar UpdateTelCustomerCOFO. Respuesta recibida: ${response.message}`);
        }
      },
      error => {
        console.log(error);
      });
  }

  VincularMatriculaClienteCOFO(idCliente: string, matricula: string): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      const request = {
        identity: this._appDataConfig.userConfiguration.Identity,
        idCliente: idCliente,
        matricula: matricula
      };

      this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/VincularMatriculaClienteCOFO`, request).subscribe(
        response => {
          if (response.status == 1) {
            observer.next(true);
          }
          else if (response.status == -2) {
            // Matricula que ya existe (ValidationError).
            observer.next(false);
          }
          else {
            LogHelper.logError(undefined, `Error al ejecutar VincularMatriculaClienteCOFO. Respuesta recibida: ${response.message}`);
            observer.next(false);
          }
        },
        error => {
          console.log(error);
          observer.next(false);
        });
    });
  }

  ComprobarVentaMatriculaCOFO(): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      const request = {
        identity: this._appDataConfig.userConfiguration.Identity,
        idTienda: this._appDataConfig.shop.id
      };

      this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/ComprobarVentaMatriculaCOFO`, request).subscribe(
        response => {
          if (response.status == 1) {
            observer.next(true);
          } else {
            LogHelper.logError(undefined, `Error al ejecutar ComprobarVentaMatriculaCOFO. Respuesta recibida: ${response.message}`);
            observer.next(false);
          }
        },
        error => {
          console.log(error);
          observer.next(false);
        });
    });
  }

  btnOpenCashDrawer() {
    this._OPOS_OpenCashDrawer()
      .first().subscribe(response => {
        /*if (response) {
          this._statusBarService.publishMessage('Cajon Abierto');
        } else {
          this._statusBarService.publishMessage('No se ha podido establecer la comunicación con el CAJON');
        }*/
      });
  }

  private _OPOS_OpenCashDrawer(): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      Promise.resolve(this._signalROPOSService.OPOSOpenCashDrawer().then(responseOPOS => {
        if (responseOPOS.status === OPOSOpenCashDrawerResponseStatuses.successful) {
          observer.next(true);
        } else if (responseOPOS.status === OPOSOpenCashDrawerResponseStatuses.genericError) {
          observer.next(false);
        }
      }));
    });
  }


  sendPrintDirectHub(stringifiedDocumentData: string, useCase: string, numberOfCopies?: number): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      this._statusBarService.publishProgress(75);
      this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_Printing'));
      this._PrintingService.printDirectHub(
        stringifiedDocumentData,
        useCase,
        numberOfCopies,
        []).first().subscribe(respuesta => {
          if (respuesta.status === PrintResponseStatuses.successful) {
            this._statusBarService.publishProgress(100);
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PritingFinished'));
            observer.next(true);
          } else {
            LogHelper.logError(undefined, respuesta.message);
            this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_PrintingError'));
            observer.next(false);
          }
        });
    });
  }

  sendInvoiceInformes(documentListRecaudacion: InformeVentasRecaudacion[], documentListVentas: InformeVentasResumen[],
    listaAPintarCategorias: InformeVentasCategorias[], templateTicketInforme: string): Observable<boolean> {
    try {
      return Observable.create((observer: Subscriber<boolean>) => {
        this._statusBarService.publishProgress(75);
        this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_Printing'));
        const currentDateTime: Date = new Date();
        this._PrintingService.printDirectHub(
          JSON.stringify({
            Document: FormatHelper.formatInformeVentasToPrintingModuleHubExpectedObject(
              documentListRecaudacion,
              documentListVentas,
              listaAPintarCategorias,
              this._appDataConfig.company,
              this._appDataConfig.shop,
              currentDateTime,
              this._appDataConfig.userConfiguration.PosId,
              templateTicketInforme)
          }),
          'RESUMENVENTAS',
          1,
          []).first().subscribe(respuesta => {
            if (respuesta.status === PrintResponseStatuses.successful) {
              this._statusBarService.publishProgress(100);
              this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'message_StatusBar_PritingFinished'));
              observer.next(true);
            } else {
              LogHelper.logError(undefined, respuesta.message);
              this._statusBarService.publishMessage(this._languageService.getLiteral('document_service', 'error_StatusBar_PrintingError'));
              observer.next(false);
            }
          });
      });
    } catch (error) {
      this._statusBarService.publishMessage(error.message);
      return Observable.create((observer: Subscriber<boolean>) => { observer.next(false); });
    }
    // // imprimo el documento
    // // return Observable.create((observer: Subscriber<boolean>) => {
    //   return this._signalRPrintingServ.printDocumentInformeVentas(
    //     documentListRecaudacion, documentListVentas, listaAPintarCategorias,
    //     templateTicketInforme, 0); // numero de copias si hay importe pendiente
    //     // .first().subscribe(respuesta => {
    //     //   if (respuesta) {
    //     //     observer.next(true);
    //     //   }
    //     //   else {
    //     //     observer.next(false);
    //     //   }
    //     // });
    // // });
    // // if (this._appDataConfig.printerPosCommands != undefined) {
    // //   return this._sendDocuments(documentList, 'INVOICE_COFO', [this._appDataConfig.printerPosCommands.openDrawer]);
    // // } else {
    // //   return this._sendDocuments(documentList, 'INVOICE_COFO');
    // // }
  }

  notifySaleCancelSuppliesAnulated() {
    this._multiTpvSvc.requestNotifyGenericChangesRed('SuppliesAnulated');
  }

  private hayPagoEfectivo(documentList: Array<Document>) {
    let devolver: Boolean = false;
    documentList.forEach(document => {
      document.paymentDetails.forEach(paymentDetail => {
        devolver = this.EsPagoEfectivo(paymentDetail);
      });
    });
    return devolver;
  }

  private EsPagoEfectivo(paymentDetail: PaymentDetail): Boolean {
    let devolver: Boolean = false;
    if (parseInt(paymentDetail.paymentMethodId.substr(paymentDetail.paymentMethodId.length - 2), 10) == PaymentMethodType.cash) {
      devolver = true;
    }
    return devolver;
  }
}
