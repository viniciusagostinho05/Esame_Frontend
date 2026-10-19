import { HttpInterceptorFn } from '@angular/common/http';
import { JwtService } from '../services/jwt.service';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authToken = inject(JwtService).getToken();

  if (authToken) {
    const newReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`),
    });
    return next(newReq);
  } else {
    return next(req);
  } 
};
