import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { FuellingPointsService } from 'app/services/fuelling-points/fuelling-points.service';
import { ChangePaymentInternalService } from 'app/services/payments/change-payment-internal.service';
import { SessionInternalService } from 'app/services/session/session-internal.service';
import { PluService } from 'app/services/plu/plu.service';
import { LanguageService } from 'app/services/language/language.service';
import { DocumentInternalService } from 'app/services/document/document-internal.service';

@Component({
  selector: 'tpv-options-auxiliar',
  templateUrl: './options-auxiliar.component.html',
  styleUrls: ['./options-auxiliar.component.scss']
})
export class OptionsAuxiliarComponent implements OnInit, OnDestroy {
  blnActiveReturn: boolean = false;
  _subscriptions: Subscription[] = [];
  btnStopChecked: boolean = false;
  parar: string;
  activar: string;

  constructor(
    private _changeDelivered: ChangePaymentInternalService,
    private _fuellingPointsSvc: FuellingPointsService,
    private _session: SessionInternalService,
    private _pluService: PluService,
    private _languageService: LanguageService,
    private _documentInternalService: DocumentInternalService
  ) { }

  ngOnInit() {

    this._subscriptions.push(this._changeDelivered.estadoParar$.subscribe(d => {
      this.btnStopChecked = d;
      setTimeout(() => {
        if (this.btnStopChecked) {
          jQuery('.button_Alert_right').css('background-color', '#6a972c');
        } else {
          jQuery('.button_Alert_right').css('background-color', '#e40028');
        }
      }, 1);
    }));

    this._subscriptions.push(this._changeDelivered.changedPayment$.subscribe(data => {
      this.blnActiveReturn = !data.isButtonHidden;
    }));

    this.parar = this.getLiteral('options_auxiliar', 'stop_checked');
    this.activar = this.getLiteral('options_auxiliar', 'Activate_checked');


  }

  ngOnDestroy() {
    this._subscriptions.forEach(p => p.unsubscribe());
  }

  btnStopclick() {
    this._subscriptions.push(this._fuellingPointsSvc.manageRequestEmergencyStop(!this.btnStopChecked)
      .first().subscribe());
    if (jQuery('md-drawer').hasClass('open-side-bar')) {
      this._session.onClickStopDispenser(this.btnStopChecked);
    }
  }

  fnReturn() {
    this._documentInternalService.currentDocument.BarcodeStatus = false;
    this._changeDelivered.fnReturn(true);
    this._pluService.canSearchWithBarcode = true; // Pana - Para poder buscar con el lector
    jQuery('.selecArticulo').css('background-color', '#ffffff');
    jQuery('.buttonCancel').css('background-image', 'linear-gradient(104deg, #aca39a 78%, #ffffff 0%)');
  }
  getLiteral(group: string, key: string): string {
    return this._languageService.getLiteral(group, key);
  }
}
