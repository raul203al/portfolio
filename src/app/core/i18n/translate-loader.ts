import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { ES } from './es';
import { EN } from './en';

export class InlineTranslateLoader implements TranslateLoader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTranslation(lang: string): Observable<any> {
    return of(lang === 'en' ? EN : ES);
  }
}
