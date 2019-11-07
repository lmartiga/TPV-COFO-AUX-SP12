import { IbusinessSpecificLine } from 'app/shared/ibusiness-specific-line';
import { BusinessType } from '../business-type.enum';
import { Observable } from 'rxjs/Observable';
import { ConfirmPaymentRequest } from 'app/shared/confirm-payment-request';
import { FuellingPointCancelAuthorizationLineData } from './fuelling-point-cancel-authorization-line-data';

export class FuellingPointCancelAuthorizationLine extends IbusinessSpecificLine {
    type = BusinessType.gasStation;

    constructor(private lineData: FuellingPointCancelAuthorizationLineData) {
        super();
    }

    onConfirmPay(data: ConfirmPaymentRequest): Observable<boolean> {
        console.log('--> CANCELO AUTORIZACIÓN');
        return this.lineData.fpSvc.cancelAuthorizationOfFuellingPoint(this.lineData.idFuellingPoint);
    }
    onDeleteLine(): Observable<boolean> {
        return Observable.of(true);
    }

}
