import { Directive, effect, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[ifAuthenticated]'
})
export class IfAuthenticatedDirective {
  private authSrv = inject(AuthService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      // mostro e nascondo ogni volta che isAuthenticated cambia
      this.updateView(this.authSrv.isAuthenticated());
    });
  }

  private updateView(show: boolean) {
    if (show) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
