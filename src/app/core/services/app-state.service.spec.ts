import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppStateService } from './app-state.service';

describe('AppStateService', () => {
  let service: AppStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('hasIntroPlayed() should return false initially', () => {
    expect(service.hasIntroPlayed()).toBe(false);
  });

  it('hasIntroPlayed() should return true after setIntroPlayed(true)', () => {
    service.setIntroPlayed(true);
    expect(service.hasIntroPlayed()).toBe(true);
  });

  it('hasIntroPlayed() should return false after setIntroPlayed(false)', () => {
    service.setIntroPlayed(true);
    service.setIntroPlayed(false);
    expect(service.hasIntroPlayed()).toBe(false);
  });
});
