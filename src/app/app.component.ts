import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Link, SnipApiService } from './snip-api.service';

const httpUrlValidator: ValidatorFn = (control): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { httpUrl: true };
  } catch {
    return { httpUrl: true };
  }
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly api = inject(SnipApiService);

  readonly title = 'Snip';
  readonly links = signal<Link[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly listError = signal('');
  readonly formError = signal('');
  readonly createdLink = signal<Link | null>(null);

  readonly form = new FormGroup({
    url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, httpUrlValidator]
    })
  });

  get urlControl(): FormControl<string> {
    return this.form.controls.url;
  }

  ngOnInit(): void {
    this.refreshLinks();
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    this.formError.set('');
    this.createdLink.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.api.createLink(this.urlControl.value.trim())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (link) => {
          this.createdLink.set(link);
          this.form.reset();
          this.refreshLinks();
        },
        error: (error: unknown) => this.formError.set(this.getErrorMessage(error))
      });
  }

  refreshLinks(): void {
    this.loading.set(true);
    this.listError.set('');
    this.api.getLinks()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (links) => this.links.set(links),
        error: (error: unknown) => this.listError.set(this.getErrorMessage(error))
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const serverMessage = error.error?.error;
      if (typeof serverMessage === 'string' && serverMessage.trim()) {
        return serverMessage;
      }

      if (error.status === 0) {
        return 'Could not reach the Snip API. Check that the backend is running and try again.';
      }
    }

    return 'Something went wrong. Please try again.';
  }
}
