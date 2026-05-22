import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { AdminStats, AdminUser, AdminSession, SqlView } from '../../models/session.model';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';

type Tab = 'users' | 'sessions' | 'export';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, ConfirmDialog],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  private svc = inject(SessionService);

  tab = signal<Tab>('users');
  stats = signal<AdminStats | null>(null);
  users = signal<AdminUser[]>([]);
  sessions = signal<AdminSession[]>([]);
  views = signal<(SqlView & { description?: string })[]>([]);

  userSearch = signal('');
  sessionSearch = signal('');
  loading = signal(true);
  exportLoading = signal('');
  error = signal('');
  actionError = signal('');
  previewError = signal('');
  exportErrors = signal<Record<string, string>>({});
  dialog = signal<{ title: string; message: string; onConfirm: () => void } | null>(null);

  previewKey = signal('');
  previewRows = signal<any[]>([]);
  previewLoading = signal(false);
  previewColumns = computed(() => this.previewRows().length ? Object.keys(this.previewRows()[0]) : []);
  activeView = computed(() => this.views().find((v) => v.key === this.previewKey()) ?? null);

  private viewCache = new Map<string, any[]>();

  filteredUsers = computed(() => {
    const q = this.userSearch().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.program.toLowerCase().includes(q)
    );
  });

  filteredSessions = computed(() => {
    const q = this.sessionSearch().toLowerCase();
    if (!q) return this.sessions();
    return this.sessions().filter(
      (s) =>
        s.courseCode.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.owner.name.toLowerCase().includes(q) ||
        s.owner.email.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.svc.getAdminStats().subscribe({ next: (s) => this.stats.set(s) });
    this.svc.getAdminUsers().subscribe({
      next: (u) => { this.users.set(u); this.loading.set(false); },
      error: () => { this.error.set('Failed to load data'); this.loading.set(false); },
    });
    this.svc.getAdminSessions().subscribe({ next: (s) => this.sessions.set(s) });
    this.svc.getAdminViews().subscribe({ next: (v) => this.views.set(v) });
  }

  deleteUser(id: string, name: string) {
    this.dialog.set({
      title: 'Delete user',
      message: `Delete "${name}"? All their owned sessions and messages will also be removed. This cannot be undone.`,
      onConfirm: () => {
        this.actionError.set('');
        this.svc.deleteAdminUser(id).subscribe({
          next: () => this.users.update((u) => u.filter((x) => x.id !== id)),
          error: () => this.actionError.set(`Failed to delete user "${name}"`),
        });
      },
    });
  }

  deleteSession(id: string, code: string) {
    this.dialog.set({
      title: 'Delete session',
      message: `Delete the "${code}" session? Its chat messages will also be removed. This cannot be undone.`,
      onConfirm: () => {
        this.actionError.set('');
        this.svc.deleteAdminSession(id).subscribe({
          next: () => this.sessions.update((s) => s.filter((x) => x.id !== id)),
          error: () => this.actionError.set(`Failed to delete session "${code}"`),
        });
      },
    });
  }

  confirmDialog() { this.dialog()?.onConfirm(); this.dialog.set(null); }
  cancelDialog()  { this.dialog.set(null); }

  previewView(view: SqlView) {
    if (this.previewKey() === view.key) { this.closePreview(); return; }
    this.previewKey.set(view.key);
    this.previewError.set('');
    if (this.viewCache.has(view.key)) {
      this.previewRows.set(this.viewCache.get(view.key)!);
      return;
    }
    this.previewLoading.set(true);
    this.previewRows.set([]);
    this.svc.runAdminView(view.key).subscribe({
      next: (rows) => { this.viewCache.set(view.key, rows); this.previewRows.set(rows); this.previewLoading.set(false); },
      error: (err) => {
        this.previewLoading.set(false);
        const detail = err?.error?.detail ?? err?.error?.error ?? '';
        this.previewError.set(`Failed to load view${detail ? ': ' + detail : ''}`);
      },
    });
  }

  closePreview() { this.previewKey.set(''); this.previewRows.set([]); this.previewError.set(''); }

  exportCsv(view: SqlView) {
    this.exportErrors.update((e) => ({ ...e, [view.key]: '' }));
    if (this.viewCache.has(view.key)) { this.triggerDownload(view.key, this.viewCache.get(view.key)!); return; }
    this.exportLoading.set(view.key);
    this.svc.runAdminView(view.key).subscribe({
      next: (rows) => { this.viewCache.set(view.key, rows); this.exportLoading.set(''); this.triggerDownload(view.key, rows); },
      error: (err) => {
        this.exportLoading.set('');
        const detail = err?.error?.detail ?? err?.error?.error ?? '';
        this.exportErrors.update((e) => ({ ...e, [view.key]: `Export failed${detail ? ': ' + detail : ''}` }));
      },
    });
  }

  private triggerDownload(key: string, rows: any[]) {
    if (!rows.length) {
      this.exportErrors.update((e) => ({ ...e, [key]: 'No data to export' }));
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = headers.join(',') + '\n' + rows.map((r: any) => headers.map((h) => escape(r[h])).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  cellValue(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-CA', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  duration(start: string, end: string) {
    const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${mins}m`;
  }

  yearLabel(y: number) {
    return y ? `Year ${y}` : '—';
  }
}
