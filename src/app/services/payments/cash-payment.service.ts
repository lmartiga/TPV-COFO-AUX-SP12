import { Injectable } from '@angular/core';

import { AppDataConfiguration } from 'app/config/app-data.config';
import { PaymentMethodType } from 'app/shared/payments/payment-method-type.enum';
import { FormatHelper } from 'app/helpers/format-helper';
import { Document } from 'app/shared/document/document';
import { DocumentService } from 'app/services/document/document.service';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { StatusBarService } from 'app/services/status-bar/status-bar.service';
import { DocumentSeriesService } from 'app/services/document/document-series.service';
import { FinalizingDocumentFlowType } from '../../shared/document/finalizing-document-flow-type.enum';
import { Subscriber } from 'rxjs/Subscriber';
import { ChangePaymentInternalService } from 'app/services/payments/change-payment-internal.service';
import { GenericHelper } from 'app/helpers/generic-helper';

@Injectable()
export class CashPaymentService {

  private _paymentFinalized: Subject<boolean> = new Subject();

  constructor(
    private _appDataConfig: AppDataConfiguration,
    private _documentService: DocumentService,
    private _statusBarService: StatusBarService,
    private _seriesService: DocumentSeriesService,
    private _ChangePaymentInternalService: ChangePaymentInternalService
  ) { }

  // solo efectivo cuando NO fideliza
  sendSale(document: Document, invoice: boolean, documentPrint: boolean = true, isanulado = false, isMixto: boolean = false) {

    if (document != undefined) {
      const cashPM = this._appDataConfig.getPaymentMethodByType(PaymentMethodType.cash);
      const CardPM = this._appDataConfig.getPaymentMethodByType(PaymentMethodType.bankcard);

      if (document.paymentDetails !== undefined) {
        document.paymentDetails.forEach(X => {
          if (X.method !== undefined) {
            if (X.method.id === CardPM.id) {
              isMixto = true;
              return;
            }
          }
        });
      }

      document.pendingAmountWithTax = document.pendingAmountWithTax != undefined ? document.pendingAmountWithTax : 0;
      document.plate = document.customer.matricula;
      document.paymentDetails = [{
        paymentMethodId: cashPM.id,
        paymentDateTime: FormatHelper.formatToUTCDateFromLocalDate(new Date()),
        currencyId: this._appDataConfig.baseCurrency.id,
        changeFactorFromBase: 1,
        primaryCurrencyGivenAmount: document.totalAmountWithTax - document.pendingAmountWithTax,
        primaryCurrencyTakenAmount: document.totalAmountWithTax - document.pendingAmountWithTax
      }];

      if (document.pendingAmountWithTax != undefined &&
        document.pendingAmountWithTax != 0 && document.totalAmountWithTax != document.pendingAmountWithTax) {
        document.isDeuda = true;
      }
      // Insertamos la serie
      // todo: importe maximo para efectivo sin identificar cliente
      document.series =
        this._seriesService.getSeriesByFlow(
          invoice ?
            FinalizingDocumentFlowType.EmittingBill :
            FinalizingDocumentFlowType.EmittingTicket,
          document.totalAmountWithTax);

      // const sendSaleFunc = invoice ?
      //  this._documentService.sendInvoiceDocuments([document])
      // : this._documentService.sendSaleDocuments([document], documentPrint);
      let sendSaleFunc: Observable<boolean>;
      if (invoice) {
        sendSaleFunc = this._documentService.sendInvoiceDocuments([document]);
      } else if (document.totalAmountWithTax == 0) {
        sendSaleFunc = this._documentService.sendSaleDocumentsSorteoEfectivo([document], false);
      } else if (document.totalAmountWithTax === document.pendingAmountWithTax) {
        sendSaleFunc = this._documentService.sendSaleDocuments([document], false);
      } else {
        sendSaleFunc = this._documentService.sendSaleDocumentsSorteoEfectivo([document], true);
      }
      sendSaleFunc
        .first().subscribe(response => {
          setTimeout(() => {
            this._statusBarService.resetProgress();
          }, 3000);
          if (!isanulado) {
            this._paymentFinalized.next(response);
            if (!isMixto) {
              this._ChangePaymentInternalService.fnEnabledTicketandFacturar(response);
            }
          }
        });
    } else {
      if (!isanulado) {
        this._paymentFinalized.next(false);
      }
    }
  }

