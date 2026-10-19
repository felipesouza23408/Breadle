import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      const isLoginRequest = request.url.includes('/api/auth/login');
      if (error instanceof HttpErrorResponse
        && error.status === 401
        && request.headers.has('Authorization')
        && !isLoginRequest) {
        authService.logout();
        void router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
      }

      return throwError(() => error);
    }),
  );
};
