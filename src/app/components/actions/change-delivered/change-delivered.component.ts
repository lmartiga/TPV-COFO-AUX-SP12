import { CustomerInternalService } from './../../../services/customer/customer-internal.service';
import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Currency } from 'app/shared/currency/currency';
import { AppDataConfiguration } from 'app/config/app-data.config';
import { isNumber } from 'util';
import { changedPayment } from 'app/shared/payments/changed-payment';
import { ChangePaymentInternalService } from 'app/services/payments/change-payment-internal.service';
import { FuellingPointFormatConfiguration } from 'app/shared/fuelling-point/fuelling-point-format-configuration';
import { FuellingPointsInternalService } from 'app/services/fuelling-points/fuelling-points-internal.service';
import { ConfirmActionService } from 'app/services/confirm-action/confirm-action.service';
import { ConfirmActionType } from 'app/shared/confirmAction/confirm-action-type.enum';
import { buttonStatus } from 'app/shared/button-status.enum';
import { Subscription } from 'rxjs/Subscription';
import { Document } from 'app/shared/document/document';
import { PaymentDetail } from 'app/shared/payments/payment-detail';
import { Subject } from 'rxjs/Subject';
// import { RoundPipe } from 'app/pipes/round.pipe';
import { Observable } from 'rxjs/Observable';
import { endSaleType } from 'app/shared/endSaleType';
import { DocumentService } from 'app/services/document/document.service';
import { StatusBarService } from 'app/services/status-bar/status-bar.service';
// import { CashPaymentService } from 'app/services/payments/cash-payment.service';
// import { FuellingPointsService } from 'app/services/fuelling-points/fuelling-points.service';
import { DocumentLine } from 'app/shared/document/document-line';
import { CashPaymentService } from 'app/services/payments/cash-payment.service';
import { DocumentSeriesService } from 'app/services/document/document-series.service';
import { FinalizingDocumentFlowType } from 'app/shared/document/finalizing-document-flow-type.enum';
import { MixtPaymentService } from 'app/services/payments/mixt-payment.service';
import { DocumentInternalService } from 'app/services/document/document-internal.service';
import { SignalRTMEService } from 'app/services/signalr/signalr-tme.service';
import { LanguageService } from 'app/services/language/language.service';
import { GenericHelper } from 'app/helpers/generic-helper';
import { ConnectionStatus } from 'app/shared/connection-status.enum';
import { TpvStatusCheckerService } from 'app/services/tpv-status-checker.service';
import { TMEApplicationInitResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/tme-application-init-response-statuses.enum';
@Component({
  selector: 'tpv-change-delivered',
  templateUrl: './change-delivered.component.html',
  styleUrls: ['./change-delivered.component.scss']
})

export class ChangeDeliveredComponent implements OnInit, OnDestroy {
  @Input() changeData: changedPayment;
  @Input() currentDocument: Document;
  showVentananormal: boolean = true;
  isFirstSelection: boolean = true;
  numKeys: Array<{ number: string, class: string }>;
  value: string;
  baseCurrency: Currency;
  // configuracion de formatos
  formatConfig: FuellingPointFormatConfiguration;
  totalChangedDelivered: number = 0;
  secondConfig: number = 8;
  // CONTADOR DE REINTENTOS
  reIntentos: number = 0;
  maxReintentosImpresion: number = 1;
  maxReintentosTME: number = 2;
  message = this.getLiteral('status_bar_component', 'message_StatusBar_SyncOK');
  tmeConnectionStatus: ConnectionStatus = ConnectionStatus.unknown;
  tmeConnectionMessage = {
    ok: this.getLiteral('status_bar_component', 'tmeConnectionMessage_ok'),
    error: this.getLiteral('status_bar_component', 'tmeConnectionMessage_error'),
    unknown: this.getLiteral('status_bar_component', 'tmeConnectionMessage_unknown'),
  };
  messajeErrorDeuda: string = this.getLiteral('change_delivered_component', 'literal_messageErrorDeuda');
  messajeErrorDeudaArticulo: string = this.getLiteral('change_delivered_component', 'literal_messageErrorDeudaArticulo');
  messajeErrorMultiplePrepago: string = this.getLiteral('change_delivered_component', 'literal_messageErrorMultiplePrepago');
  setTime: NodeJS.Timer = undefined;
  setInt: NodeJS.Timer = undefined;
  messageAccion: string = this.getLiteral('change_delivered_component', 'literal_messageAccion_Pause');
  isStop: boolean = false;
  timeOutSendPayment: number = 0;
  private _subscriptions: Subscription[] = [];
  pendiente: number = 0;
  MsgValidateDebtTex: string = '';
  listOfPayments: Array<PaymentDetail> = [];
  MsgValidateDebt: boolean = false;
  changeDelivered: number = 0;
  private _onChangeDelivered: Subject<boolean> = new Subject();
  private messajeconfirmAction = this.getLiteral('change_delivered_component', 'literal_messageconfirmAction');
  private messajeconfirmActionDeuda = this.getLiteral('change_delivered_component', 'literal_messageconfirmActionDeuda');
  cash: endSaleType;
  showButtonStopPayment: boolean = true;
  tpvNetWorkConnectionStatus: ConnectionStatus = ConnectionStatus.connected;
  isTicketSelected: boolean = false;
  private ventaFidelizada: boolean;
  /**
   * Indica que se ha lanzado la peticion de sendSale, evita la repeticion de llamadas
   */
  _requestingSendSale: boolean = false;
  mainTextComponentLiteral: string;

  constructor(private _appDataConfig: AppDataConfiguration,
    private _changeDelivered: ChangePaymentInternalService,
    private _fpInternalSvc: FuellingPointsInternalService,
    private _confirmActionSvc: ConfirmActionService,
    private _statusBarService: StatusBarService,
    // private _roundPipe: RoundPipe,
    private _documentService: DocumentService,
    // private _cashPaymentService: CashPaymentService,
    // private _fuellingPointsSvc: FuellingPointsService,
    private _cashPaymentService: CashPaymentService,
    private _serieService: DocumentSeriesService,
    private _mixtPaymentService: MixtPaymentService,
    private _documentInternalService: DocumentInternalService,
    private _signalRTMEService: SignalRTMEService,
    private _customerInternalService: CustomerInternalService,
    private _languageService: LanguageService,
    private _tpvStatusCheckerService: TpvStatusCheckerService,
  ) { }

  ngOnInit() {
    this._requestingSendSale = false;
    const maxReintentosImpresionConf = this._appDataConfig.getConfigurationParameterByName('MAX_REINTENTOS_IMPRESION', 'GENERAL');
    if (maxReintentosImpresionConf != undefined) {
      this.maxReintentosImpresion = parseInt(maxReintentosImpresionConf.meaningfulStringValue, 0);
    }
    const maxReintentosTMEConf = this._appDataConfig.getConfigurationParameterByName('MAX_REINTENTOS_CONEXION_TME', 'GENERAL');
    if (maxReintentosTMEConf != undefined) {
      this.maxReintentosTME = parseInt(maxReintentosTMEConf.meaningfulStringValue, 0);
    }
    this.cash = endSaleType.cash;
    this.value = '';
    this.numKeys = [
      { number: '1', class: 'borderRightBottom' }, { number: '2', class: 'borderRightBottom' }, { number: '3', class: 'borderBottom' },
      { number: '4', class: 'borderRightBottom' }, { number: '5', class: 'borderRightBottom' }, { number: '6', class: 'borderBottom' },
      { number: '7', class: 'borderRightBottom' }, { number: '8', class: 'borderRightBottom' }, { number: '9', class: 'borderBottom' },
      { number: '', class: 'borderRight' }, { number: '0', class: 'borderRight' }, { number: '.', class: 'noBorderButton' },
    ];


    this.formatConfig = this._fpInternalSvc.formatConfiguration;
    this.baseCurrency = this._appDataConfig.baseCurrency;
    this.formatConfig = this._fpInternalSvc.formatConfiguration;
    this._subscriptions.push(this._changeDelivered.return$.subscribe(d => {
      this.changeData.typeCall = 0;
      this.changeData.isTicket = false;
      this.changeData.isCharged = false;
      this.changeData.isButtonHidden = true;
      this.changeData.isEnabledButtom = true;
      this._changeDelivered.fnChangedPayment(this.changeData);
    }));

    this._subscriptions.push(this._changeDelivered.document$.subscribe(d => {
      this.currentDocument = d;
    }));
    this._subscriptions.push(this._documentService.currentDocument$
      .subscribe((response: Document) => {
        if (response != undefined) {
          this.currentDocument = response;
        }
      }));
    this._subscriptions.push(this._changeDelivered.changedPayment$.subscribe(p => {
      this.isFirstSelection = true;
      if (p.changePend === undefined || isNaN(p.changePend)) {
        p.changePend = 0.00;
        if (this.currentDocument !== undefined) {
          p.changePend = this.currentDocument.totalAmountWithTax;
        }
      }
      this.changeData = p;
      this.totalChangedDelivered = p.changePend - p.total < 0 ? 0 : p.changePend - p.total;

      // Comprobar si tiene descuento solred para que aparezca en la pantalla del "Cambio pendiente" en la derecha
      this.totalChangedDelivered +=
        (this.currentDocument !== undefined && this.currentDocument.paymentDetails !== undefined ?
          (this.currentDocument.paymentDetails.find(pay => pay.paymentMethodId.substring(5) === '11') !== undefined
            && this.currentDocument.paymentDetails.find(pay => pay.paymentMethodId.substring(5) === '01') !== undefined) ?
            this.currentDocument.paymentDetails.find(pay => pay.paymentMethodId.substring(5) === '11').primaryCurrencyTakenAmount : 0 : 0);


      // Validacion TME, tener en cuenta que si se quiere validar por el Tipo de Pago
      // no dejar que este sea undefined para otros tipos de pagos sobre todo para el mixto
      // Esta forma de validar por el Extra Data se puede mejorar, ya que solo estara lleno por esta pantalla y flujo cuando es TME
      if (this.currentDocument) {
        if (this.currentDocument.extraData === undefined) {
          this.changeData.totalChange = this.totalChangedDelivered;
        }
      } else {
        this.changeData.totalChange = this.totalChangedDelivered;
      }

      this.value = p.changePend === 0 ? '' : p.changePend.toString();
      $(document).ready(function () {
        jQuery('#importevalue').select();
      });

      this.isStop = p.isStop;
      this.secondConfig = (this.timeOutSendPayment - p.counterSecond) / 1000;
      if (this.changeData.typeCall !== 2) {
        /*
        this._requesting = true;
        this.changeData.isButtonTicket = this._requesting;
        */
        this.fnStopPayment(false);
        this.isStop = false;
        this.changeData.isStop = this.isStop;
      }/* else if (this.changeData.typeCall == 2) {
        this._changeDelivered.fnDisabledCliente(true);
      }*/
      this.setDisplayShowButtonStopPayment();
    }));

    this._subscriptions.push(this._changeDelivered.EnabledButton$.subscribe(value => {
      if (value && this.ventaFidelizada !== undefined && !this.ventaFidelizada) {
        this._statusBarService.resetProgress();
        this._changeDelivered.fnPaymentFinalized(true);
        this.ventaFidelizada = undefined;
      }
      else if (value) {
        this.changeData.isEnabledButtom = !value;
        this.changeData.isButtonTicket = this.changeData.isEnabledButtom;
        this.changeData.isButtonFactura = this.changeData.isEnabledButtom;
        const strTimeSendPayment = this._appDataConfig.getConfigurationParameterByName('SECOND_WAITING_SEND_PAYMENT', 'GENERAL');
        this.timeOutSendPayment = parseInt(strTimeSendPayment.meaningfulStringValue + '000', 0);
        if (!this.isStop) {
          this.messageAccion = this.getLiteral('change_delivered_component', 'literal_messageAccion_Stop');
          let miliSecondContinue: number = 0;
          // tslint:disable-next-line:max-line-length
          miliSecondContinue = (this.changeData.counterSecond > 0 ? this.timeOutSendPayment - this.changeData.counterSecond : this.changeData.counterSecond);
          this.fnProgressPayment(this.timeOutSendPayment, miliSecondContinue, 1000);
        }
        else {
          this.messageAccion = this.getLiteral('change_delivered_component', 'literal_messageAccion_Resume');
          if (this.changeData.counterSecond > 0) {
            this.progressBar((this.changeData.counterSecond * 100) / this.timeOutSendPayment);
          }
        }
      } else if (value == false) {
        const currentChanged: changedPayment = {
          counterSecond: 0, customerId: '', isButtonFactura: false, typeCall: 0,
          isTicket: false, isCharged: false, ticket: '', total: 0, totalChange: 0,
          changePend: 0, selectedIndex: 0, paymentType: 0, isStop: false, isButtonHidden: true,
          isEnabledButtom: true, isButtonTicket: false
        };
        if (this.setTime) {
          clearTimeout(this.setTime);
        }
        if (this.setInt) {
          clearInterval(this.setInt);
        }
        this._documentInternalService.currentDocument.BarcodeStatus = false;
        this._changeDelivered.fnChangedPayment(currentChanged);
        this._changeDelivered.fnChangedPaymentFail(currentChanged);
        this.syncTMEDatosTwoIntend();
      }
    }));

    this._subscriptions.push(this._tpvStatusCheckerService.networkConnectionStatusChanged()
      .subscribe(
        tpvNetWorkConnectionStatus => {
          this.tpvNetWorkConnectionStatus = tpvNetWorkConnectionStatus;
        }));

    this._subscriptions.push(this._changeDelivered.ticketSelected$.subscribe(response => {
      this.isTicketSelected = true;
    }));
  }
  // sincronizar datos tme e intento de conexion
  async syncTMEDatosTwoIntend() {
    for (let i = 0; i < this.maxReintentosTME; i++) {
      this.message = this.getLiteral('status_bar_component', 'syncTMEDatos_message');
      Promise.resolve(this._signalRTMEService.startInitializationProcess()).then(response => {
        if (response.status === TMEApplicationInitResponseStatuses.successful) {
          this.message = this.tmeConnectionMessage.ok;
          this.tmeConnectionStatus = ConnectionStatus.connected;
          this._signalRTMEService.setStatusConnection(true);
        } else if (response.status === TMEApplicationInitResponseStatuses.genericError) {
          this.message = this.tmeConnectionMessage.error;
          this.tmeConnectionStatus = ConnectionStatus.disconnected;
          this._signalRTMEService.setStatusConnection(false);
        }
      });
    }
  }
  ngOnDestroy() {
    this._subscriptions.forEach(p => p.unsubscribe());
  }

  onFinish(): Observable<boolean> {
    this.currentDocument.cambio = 0.00;
    return this._onChangeDelivered.asObservable();
  }

  forceFinish(): void {
    this._onChangeDelivered.next(undefined);
  }
  addValue(value: string, clear: boolean, valor?: any) {
    if (this.isFirstSelection == true) {
      this.value = '';
      this.isFirstSelection = false;
    }
    if ((this.value.length == 0 && value == '.') || (value == '.' && this.value.toString().indexOf('.') > 0)) {
      return;
    }
    this._changeDelivered.fnButtonDisable(buttonStatus.ENABLED);

    if (!this.value) {
      this.value = '';
    }
    if (clear) {
      this.value = value;
    } else {
      const currentValor = this.value;
      const position = this.value.length;
      if (position && position !== 0) {
        // construyo el valor a escribir en el input
        const first = currentValor.slice(0, position);
        const second = currentValor.slice(position);
        this.value = first + value + second;

      } else if (!position) {
        this.value = value + currentValor;
      }
    }
    /*if (valor !== undefined) {
      const end = valor.valueAccessor._elementRef.nativeElement.selectionEnd;
      if (0 != end) {
        const getValue: string = this.value.toString();
        const first = getValue.slice(0, 0);
        const second = getValue.slice(end, this.value.length);
        this.value = first + second;
      }
    }*/

    if (this.changeData.total > parseFloat(this.value)) {
      this.totalChangedDelivered = 0;
      this.changeData.changePend = 0;
      this.changeData.totalChange = 0;
      this.pendiente = this.changeData.total - parseFloat(this.value.replace(',', '.'));
    } else {
      this.totalChangedDelivered = parseFloat(this.value) - this.changeData.total;
      this.changeData.changePend = parseFloat(this.value);
      this.changeData.totalChange = this.totalChangedDelivered;
      this.pendiente = 0;
    }
  }
  delete() {
    const currentValor = this.value;
    if (this.value != '') {
      this.value = currentValor.slice(0, -1);
    }

    if (this.changeData.total > parseFloat(this.value) || this.value == '') {
      this.totalChangedDelivered = 0;
      this.changeData.changePend = 0;
      this.changeData.totalChange = 0;
      this.pendiente = this.changeData.total - parseFloat(this.value.replace(',', '.'));
    } else {
      this.totalChangedDelivered = parseFloat(this.value) - this.changeData.total;
      this.changeData.changePend = parseFloat(this.value);
      this.changeData.totalChange = this.totalChangedDelivered;
    }

    if (this.value == '') {
      this.pendiente = 0;
      this._changeDelivered.fnButtonDisable(buttonStatus.DISABLED);
    }
  }
  intro() {
    if (this._requestingSendSale) {
      return;
    }
    this._requestingSendSale = true;
    if (!this._signalRTMEService.getStatusConnection()) {
      this.mainTextComponentLiteral = this.getLiteral('status_bar_component', 'syncTMEDatos_message');
      Promise.resolve(this._signalRTMEService.startInitializationProcess()).then(response => {
        if (response.status === TMEApplicationInitResponseStatuses.successful) {
          this._signalRTMEService.setStatusConnection(true);
          this.mainTextComponentLiteral = this.getLiteral('status_bar_component', 'tmeConnectionMessage_ok');
          this.mainTextComponentLiteral += '\n' + this.getLiteral('credit_card_payment_component', 'literal_CreditCardPayment_FinishUsingTerminal');
        } else if (response.status === TMEApplicationInitResponseStatuses.genericError) {
          this._signalRTMEService.setStatusConnection(false);
        }
        this.isTicketSelected = false;
        if (this.changeData.total > parseFloat(this.value)
          && this._documentInternalService.currentDocument.customer.id == this._appDataConfig.unknownCustomerId) {
          this._confirmActionSvc.promptActionConfirm(
            this.messajeErrorDeuda,
            this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Accept'), undefined,
            this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_MessageInfo'),
            ConfirmActionType.Error);
        } else {
          if (this.changeData.total > +this.value && this.ComprobarLimpiarLineasArt(this._documentInternalService.currentDocument)) {
            this._confirmActionSvc.promptActionConfirm(
              this.messajeErrorDeudaArticulo,
              this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Accept'), undefined,
              this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_MessageInfo'),
              ConfirmActionType.Error);
          } else {
            this.pendiente = (this.changeData.total - +this.value) < 0 ? 0 : (this.changeData.total - +this.value);
            if (this.changeData.total > +this.value) {
              this._confirmActionSvc.promptActionConfirmTelefonoDeuda(
                this.messajeconfirmActionDeuda,
                this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Yes'),
                this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Not'),
                this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Message'),
                ConfirmActionType.Question,
                this.currentDocument)
                .subscribe(response => {
                  if (response === undefined) { }
                  else if (response) {
                    this.continuarPagoCOFO();
                  } else { }
                });
            } else {
              this.continuarPagoCOFO();
            }
          }
        }
         // Al finalizar el promise del TME
         this._requestingSendSale = false;
      });
    } else {
      this.isTicketSelected = false;
      if (this.changeData.total > parseFloat(this.value)
        && this._documentInternalService.currentDocument.customer.id == this._appDataConfig.unknownCustomerId) {
        this._confirmActionSvc.promptActionConfirm(
          this.messajeErrorDeuda,
          this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Accept'), undefined,
          this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_MessageInfo'),
          ConfirmActionType.Error);
      } else {
        if (this.changeData.total > +this.value && this.ComprobarLimpiarLineasArt(this._documentInternalService.currentDocument)) {
          this._confirmActionSvc.promptActionConfirm(
            this.messajeErrorDeudaArticulo,
            this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Accept'), undefined,
            this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_MessageInfo'),
            ConfirmActionType.Error);
        } else {
          this.pendiente = (this.changeData.total - +this.value) < 0 ? 0 : (this.changeData.total - +this.value);
          if (this.changeData.total > +this.value) {
            this._confirmActionSvc.promptActionConfirmTelefonoDeuda(
              this.messajeconfirmActionDeuda,
              this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Yes'),
              this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Not'),
              this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Message'),
              ConfirmActionType.Question,
              this.currentDocument)
              .subscribe(response => {
                if (response === undefined) { }
                else if (response) {
                  this.continuarPagoCOFO();
                } else { }
              });
          } else {
            this.continuarPagoCOFO();
          }
        }
      }
      this._requestingSendSale = false;
    }
  }

  continuarPagoCOFO() {
    if (this.value != '' && this.changeData.total != 0 && isNumber(this.changeData.total)) {
      if (this.pendiente !== this.currentDocument.totalAmountWithTax) {
        // si hay conexión con TME y contiene productos TELECOR SIEMPRE FIDELIZADO
        if (GenericHelper._hasTelecorProducts(this.currentDocument.lines) && this._signalRTMEService.getStatusConnection()) {
          this.currentDocument.pendingAmountWithTax = this.pendiente;
          this.pendiente = 0;
          this._changeDelivered.fnResponseFidelizacion(true);
          this.value = '';
        }
        else if (this._signalRTMEService.getStatusConnection()) {
          // preguntaremos si quiere fidelizar o no
          this._confirmActionSvc.promptActionConfirmStatic(
            this.messajeconfirmAction,
            this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Yes'),
            this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Not'),
            this.getLiteral('change_delivered_component', 'literal_promptActionConfirm_Message'),
            ConfirmActionType.Question)
            .subscribe(response2 => {
              if (response2 === undefined) { }
              else if (response2) {
                this.ventaFidelizada = true;
                this.currentDocument.pendingAmountWithTax = this.pendiente;
                this.pendiente = 0;
                this._changeDelivered.fnResponseFidelizacion(true);
                this.value = '';
              } else {
                this.ventaFidelizada = false;
                this._changeDelivered.fnResponseFidelizacion(false);
                this._changeDelivered.fnButtonDisable(buttonStatus.DISABLED);
                this._changeDelivered.fnButtonDisable(buttonStatus.OPTIONADITIONALCHARGED);
                this.currentDocument.pendingAmountWithTax = this.pendiente;
                this.pendiente = 0;
                this.value = '';
              }
            });
        } else {
          this._changeDelivered.fnResponseFidelizacion(false);
          this._changeDelivered.fnButtonDisable(buttonStatus.DISABLED);
          this._changeDelivered.fnButtonDisable(buttonStatus.OPTIONADITIONALCHARGED);
          this.currentDocument.pendingAmountWithTax = this.pendiente;
          this.pendiente = 0;
          this.value = '';
        }
      } else { // si es deuda completa no preguntar por la fidelización
        this.currentDocument.pendingAmountWithTax = this.pendiente;
        this.pendiente = 0;
        this.value = '';
        this._changeDelivered.fnResponseFidelizacion(false);
        this._changeDelivered.fnButtonDisable(buttonStatus.DISABLED);
        this._changeDelivered.fnButtonDisable(buttonStatus.OPTIONADITIONALCHARGED);
      }
    }
    this._requestingSendSale = false;
  }
  // * Comprobamos si hay lineas de articulos que han sido anuladas en la venta
  //   y si el total neto de cantidades de artículos de un tipo es positivo.
  // * Si solo hay carburantes en el neto, limpiamos el resto de cosas.
  ComprobarLimpiarLineasArt(documento: Document): boolean {
    let hayArtTienda = false;

    const listaAux: DocumentLine[] = [];
    const listaNeg: DocumentLine[] = [];
    const listaPos: DocumentLine[] = [];

    let banderaElim: boolean = false;

    documento.lines.forEach(linea => {
      if (linea.quantity < 0) {
        listaNeg.push(linea);
      }
      else {
        listaPos.push(linea);
      }
    });

    listaPos.forEach(lineaPos => {

      listaNeg.forEach((lineaNeg, index) => {

        if (banderaElim == false &&
          (lineaPos.appliedPromotionList == undefined || lineaPos.appliedPromotionList.length == 0) &&
          lineaPos.productId == lineaNeg.productId && lineaPos.quantity == -lineaNeg.quantity) {
          banderaElim = true;
          listaNeg.splice(index, 1);
        }

      });

      if (banderaElim == false) {
        listaAux.push(lineaPos);
      }

      banderaElim = false;
    });

    if (listaAux.filter((item) => item.typeArticle.indexOf('TIEN') > 0 || item.typeArticle.indexOf('SERV') > 0).length > 0) {
      hayArtTienda = true;
    }
    else {
      documento.lines = listaAux;
    }

    return hayArtTienda;
  }

  fnProgressPayment(secondInitial: number, counter: number, second: number) {
    let progress: number = 0;

    this.setTime = setTimeout(() => {
      // this._changeDelivered.fnTimerTicket(true);
      this.sendPrintbtn();
    }, secondInitial - counter);

    this.setInt = setInterval(() => {
      counter = counter + second;
      if (counter <= secondInitial) {
        progress = (counter * 100) / secondInitial;
        this.progressBar(progress);
        this.secondConfig = (secondInitial - counter) / second;
        this.changeData.counterSecond = counter;
      }
      else {
        clearInterval(this.setInt);
      }
    }, second);
  }

  fnStopPayment(isStop: boolean) {
    if (!isStop) {
      this.messageAccion = this.getLiteral('change_delivered_component', 'literal_messageAccion_Resume');
      if (this.setTime) {
        clearTimeout(this.setTime);
      }
      if (this.setInt) {
        clearInterval(this.setInt);
      }
      this.isStop = true;
      this.changeData.isStop = this.isStop;
    }
    else {
      this.currentDocument.customer = this._customerInternalService.currentCustomer;
      this.messageAccion = this.getLiteral('change_delivered_component', 'literal_messageAccion_Pause');
      this.isStop = false;
      this.changeData.isStop = this.isStop;
      this.fnProgressPayment(this.timeOutSendPayment, this.timeOutSendPayment - this.secondConfig * 1000, 1000);
    }
  }

  progressBar(progress: number, isFinish: boolean = false): void {
    if (!isFinish) {
      jQuery('#progressBar').css('width', progress + '%');
    } else {
      jQuery('#progressBar').css('width', '100%');
    }
  }

  requestInvoiceClick(emitirFactura: Boolean) {
    this.previewPromotions();
    this.currentDocument.subTotal = this.currentDocument.totalAmountWithTax;
    this.changeData.isButtonTicket = true;
    this.fnStopPayment(false);
    // Se asgina el ultimo cliente que se haya modificado.
    this.currentDocument.customer = this._customerInternalService.currentCustomer;
    if (emitirFactura && this.currentDocument.customer.id.substring(5) === '00000') {
      this._statusBarService.publishMessage(this.getLiteral('change_delivered_component', 'literal_statusbar_customerIdentify'));
      this.changeData.isButtonTicket = false;
      return;
    } else if (emitirFactura) {
      this.changeData.isButtonFactura = true;
      this.sendPrint();
    }
  }

  sendPrint() {
    this.changeData.isButtonFactura = true;
    this.fnStopPayment(false);
    const documentTicket = Object.assign({}, this.currentDocument);
    this.QuitarConsignaFactura(this.currentDocument);

    this.currentDocument.series = this._serieService.getSeriesByFlow(
      FinalizingDocumentFlowType.EmittingBill,
      this.currentDocument.totalAmountWithTax);

    let sendPrintFunc: Observable<boolean>;

    // Le asignamos el Extra Data para vincular la Factura y el Ticket.
    this.currentDocument.extraData = { 'NFACTURA': this.currentDocument.documentId };

    sendPrintFunc = this._documentService.sendInvoiceDocuments([this.currentDocument]);

    sendPrintFunc
      .first().subscribe(response => {
        this.changeData.isButtonTicket = false;
        this._mixtPaymentService.manageSaleEnded(response);
        this._onChangeDelivered.next(response);

        // Imprimimos el ticket ya guardado vinculado a la factura.
        documentTicket.ticketFactura = true;
        this._cashPaymentService.sendSaleTicket(documentTicket, false);

        this._statusBarService.resetProgress();
        if (response) {
          // this._cashPaymentService.onPaymentFinalized(response);
          this._changeDelivered.fnPaymentFinalized(response);
          this._onChangeDelivered.next(response);
          this.fnClean();
        }
      });
  }

  // FUNCION QUE QUITA CONSIGNA Y TAMBIEN RECALCULA EL TOTAL DEL DOCUMENTO CON DESCUENTO
  private QuitarConsignaFactura(documentFactura: Document) {
    const lineasAux: DocumentLine[] = [];
    let sumPrecioTotal: number = 0;

    documentFactura.lines.forEach(linea => {
      if (linea.isConsigna == false && linea.isRemoved != false) {
        lineasAux.push(linea);
        if (linea.appliedPromotionList != undefined && linea.appliedPromotionList.length == 1) {
          sumPrecioTotal += linea.totalAmountWithTax - linea.appliedPromotionList[0].discountAmountWithTax;
        } else {
          sumPrecioTotal += linea.totalAmountWithTax;
        }
      }
    });

    documentFactura.lines = lineasAux;
    documentFactura.totalAmountWithTax = sumPrecioTotal;
  }

  fnClean() {
    this.changeData.isCharged = false;
    this.changeData.isTicket = false;
    this.changeData.isStop = false;
    this.changeData.typeCall = 0;
    this.changeData.changePend = 0;
    this.changeData.counterSecond = 0;
    this.changeData.total = 0;
    this.changeData.totalChange = 0;
    this.changeData.selectedIndex = 0;
    this.changeData.isButtonHidden = true;
    this.changeData.ticket = '';
    this.changeData.customerId = '';
    this.changeData.paymentType = 0;
    this.changeData.isEnabledButtom = true;
    this.changeData.isButtonTicket = true;
    this.changeData.isButtonFactura = true;
    this._changeDelivered.fnChangedPayment(this.changeData);
  }

  isButtonDisabledFactura(): boolean {
    let buttonEnabled = false;
    if (this.changeData != undefined) {
      buttonEnabled = (this.changeData.paymentType === endSaleType.localcredit ||
        this.changeData.isButtonFactura || this.isAllConsigna());
    } else if (this.changeData.isButtonFactura || this.isAllConsigna()) {
      buttonEnabled = true;
    } else {
      buttonEnabled = false;
    }
    this.showButtonStopPayment = (this.isTicketSelected === true) ? this.isTicketSelected : !buttonEnabled;
    return buttonEnabled;
  }

  isAllConsigna(): boolean {
    return (this.currentDocument !== undefined && this.currentDocument.lines !== undefined
      && this.currentDocument.lines.length > 0
      && this.currentDocument.lines.filter(x => x.isRemoved != false).length ==
      this.currentDocument.lines.filter(x => x.isRemoved != false && x.isConsigna == true).length);
  }


  sendPrintbtn() {
    this.changeData.isButtonTicket = true;
    // let sendPrintFunc: Observable<boolean>;
    this.fnStopPayment(false);
    this.progressBar(0, true);

    if (this.currentDocument.isPrinted === undefined) {
      this.currentDocument.isPrinted = false;
    }

    // tslint:disable-next-line: max-line-length
    if ((this.currentDocument.extraData == undefined || this.currentDocument.extraData.NFACTURA == undefined)
      && (this.currentDocument.isPrinted == false)) {

      /*
      if (this._documentService.DocumentPagoPendiente != undefined &&
        this._documentService.DocumentPagoPendiente.isRunAway != undefined &&
        this._documentService.DocumentPagoPendiente.isRunAway) {
        sendPrintFunc = this._documentService.sendPrint([this._documentService.DocumentPagoPendiente]);
        this._documentService.DocumentPagoPendiente = undefined;
      } else { */
      // this.currentDocument.isRunAway = true;
      this.currentDocument.customer = this._customerInternalService.currentCustomer;
      // sendPrintFunc = this._documentService.sendPrint([this.currentDocument]);
      /* }
      */
      // sendPrintFunc
      this.currentDocument.isPrinted = true;
      this._documentService.sendPrint([this.currentDocument]).first().subscribe(response => {
        if (response) {
          this.reIntentos = 0;
          this.changeData.isButtonTicket = false;
          this._statusBarService.resetProgress();
          this._changeDelivered.fnPaymentFinalized(response);
        } else if (response == false) {
          if (this.reIntentos < this.maxReintentosImpresion) {
            this.reIntentos++;
            if (this.currentDocument) { this.currentDocument.isPrinted = false; }
            this.sendPrintbtn();
          } else {
            this.reIntentos = 0;
            this._documentInternalService.currentDocument.BarcodeStatus = false;
            this._statusBarService.resetProgress();
            this._changeDelivered.fnPaymentFinalized(true);
          }
        }
      }, error => {
        if (this.currentDocument) { this.currentDocument.isPrinted = false; }
      });
    }
    else {
      this.changeData.isButtonTicket = false;
      this._statusBarService.resetProgress();
      this._changeDelivered.fnPaymentFinalized(true);
    }
  }

  isButtonDisabled(): boolean {
    this.showButtonStopPayment = (this.isTicketSelected === true) ? this.isTicketSelected : !this.changeData.isButtonTicket;
    return this.changeData.isButtonTicket;
  }

  previewPromotions() {
    this._documentInternalService.previewPromotions();
  }

  getLiteral(group: string, key: string): string {
    return this._languageService.getLiteral(group, key);
  }


  setDisplayShowButtonStopPayment() {
    this.showButtonStopPayment = true;
    // if ((this.tpvNetWorkConnectionStatus != ConnectionStatus.connected) && (this._signalRTMEService.getStatusConnection())) {
    if (this._signalRTMEService.getStatusConnection()) {
      if ((this.changeData.paymentType === endSaleType.cash) && (this.changeData.typeCall === 2)) {
        this.showButtonStopPayment = false;
      } else if ((this.changeData.paymentType === endSaleType.mixtPayment)) {
        if ((this.currentDocument !== undefined && this.currentDocument.paymentDetails !== undefined ?
          (this.currentDocument.paymentDetails.find(pay => pay.paymentMethodId.substring(5) === '01') !== undefined) ?
            true : false : false) && (this.changeData.typeCall === 2)) {
          this.showButtonStopPayment = false;
        }
      }
    }
  }

}
