import { Component, OnInit } from '@angular/core';
import { TPVInitializationService } from 'app/services/tpv-initialization.service';
import { GetPSSInitialConfigurationResponse } from 'app/shared/hubble-pos-signalr-responses/get-pss-initial-configuration-response';
import { GetPSSInitialConfigurationResponseStatuses } from 'app/shared/hubble-pos-signalr-responses/get-pss-initial-configuration-status.enum';
import { BusinessType } from 'app/shared/business-type.enum';
import { MinimumNeededConfiguration } from 'app/config/minimum-needed.config';
import { DBSyncTableDownloadStartedArgs } from 'app/shared/signalr-server-responses/pos-hub/dbsync-table-download-started-args';
import { DBSyncProgressChangedArgs } from 'app/shared/signalr-server-responses/pos-hub/dbsync-progress-changed-args';
import { DBSyncFinishedArgs } from 'app/shared/signalr-server-responses/pos-hub/dbsync-finished-args';
import { SignalRPSSService } from 'app/services/signalr/signalr-pss.service';
import { SignalRPaymentTerminalService } from 'app/services/signalr/signalr-payment-terminal.service';
import { TpvIdleService } from '../../services/tpv-idle.service';
import { FuellingPointsInternalService } from 'app/services/fuelling-points/fuelling-points-internal.service';

@Component({
  selector: 'tpv-bootstrap',
  templateUrl: './bootstrap.component.html',
  styleUrls: ['./bootstrap.component.scss'],
  providers: [TPVInitializationService]
})
export class BootstrapComponent implements OnInit {
  initialized = false;
  loaderState = 'active';
  synchronizationStatus: string;
  progressValue: number;

  constructor(
    private _tpvInitService: TPVInitializationService,
    private _signalRPSSService: SignalRPSSService,
    private _signalRPaymentTerminalService: SignalRPaymentTerminalService,
    private _minimumNeededConfig: MinimumNeededConfiguration,
    private _tpvIdleSvc: TpvIdleService,
    private _fpinternalSvc: FuellingPointsInternalService,
  ) {
    // Nos suscribimos a los eventos de sincronización que nos provee el servicio de inicialización
    _tpvInitService.dbSyncTableDownloadStarted().subscribe(
      (args: DBSyncTableDownloadStartedArgs) => this._onDBSyncTableDownloadStarted(args));
    _tpvInitService.dbSyncProgressChanged().subscribe(
      (args: DBSyncProgressChangedArgs) => this._onDBSyncProgressChanged(args));
    _tpvInitService.dbSyncFinished().subscribe(
      (args: DBSyncFinishedArgs) => this._onDBSyncFinished(args));
  }

