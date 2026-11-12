import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AppComponent } from './app.component';
import { Link, SnipApiService } from './snip-api.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let api: jasmine.SpyObj<SnipApiService>;

  const link: Link = {
    code: 'a1B2c3',
    url: 'https://example.com/a-long-page',
    shortUrl: 'http://localhost:3000/a1B2c3',
    hits: 0,
    createdAt: '2026-11-12T08:00:00.000Z'
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<SnipApiService>('SnipApiService', ['createLink', 'getLinks']);
    api.getLinks.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: SnipApiService, useValue: api }]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('rejects non-http URLs without calling the API', () => {
    component.form.controls.url.setValue('javascript:alert(1)');

    component.submit();

    expect(component.form.controls.url.invalid).toBeTrue();
    expect(api.createLink).not.toHaveBeenCalled();
  });

  it('shows the created short link and refreshes the list on success', () => {
    api.createLink.and.returnValue(of(link));
    api.getLinks.and.returnValue(of([link]));
    component.form.controls.url.setValue(link.url);

    component.submit();
    fixture.detectChanges();

    expect(api.createLink).toHaveBeenCalledWith(link.url);
    expect(component.createdLink()).toEqual(link);
    expect(component.links()).toEqual([link]);
    expect(fixture.nativeElement.textContent).toContain(link.shortUrl);
  });

  it('shows the backend validation error inline', () => {
    api.createLink.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { error: 'URL must use http or https' }
    })));
    component.form.controls.url.setValue(link.url);

    component.submit();
    fixture.detectChanges();

    expect(component.formError()).toBe('URL must use http or https');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('URL must use http or https');
  });
});
