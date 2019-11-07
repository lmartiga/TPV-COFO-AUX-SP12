import { Directive} from '@angular/core';
import { NgModel } from '@angular/forms';


@Directive({
    selector: '[tpvNumberValidation]',
    providers: [NgModel],
    exportAs: 'tpvNumberValidation'
})
export class NumberValidationDirective {
    _allowedChars: string [] = [];
    constructor(private model: NgModel) {
        this._allowedChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ','];
    }
    set myInput(value: string) {
        value += '';
        const lastChar = value.slice(-1);
        if (!this._allowedChars.includes(lastChar) && lastChar !== '') {
            const valueWithoutLastChar = value.slice(0, -1);
            this.model.valueAccessor.writeValue(valueWithoutLastChar);
            console.log('es un valor no valido:' + lastChar);
        }
    }
}
