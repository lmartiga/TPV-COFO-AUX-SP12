import { Injectable, OnDestroy } from '@angular/core';
import { ISignalRConnectionManager } from 'app/shared/isignalr-conection-manager';
import { TpvIdleService } from 'app/services/tpv-idle.service';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { StatusBarService } from '../status-bar/status-bar.service';
import { TpvStatusCheckerService } from 'app/services/tpv-status-checker.service';
import { SignalRConnectionManagerService } from 'app/services/signalr/signalr-connection-manager';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { EnterUpdateModeArgs } from '../../shared/updater/enter-update-mode-args';
import { CancelUpdateModeArgs } from '../../shared/updater/cancel-update-mode-args';
import { CurrentUpdateModeArgs } from '../../shared/updater/current-update-mode-args';
import { AppUpdateModeStateType } from '../../shared/updater/app-update-mode-state-type.enum';
import { AppWaitingConditionType } from '../../shared/updater/app-waiting-condition-type.enum';
interface HubSubscription {
    eventName: string;
    callback: (param: any) => void;
}
@Injectable()
export class SignalrUpdater implements OnDestroy {
    private _connectionManager: ISignalRConnectionManager;
    private _hubProxy: SignalR.Hub.Proxy;
    private _subscriptions: Array<HubSubscription>;
    private _state: AppUpdateModeStateType = AppUpdateModeStateType.InStandardMode;

    constructor(
        private _tpvIdleSvc: TpvIdleService,
        private _overlaySvc: OverlayService,
        private _statusBarSvc: StatusBarService,
        private _tpvStatusCheckerSvc: TpvStatusCheckerService,
        private _signalRManager: SignalRConnectionManagerService
    ) {

    }
    ngOnDestroy() {
        this.notifyClosing();
        for (const subscription of this._subscriptions) {
            this._hubProxy.off(subscription.eventName, subscription.callback);
        }
    }
    /**
   *
   * @param {ISignalRConnectionManager} connectionManager
   * @returns {ISignalRHub}
   * @memberof SignalrUpdater
   * @throws {Error} when connectionManager is null
   */
    setConnectionManager(connectionManager: ISignalRConnectionManager): SignalrUpdater {
        if (connectionManager == undefined) {
            const errorMessage: string = 'ERROR -> connectionManager parameter cannot be null';
            console.log(errorMessage);
            throw new Error(errorMessage);
        }
        this._connectionManager = connectionManager;
        return this;
    }

    init(): SignalrUpdater {
        this._hubProxy = this._connectionManager.createHubProxy('HubblePOSAppHub');
        this._subscriptions = [];
        this.addSubscription({
            eventName: 'CurrentUpdateModeStateRequested',
            callback: (param: CurrentUpdateModeArgs) => this.onCurrentUpdateModeStateRequested(param)
        });
        this.addSubscription({
            eventName: 'EnterUpdateModeRequested',
            callback: (param: EnterUpdateModeArgs) => this.onEnterUpdateModeRequested(param)
        });
        this.addSubscription({
            eventName: 'CancelUpdateModeRequested',
            callback: (param: CancelUpdateModeArgs) => this.onCancelUpdateModeRequested(param)
        });
        this.addSubscription({
            eventName: 'ShowMessageRequested',
            callback: () => this.onShowMessageRequested()
        });
        // setTimeout(() => {
        //     this.enterUpdateModeRequested();
        // }, 15000);
        return this;
    }
    notifyStarting() {
        this._createObservableFromPromise('AppNotifyStarting')
            .first().subscribe(
                () => {
                    console.log('app notify starting sent');
                },
                error => {
                    console.error(error);
                }
            );
    }
    notifyCurrentUpdateModeState(currentState: AppUpdateModeStateType) {
        this._createObservableFromPromise('AppNotifyCurrentUpdateModeState',
            { currentState }).first().subscribe(() => {
                console.log('app notify current update mode sent');
            },
                error => {
                    console.error(error);
                });
    }
    notifyUpdateModeStateChanged(oldState: AppUpdateModeStateType, newState: AppUpdateModeStateType) {
        this._createObservableFromPromise('AppNotifyUpdateModeStateChanged', {
            oldState,
            newState
        }).first().subscribe(() => {
            console.log('app notify update mode sent');
        },
            error => { console.error(error); });
    }
    notifyClosing() {
        this._createObservableFromPromise('AppNotifyClosing')
            .first().subscribe(() => {
                console.log('app notify closing sent');
            },
                error => {
                    console.error(error);
                });
    }

