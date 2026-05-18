import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private introPlayed = signal<boolean>(false);

  setIntroPlayed(value: boolean) {
    this.introPlayed.set(value);
  }

  hasIntroPlayed() {
    return this.introPlayed();
  }
}
