import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DashboardComponent } from './dashboard';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose 6 frontend technologies', () => {
    expect(component.frontendTech.length).toBe(6);
  });

  it('should expose 4 backend technologies', () => {
    expect(component.backendTech.length).toBe(4);
  });

  it('should expose 4 devops technologies', () => {
    expect(component.devopsTech.length).toBe(4);
  });

  it('isIntroFinished should start false when PLATFORM_ID is server', () => {
    expect(component.isIntroFinished()).toBe(false);
  });

  it('isZoomedOut should start false', () => {
    expect(component.isZoomedOut()).toBe(false);
  });

  it('all frontend tech entries should have name and icon', () => {
    component.frontendTech.forEach(tech => {
      expect(tech.name).toBeTruthy();
      expect(tech.icon).toBeTruthy();
    });
  });

  it('all backend tech entries should have name and icon', () => {
    component.backendTech.forEach(tech => {
      expect(tech.name).toBeTruthy();
      expect(tech.icon).toBeTruthy();
    });
  });
});
