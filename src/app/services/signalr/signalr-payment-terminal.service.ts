import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscriber} from 'rxjs/Subscriber';
import { Subject } from 'rxjs/Subject';
import { LogHelper } from 'app/helpers/log-helper';
import { ISignalRConnectionManager } from 'app/shared/isignalr-conection-manager';
import { PaymentTerminalResponse } from 'app/shared/signalr-server-responses/paymentTerminalHub/payment-terminal-reponse';
import { PaymentTerminalResponseStatuses } from 'app/shared/signalr-server-responses/paymentTerminalHub/payment-terminal-response-statuses.enum';

@Injectable()
export class SignalRPaymentTerminalService implements OnDestroy {

  private _hubProxy: SignalR.Hub.Proxy;
  private _connectionManager: ISignalRConnectionManager;
  private _paymentTerminalResponseReceived: Subject<PaymentTerminalResponse> = new Subject();

  constructor(
  ) {
    console.log('SignalRPaymentTerminalService created');
  }

  ngOnDestroy() {
    // Eliminamos las suscripciones
    this._hubProxy.off('CustomerDataReceived', _ => this._onCustomerReceived(undefined));
  }

  /**
   *
   *
   * @param {ISignalRConnectionManager} connectionManager
   * @returns {ISignalRHub}
   * @memberof SignalRPaymentTerminalService
   * @throws {Error} when connectionManager is null
   */
  setConnectionManager(connectionManager: ISignalRConnectionManager): SignalRPaymentTerminalService {
    if (connectionManager == undefined) {
      const errorMessage: string = 'ERROR -> connectionManager parameter cannot be null';
      console.log(errorMessage);
      throw new Error(errorMessage);
    }
    this._connectionManager = connectionManager;
    return this;
  }

  init(): SignalRPaymentTerminalService {
    if (this._connectionManager != undefined) {
      this._hubProxy = this._connectionManager.createHubProxy('paymentTerminalHub');
      this._hubProxy.on('CustomerDataReceived',
        (customer: Customer) => this._onCustomerReceived(customer));
    } else {
      console.log('ERROR -> ConnectionManager cannot be null');
    }
    return this;
  }

  startInitializationProcess(): Observable<boolean> {
    // TODO: respuesta mockeada
    return Observable.create((observer: Subscriber<boolean>) => observer.next(true));
  }

  private _onCustomerReceived(customer: Customer) {
    // console.log('Recibido mensaje del server SignalR:');
    // console.log(customer);
  }

  salePayment(amount: number): Observable<PaymentTerminalResponse> {
    const request = {amount: amount};
    this._hubProxy.invoke('SaleTerminal', request).then((response: PaymentTerminalResponse) => {
      this._paymentTerminalResponseReceived.next(response);
    },
    error => {
      const message: string = `Se produjo un error al solicitar la ejecución del servicio SignalR Print: ${error}`;
      LogHelper.trace(message);
      const response: PaymentTerminalResponse = {
        status: PaymentTerminalResponseStatuses.genericError,
        message: message,
        stringedTerminalResponse: '',
      };
      this._paymentTerminalResponseReceived.next(response);
    });
    return this._paymentTerminalResponseReceived.asObservable();
  }
}

// TODO: Interfaz de prueba para comunicación por evento con paymentTerminalHub
interface Customer {
  customerCode: string;
  customerName: string;
  vehicleDriverName: string;
  companyTaxCode: string;
  vehicleLicensePlate: string;
  vehicleKms: number;
  restrictedProductReferences: string[];
}
