import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { IresponseStatusWithObject } from 'app/shared/iresponse-status-with-object';
import { DocumentLinePromotion } from 'app/shared/document/document-line-promotion';
import { Subscriber } from 'rxjs/Subscriber';
import { AppDataConfiguration } from 'app/config/app-data.config';
import { FormatHelper } from 'app/helpers/format-helper';
import { HttpService } from '../http/http.service';
import { CalculatePromotionsResponse } from 'app/shared/web-api-responses/calculate-promotions-response';
import { CalculatePromotionsResponseStatuses } from 'app/shared/web-api-responses/calculate-promotions-response-statuses.enum';
import { RoundPipe } from 'app/pipes/round.pipe';
import { Document } from 'app/shared/document/document';
import { LogHelper } from 'app/helpers/log-helper';
import { DocumentLine } from 'app/shared/document/document-line';
import { ResponseStatus } from 'app/shared/response-status.enum';

@Injectable()
export class PromotionsService {

  constructor(
    private _appDataConfig: AppDataConfiguration,
    private _http: HttpService,
    private _roundPipe: RoundPipe
  ) { }

  // solicita al servicio el cálculo de promociones para un determinado documento. Se obtendrá la lista de promociones aplicables al mismo

  calculatePromotions(inputDocument: Document): Observable<IresponseStatusWithObject<Array<DocumentLinePromotion>>> {
    // const documentCopy: Document = GenericHelper.deepCopy(inputDocument);
    // documentCopy.lines = documentCopy.lines.filter(x => this.canApplyPromotion(x));
    this._clearPromotions(inputDocument);
    return Observable.create((observer: Subscriber<IresponseStatusWithObject<Array<DocumentLinePromotion>>>) => {
      const request = {
        identity: this._appDataConfig.userConfiguration.Identity,
        document: FormatHelper.formatDocumentToCalculatePromotionsServiceExpectedObject(inputDocument, this._appDataConfig.userConfiguration.PosId)
      };
      this._http.postJsonObservable(`${this._appDataConfig.apiUrl}/CalculatePromotions`, request)
        .first()
        .subscribe(
          (response: CalculatePromotionsResponse) => {
            if (response.status == CalculatePromotionsResponseStatuses.successful) {
              response.availablePromotions.forEach(promotion => {
                // agrego redondeo a las promociones
                promotion.discountAmountWithTax = this._roundPipe.transformInBaseCurrency(promotion.discountAmountWithTax);
              });
              observer.next({
                status: ResponseStatus.success,
                object: response.availablePromotions
              });
            } else {
              LogHelper.logError(response.status,
                `La respuesta ha sido negativa: ${CalculatePromotionsResponseStatuses[response.status]}. Mensaje: ${response.message}`);
              observer.next({
                status: ResponseStatus.error,
                object: undefined
              });
            }
          },
          error => {
            LogHelper.logError(undefined,
              `Se produjo un error al solicitar la ejecución del servicio CalculatePromotions: ${error}`);
            observer.next({
              status: ResponseStatus.error,
              object: undefined
            });
          });
    });
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

  canApplyPromotion(line: DocumentLine): boolean {
    // return (line.priceWithTax === line.originalPriceWithTax && line.discountPercentage === 0);
    return (line.priceWithTax === line.originalPriceWithTax && line.discountPercentage < 0.5);
  }

  cleanLocalTarif(inputDocument: Document){
    inputDocument.lines.forEach(line =>{
      if(line.PVPLocal){ // Si la linea es de tarifa local, pon el procio original para enviar el documento correcto al servicio
        line.priceWithTax = line.originalPriceWithTax;
        line.totalAmountWithTax = line.priceWithTax * line.quantity;
      }
    });
  }
}
