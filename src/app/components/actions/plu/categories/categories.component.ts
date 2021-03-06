import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { PluItem } from 'app/shared/plu/plu-item';
import { Subscription } from 'rxjs/Subscription';
import { DocumentSeriesService } from 'app/services/document/document-series.service';

@Component({
  selector: 'tpv-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit, OnDestroy {

  @Input() showSearchResult: boolean;
  @Input() pluItems: Array<PluItem>;
  @Output() productSelected: EventEmitter<string> = new EventEmitter();

  // Productos que se muestran actualmente en la PLU
  currentPLUItem: PluItem;
  activeCleanSubscription: Subscription = {} as Subscription;

  constructor(
    private _documentSeriesService: DocumentSeriesService
  ) {
  }

  ngOnInit() {
    this.actionCleanCategories();
  }


  setCurrentPLUItem(index: number) {
    // compruebo que le pluItems este dentro del rango
    if (index >= 0 || index <= this.pluItems.length) {
      this.currentPLUItem = this.pluItems[index];
    }
  }

  cleanCurrentPLUItem() {
    this.currentPLUItem = undefined;
  }

  isVoidCurrentPLUItem(): boolean {
    if (this.currentPLUItem == undefined) {
      return true;
    }
    return false;
  }

  getColorString(index: number) {
    if (this.pluItems[index].color !== undefined) {
      return 'rgb(' + this.pluItems[index].color.r + ', ' + this.pluItems[index].color.g + ', ' + this.pluItems[index].color.b + ')';
    } else {
      return 'rgb(255, 255, 255)';
    }
  }

  onSelectedProductById(id: string) {
    this.productSelected.emit(id);
  }

  actionCleanCategories() {
    this.activeCleanSubscription = this._documentSeriesService
    .createCleanCategories()
    .subscribe(
    (data) => {
      this.cleanCurrentPLUItem();
    });
  }

  ngOnDestroy() {
  if (this.activeCleanSubscription) {
      this.activeCleanSubscription.unsubscribe();
    }
  }
}