  ngOnInit() {
    // fix issue with IE on requestFullscreen.
    $(':root').width('100%');
    Promise.resolve(this._tpvInitService.initializeAsync()).then(
      response => {
        if (response === true) {
          this.initialized = true;
          this.loaderState = 'inactive';
          this._tpvIdleSvc.start();

          if (this._minimumNeededConfig.businessComponentsConfiguration.type === BusinessType.gasStation) {
            // El tipo de negocio es gasStation. Solicitamos inicialización al hub de estación de servicio
            // for (let index = 0; index < 5; index++) {
              this._signalRPSSService.startInitializationProcess().subscribe((pssInitialConfigResponse: GetPSSInitialConfigurationResponse) => {
                console.log(pssInitialConfigResponse);
                if (pssInitialConfigResponse.status === GetPSSInitialConfigurationResponseStatuses.successful) {
                  this._fpinternalSvc.fnStopButton(true);
                  console.log('Configuración inicial de PSS OK->');
                  console.log(pssInitialConfigResponse.message);
                  // index = 5;
                } else {
                  console.log('Configuración inicial de PSS KO->');
                  console.log(pssInitialConfigResponse.message);
                  this._signalRPSSService.startInitializationProcess().subscribe((pssInitialConfigResponse2: GetPSSInitialConfigurationResponse) => {
                    console.log(pssInitialConfigResponse2);
                    if (pssInitialConfigResponse2.status === GetPSSInitialConfigurationResponseStatuses.successful) {
                      console.log('Configuración inicial de PSS OK->');
                      console.log(pssInitialConfigResponse2.message);
                    } else {
                      console.log('Configuración inicial de PSS KO->');
                      console.log(pssInitialConfigResponse2.message);
                    }
                  });
                }
              });
            // }

            /*this._signalRPSSService.startInitializationProcess().subscribe((pssInitialConfigResponse: GetPSSInitialConfigurationResponse) => {
              console.log(pssInitialConfigResponse);
              if (pssInitialConfigResponse.status === GetPSSInitialConfigurationResponseStatuses.successful) {
                console.log('Configuración inicial de PSS OK->');
                console.log(pssInitialConfigResponse.message);
              } else {
                console.log('Configuración inicial de PSS KO->');
                console.log(pssInitialConfigResponse.message);
                this._signalRPSSService.startInitializationProcess().subscribe((pssInitialConfigResponse2: GetPSSInitialConfigurationResponse) => {
                  console.log(pssInitialConfigResponse2);
                  if (pssInitialConfigResponse2.status === GetPSSInitialConfigurationResponseStatuses.successful) {
                    console.log('Segundo intento: Configuración inicial de PSS OK->');
                    console.log(pssInitialConfigResponse2.message);
                  } else {
                    // tslint:disable-next-line:max-line-length
                    this._signalRPSSService.startInitializationProcess().subscribe((pssInitialConfigResponse3: GetPSSInitialConfigurationResponse) => {
                      console.log(pssInitialConfigResponse3);
                      if (pssInitialConfigResponse3.status === GetPSSInitialConfigurationResponseStatuses.successful) {
                        console.log('Tercer intento: Configuración inicial de PSS OK->');
                        console.log(pssInitialConfigResponse3.message);
                      } else {
                        console.log('Tercer intentoConfiguración inicial de PSS KO->');
                        console.log(pssInitialConfigResponse3.message);
                      }
                    });
                    console.log('Segundo intentoConfiguración inicial de PSS KO->');
                    console.log(pssInitialConfigResponse2.message);
                  }
                });
              }
            });*/
          } else {
            // El tipo de negocio NO es gasStation.
            console.log('No hay que inicializar la configuración PSS porque el tipo de empresa no es gasStation');
          }

          // NOS HEMOS LLEVADO LA INICIALIZACIÓN DEL MÓDULO DE IMPRESIÓN AL initializeAsync PARA DETENER EL TPV EN CASO DE ERROR

          // Solicitamos inicialización al hub de terminales de pago
          this._signalRPaymentTerminalService.startInitializationProcess().subscribe(paymentTerminalInitialConfigResponse => {
            if (paymentTerminalInitialConfigResponse === true) {
              console.log('Configuración inicial de payment terminal service OK->');
            } else {
              console.log('Configuración inicial de payment terminal service KO->');
            }
          });
        } else {
          // TODO: Ha habido un problema recuperando la configuración necesaria.
          //       Mostrar un mensaje de error. (ABC o DGT).
          console.log('ERROR: Ha habido un problema recuperando la configuración necesaria, el TPV no puede iniciar.');
          console.log('Revise los logs.');
        }
      },
      error => {
        // TODO: Ha habido un problema de inicialización de elementos necesarios.
        //       Mostrar un mensaje de error. (ABC o DGT).
        console.log('ERROR: Ha habido un problema inicializando el TPV, el TPV no puede iniciar. Detalle->');
        console.log(error);
        console.log('Revise los logs.');
      });
  }

  //#region event handlers
  private _onDBSyncTableDownloadStarted(args: DBSyncTableDownloadStartedArgs) {
    this.synchronizationStatus = `${args.synchronizationProcessName} - ${args.tableName}`;
  }

  private _onDBSyncProgressChanged(args: DBSyncProgressChangedArgs) {
    this.synchronizationStatus = args.synchronizationProcessName;
    this.progressValue = args.progressPercentage;
  }

  private _onDBSyncFinished(args: DBSyncFinishedArgs) {
    this.synchronizationStatus = `${args.synchronizationProcessName}`;
  }
  //#endregion event handlers
}
