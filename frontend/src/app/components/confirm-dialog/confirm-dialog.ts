import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="backdrop" (click)="onBackdrop($event)">
      <div class="dialog" role="alertdialog" [attr.aria-label]="title">
        <h3 class="dialog-title">{{ title }}</h3>
        <p class="dialog-message">{{ message }}</p>
        <div class="dialog-actions">
          <button class="btn-cancel" (click)="cancelled.emit()">Cancel</button>
          <button class="btn-confirm" [class.btn-danger]="danger" (click)="confirmed.emit()">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fade-in 0.1s ease;
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    .dialog {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--r);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      width: 100%;
      max-width: 400px;
      margin: 1rem;
      animation: slide-up 0.12s ease;
    }
    @keyframes slide-up {
      from { transform: translateY(10px); opacity: 0; }
      to   { transform: none; opacity: 1; }
    }

    .dialog-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 0.5rem;
    }

    .dialog-message {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin: 0 0 1.25rem;
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn-cancel {
      padding: 0.5rem 1rem;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--r-sm);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      font-family: inherit;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-cancel:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    .btn-confirm {
      padding: 0.5rem 1.1rem;
      background: var(--color-primary);
      border: none;
      border-radius: var(--r-sm);
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }
    .btn-confirm:hover { background: var(--color-primary-dark); }

    .btn-danger { background: #dc2626; }
    .btn-danger:hover { background: #b91c1c; }
  `],
})
export class ConfirmDialog {
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Delete';
  @Input() danger = true;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() { this.cancelled.emit(); }

  onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.cancelled.emit();
  }
}
