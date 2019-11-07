import { Injectable } from '@angular/core';
import { HttpService } from 'app/services/http/http.service';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { AppDataConfiguration } from 'app/config/app-data.config';
import { FuellingPointModeOperationChangedArgs } from 'app/shared/signalr-server-responses/multiTpvHub/fuelling-point-mode-operation-changed-args';

@Injectable()
export class MultitpvFuellingPointsService {

    constructor(
        private _appDataSvc: AppDataConfiguration,
        private _http: HttpService,
    ) {}

    InitOperationModeFuellingPoint(request: Array<FuellingPointModeOperationChangedArgs>): Observable<boolean> {
        return Observable.create((observer: Subscriber<boolean>) => {
            this._http.postJsonObservable(`${this._appDataSvc.apiUrlCofo}/InitOperationModeFuellingPoint`, request)
            .first().subscribe(response => {
            if (response.status == 1) {
                observer.next(true);
            }
            else {observer.next(false);}
            }, error => {observer.next(false);}
            );
        });
    }

    SetMultiTPVConnectSignalR(isMultiTpvConnect: boolean): Observable<boolean> {
        return Observable.create((observer: Subscriber<boolean>) => {
            this._http.postJsonObservable(`${this._appDataSvc.apiUrlCofo}/SetMultiTPVConnectSignalR`, {isMultiTpvConnect:isMultiTpvConnect})
            .first().subscribe(response => {
                if (response.status == 1) {
                    observer.next(true);
                } else {observer.next(false);}
            }, error => {observer.next(false);}
            );
        });
    } 

}
