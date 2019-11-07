import { Component, OnInit, ViewContainerRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IDimensionable } from 'app/shared/idimensionable';
import { HostDimensionable } from 'app/shared/host-dimensionable';
import { IViewContainerReferenceable } from 'app/shared/iview-container-referenceable';
import { OperatorInternalService } from 'app/services/operator/operator-internal.service';
import { CustomerInternalService } from 'app/services/customer/customer-internal.service';
import { TpvMainService } from 'app/services/tpv/tpv-main.service';
import { AppDataConfiguration } from 'app/config/app-data.config';
import { Operator } from 'app/shared/operator/operator';
import { Customer } from 'app/shared/customer/customer';
import { PluComponent } from 'app/components/actions/plu/plu.component';
import { MdTabChangeEvent } from '@angular/material';
import { ChangePaymentInternalService } from 'app/services/payments/change-payment-internal.service';
import { changedPayment } from 'app/shared/payments/changed-payment';
import { LanguageService } from 'app/services/language/language.service';

@Component({
  selector: 'tpv-actions',
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent extends HostDimensionable
  implements OnInit, AfterViewInit, IDimensionable, IViewContainerReferenceable {

  @ViewChild('actionsHost', { read: ViewContainerRef }) viewContainerRef: ViewContainerRef;
  @ViewChild(PluComponent) pluComponent: PluComponent;

  private _isOperatorIntroduced: boolean = false;
  private _isCustomerIntroduced: boolean = false;
  _changeData: changedPayment = {selectedIndex: -1 , typeCall: 0, isTicket: false, ticket: '', total: 0, isCharged: false, totalChange: 0
  , changePend: 0, customerId: '', isStop: false, counterSecond: 8, isButtonHidden: true, isButtonFactura: true, isButtonTicket: true };

  // decidir tab seleccionada
  selectedTab = 0;

  constructor(
    private _elRef: ElementRef,
    private _operatorInternalService: OperatorInternalService,
    private _customerInternalService: CustomerInternalService,
    private _tpvMainService: TpvMainService,
    private _appDataConfig: AppDataConfiguration,
    private _changeDelivered: ChangePaymentInternalService,
    private _languageService: LanguageService
  ) {
    super();
    console.log('ActionsComponent created');

    // suscribirse a evento de cambio de operador
    this._operatorInternalService.operatorChanged().subscribe(operator => this._newOperator(operator));
    // suscribirse al evento de cambio de cliente
    this._customerInternalService.customerChanged().subscribe(customer => this._newCustomer(customer));
    // suscribirse para hacer visible la PLU
    this._tpvMainService.setPluVisible$.subscribe(setPluVisible => this._setPluVisible(setPluVisible));
  }

  ngOnInit() {

    this._changeDelivered.changedPayment$.subscribe(p => {
      this._changeData = p;
    });

    this._changeDelivered.return$.subscribe( dato => {
      this._changeData.isButtonHidden = true;
      this._changeData.isEnabledButtom = true;
      this._changeDelivered.fnChangedPayment(this._changeData);
    });

  }

  ngAfterViewInit() {
    this._elRef.nativeElement.classList.add('tpv-actions');
    this._elRef.nativeElement.classList.add('noP');
    this._elRef.nativeElement.classList.add('actions-wrapper');
  }

  actionSelected(ev: MdTabChangeEvent) {
    console.log(`ActionComponent->ActionSelected: Selected option index: ${ev.index}`);
    // Si se hace visible la PLU se pone foco en input principal de ese componente hijo
    this.selectedTab = ev.index;
    if (ev && ev.index == 0 && this.isCustomerAvailable()) {
      if (this.pluComponent) {
        //this.pluComponent.setInputFocus();
      }
    }
  }

  isCustomerAvailable() {
    return this._isCustomerIntroduced;
  }

  isOperatorAvailable() {
    return this._isOperatorIntroduced;
  }

  private _setPluVisible (setPluVisible: boolean) {
    if(this.selectedTab == 0){
      if (setPluVisible && this.isCustomerAvailable()) {
        this.selectedTab = 0;
        // si la PLU ya está seleccionada se pone foco
        if (this.selectedTab == 0 && this.pluComponent) {
          //this.pluComponent.setInputFocus();
        }
      }
    }
  }

  // datos a cambiar cuando hay cambio de operador
  private _newOperator(operator: Operator) {
    if (operator != undefined) {
      this._isOperatorIntroduced = true;
      if (this._appDataConfig.defaultCustomer == '' || this._appDataConfig.defaultCustomer == undefined) {
        this.selectedTab = 1;
      }
    } else {
      this._isOperatorIntroduced = false;
      this.selectedTab = 0;
    }
  }

  // datos a cambiar cuando hay cambio de customer
  private _newCustomer(customer: Customer) {
    if (customer != undefined) {
      this._isCustomerIntroduced = true;
      this.selectedTab = 0;
    } else {
      this._isCustomerIntroduced = false;
      if (this.isOperatorAvailable()) {
        this.selectedTab = 1;
      }
    }
  }

  getLiteral(group: string, key: string): string {
    return this._languageService.getLiteral(group, key);
  }
}