  sendSaleTicket(document: Document, invoice: boolean, documentPrint: boolean = true) {
    if (document != undefined) {
      // const cashPM = this._appDataConfig.getPaymentMethodByType(PaymentMethodType.cash);
      /* document.paymentDetails = [{
        paymentMethodId: cashPM.id,
        paymentDateTime: FormatHelper.formatToUTCDateFromLocalDate(new Date()),
        currencyId: this._appDataConfig.baseCurrency.id,
        changeFactorFromBase: 1,
        primaryCurrencyGivenAmount: document.totalAmountWithTax - document.pendingAmountWithTax,
        primaryCurrencyTakenAmount: document.totalAmountWithTax - document.pendingAmountWithTax,
      }];*/
      /*document.lines.forEach(linea => {
        let descuento: number;
        descuento = 0;
        if (linea.isConsigna == false && linea.appliedPromotionList != undefined) {
          linea.appliedPromotionList.filter(x => x.discountAmountWithTax != undefined).forEach(l => {
            descuento += l.discountAmountWithTax;
        });
        document.totalAmountWithTax += descuento;
      }
    });*/

      // Insertamos la serie
      // todo: importe maximo para efectivo sin identificar cliente
      document.series =
        this._seriesService.getSeriesByFlow(
          invoice ?
            FinalizingDocumentFlowType.EmittingBill :
            FinalizingDocumentFlowType.EmittingTicket,
          document.totalAmountWithTax);

      // const sendSaleFunc = invoice ?
      //  this._documentService.sendInvoiceDocuments([document])
      // : this._documentService.sendSaleDocuments([document], documentPrint);
      let sendSaleFunc: Observable<boolean>;
      if (document.totalAmountWithTax == 0) {
        sendSaleFunc = this._documentService.sendSaleDocuments([document], false);
      } else {
        sendSaleFunc = this._documentService.sendSaleDocuments([document], documentPrint);
      }
      sendSaleFunc
        .first().subscribe(response => {
          setTimeout(() => {
            this._statusBarService.resetProgress();
          }, 3000);
          this._paymentFinalized.next(response);
          this._ChangePaymentInternalService.fnEnabledTicketandFacturar(response);
        });
    } else {
      this._paymentFinalized.next(false);
    }
  }

  // mixto cuando hay efectivo y NO fideliza
  sendSaleMixto(document: Document, emitBill: boolean, documentPrint: boolean = true) {
    if (document == undefined) {
      this._paymentFinalized.next(false);
      return;
    }

    if (document.pendingAmountWithTax != undefined &&
      document.pendingAmountWithTax != 0 && document.totalAmountWithTax != document.pendingAmountWithTax) {
      document.isDeuda = true;
    }

    document.series = this._seriesService.getSeriesByFlow(
      emitBill ? FinalizingDocumentFlowType.EmittingBill : FinalizingDocumentFlowType.EmittingTicket,
      document.totalAmountWithTax);

    if (emitBill) {
      this._documentService.sendInvoiceDocuments(new Array<Document>(document))
        .first().subscribe(response => {
          this._paymentFinalized.next(response);
          this._ChangePaymentInternalService.fnEnabledTicketandFacturar(response);
        });
    } else {
      if (GenericHelper._hasPaymentId(
        document.paymentDetails,
        this._appDataConfig.getPaymentMethodByType(1).id)) {
        this._documentService.sendSaleDocumentsMixtoEfectivo(new Array<Document>(document))
          .first().subscribe(response => {
            this._paymentFinalized.next(response);
            this._ChangePaymentInternalService.fnEnabledTicketandFacturar(response);
          });
        // mixto y no hay efectivo
      } else {
        this._documentService.sendDocumentsNoPrintDocumentList(new Array<Document>(document))
          .first().subscribe(response => {
            this._paymentFinalized.next(response);
            this._ChangePaymentInternalService.fnEnabledTicketandFacturar(response);
          });
      }
    }
  }

  sendSaleAutomatic(document: Document): Observable<boolean> {
    return Observable.create((observer: Subscriber<boolean>) => {
      if (document != undefined) {
        if (document.pendingAmountWithTax != undefined &&
          document.pendingAmountWithTax != 0 && document.totalAmountWithTax != document.pendingAmountWithTax) {
          document.isDeuda = true;
        }
        const cashPM = this._appDataConfig.getPaymentMethodByType(PaymentMethodType.cash);
        document.paymentDetails = [{
          paymentMethodId: cashPM.id,
          paymentDateTime: FormatHelper.formatToUTCDateFromLocalDate(new Date()),
          currencyId: this._appDataConfig.baseCurrency.id,
          changeFactorFromBase: 1,
          primaryCurrencyGivenAmount: document.totalAmountWithTax,
          primaryCurrencyTakenAmount: document.totalAmountWithTax
        }];
        // Insertamos la serie
        // todo: importe maximo para efectivo sin identificar cliente
        document.series =
          this._seriesService.getSeriesByFlow(
            FinalizingDocumentFlowType.EmittingTicket,
            document.totalAmountWithTax);
        // const sendSaleFunc = this._documentService.sendSaleDocumentsSorteoEfectivo([document]);
        const sendSaleFunc = this._documentService.sendPrintAutomatic([document]);
        sendSaleFunc.first().subscribe(response => {
          setTimeout(() => {
            this._statusBarService.resetProgress();
            return observer.next(true);
          }, 3000);
        });
      } else {
        return observer.next(false);
        // this._paymentFinalized.next(false);
      }
    });
  }

  onPaymentFinalized(): Observable<boolean> {
    return this._paymentFinalized.asObservable();
  }

  managePaymentFinalized(success: boolean) {

  }

}
