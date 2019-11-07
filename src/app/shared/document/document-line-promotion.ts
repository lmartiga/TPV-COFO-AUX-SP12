export interface DocumentLinePromotion {
    promotionId: string;
    description: string;
    discountAmountWithTax: number;
    numberOfTimesApplied: number;
    referredLineNumber: number;
    timesApplied?: Array<any>;
    amountPerUnitInTheInPromo?:  Array<any>;
}
