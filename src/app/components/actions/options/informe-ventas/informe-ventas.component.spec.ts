/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { InformeVentasComponent } from './informe-ventas.component';

describe('InformeVentasComponent', () => {
  let component: InformeVentasComponent;
  let fixture: ComponentFixture<InformeVentasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InformeVentasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InformeVentasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