    private onWaitForIdle(seconds: number) {
        // si ya está en espera, no esperamos señal.

        this.notifyUpdateModeStateChanged(this._state, AppUpdateModeStateType.WaitingForCondition);
        this._state = AppUpdateModeStateType.WaitingForCondition;
        if (this._tpvIdleSvc.isInIdle) {
            this.notifyServerIsIdleState();
            return;
        }
        this._tpvIdleSvc.start(seconds);
        this._tpvIdleSvc.onIdleStart.first().subscribe(() => {
            this.notifyServerIsIdleState();
        });
    }
    private onShowMessageRequested() {

    }
    private onCurrentUpdateModeStateRequested(param: CurrentUpdateModeArgs) {
        this.notifyCurrentUpdateModeState(this._state);
    }

    private onEnterUpdateModeRequested(param: EnterUpdateModeArgs) {
        if (param != undefined && param.waitingConditionList != undefined) {
            for (const condition of param.waitingConditionList) {
                switch (condition.conditionType) {
                    case AppWaitingConditionType.WaitToSecondsInIdle:
                        const numSeconds: number = +condition.conditionData;
                        this.onWaitForIdle(numSeconds != undefined ? numSeconds : 30);
                        return;
                    case AppWaitingConditionType.WaitToLocalDateTime:
                    case AppWaitingConditionType.WaitToUserPermission:
                    default:
                        this.onWaitForIdle(30);
                        return;
                }
            }
        } else {
            this.onWaitForIdle(30);
        }
    }
    private onCancelUpdateModeRequested(param: CancelUpdateModeArgs) {
        window.location.reload(true);

    }
    private addSubscription(subscription: HubSubscription) {
        this._subscriptions.push(subscription);
        this._hubProxy.on(subscription.eventName, subscription.callback);
    }
    private notifyServerIsIdleState(): void {
        this.notifyUpdateModeStateChanged(this._state, AppUpdateModeStateType.InUpdateMode);
        this._state = AppUpdateModeStateType.InUpdateMode;
        console.log('notificacion entrada en idle');
        // establecer velo que impida acciones al tpv
        this._overlaySvc.create(10000, undefined);
        this._statusBarSvc.publishMessage('Update in process...');
        // this._overlaySvc.onClick()
        //     .first().subscribe(() => {
        //         this._overlaySvc.close(idOverlay);
        //         this._statusBarSvc.publishMessage('');
        //         this._tpvStatusCheckerSvc.startCheckingNetworkConnection();
        //         this._signalRManager.startConnection();
        //     });
        // suspender conexiones a servidor (testConectivity, signalR conections..)
        this._tpvStatusCheckerSvc.stopCheckingNetworkConnection();
        this._signalRManager.stopConnection();
    }

    private _createObservableFromPromise<T>(actionName: string, params?: any): Observable<T> {
        console.log(`Se va a llamar al método de SignalR ${actionName} con el siguiente objeto ->`);
        console.log(params);
        return Observable.create((observer: Subscriber<T>) => {
            if (params != undefined) {
                this._hubProxy.invoke(actionName, params).then(
                    (response: T) => observer.next(response),
                    failResponse => observer.error(failResponse));
            } else {
                this._hubProxy.invoke(actionName).then(
                    (response: T) => observer.next(response),
                    failResponse => observer.error(failResponse));
            }
        });
    }
}
