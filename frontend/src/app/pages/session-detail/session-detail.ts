import {
  Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { StudySession, ChatMessage } from '../../models/session.model';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';


@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, ConfirmDialog],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.css',
})
export class SessionDetail implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  auth = inject(AuthService);

  @ViewChild('chatScroll') chatScroll!: ElementRef<HTMLDivElement>;

  session = signal<StudySession | null>(null);
  loading = signal(true);
  error = signal('');
  actionLoading = signal(false);
  dialog = signal<{ title: string; message: string; onConfirm: () => void } | null>(null);

  messages = signal<ChatMessage[]>([]);
  messageInput = '';
  sendingMessage = signal(false);
  private pollInterval?: ReturnType<typeof setInterval>;
  private shouldScrollToBottom = false;

  isParticipant = computed(() => {
    const uid = this.auth.currentUser()?.id;
    return !!uid && (this.session()?.participants ?? []).some((p) => p.id === uid);
  });

  isOwner = computed(() => {
    const uid = this.auth.currentUser()?.id;
    return !!uid && this.session()?.owner.id === uid;
  });


  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.sessionService.getSession(id).subscribe({
      next: (s) => { this.session.set(s); this.loading.set(false); this.startChat(id); },
      error: () => { this.error.set('Session not found.'); this.loading.set(false); },
    });
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollChatToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private startChat(sessionId: string) {
    this.loadMessages(sessionId);
    this.pollInterval = setInterval(() => this.pollMessages(sessionId), 4000);
  }

  private loadMessages(sessionId: string) {
    this.sessionService.getMessages(sessionId).subscribe({
      next: (msgs) => { this.messages.set(msgs); this.shouldScrollToBottom = true; },
    });
  }

  private pollMessages(sessionId: string) {
    const last = this.messages().at(-1)?.createdAt;
    this.sessionService.getMessages(sessionId, last).subscribe({
      next: (msgs) => {
        if (msgs.length) {
          this.messages.update((m) => [...m, ...msgs]);
          this.shouldScrollToBottom = true;
        }
      },
    });
  }

  private scrollChatToBottom() {
    const el = this.chatScroll?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  sendMessage() {
    const content = this.messageInput.trim();
    if (!content || this.sendingMessage()) return;
    this.sendingMessage.set(true);
    this.sessionService.sendMessage(this.session()!.id, content).subscribe({
      next: (msg) => {
        this.messages.update((m) => [...m, msg]);
        this.messageInput = '';
        this.sendingMessage.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => this.sendingMessage.set(false),
    });
  }

  onMessageKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  join() {
    this.actionLoading.set(true);
    this.sessionService.joinSession(this.session()!.id).subscribe({
      next: (s) => { this.session.set(s); this.actionLoading.set(false); },
      error: () => this.actionLoading.set(false),
    });
  }

  leave() {
    this.actionLoading.set(true);
    this.sessionService.leaveSession(this.session()!.id).subscribe({
      next: (s) => { this.session.set(s); this.actionLoading.set(false); },
      error: () => this.actionLoading.set(false),
    });
  }

  deleteSession() {
    const s = this.session()!;
    this.dialog.set({
      title: 'Delete session',
      message: `Delete "${s.courseCode} — ${s.description.slice(0, 80)}${s.description.length > 80 ? '…' : ''}"? Its chat messages will also be removed. This cannot be undone.`,
      onConfirm: () => this.sessionService.deleteSession(s.id).subscribe({ next: () => this.router.navigate(['/sessions']) }),
    });
  }

  confirmDialog() { this.dialog()?.onConfirm(); this.dialog.set(null); }
  cancelDialog()  { this.dialog.set(null); }

  formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatMsgTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  duration(start: string, end: string) {
    const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${mins}m`;
  }

  isMine(msg: ChatMessage): boolean {
    return msg.author.id === this.auth.currentUser()?.id;
  }

  participantTip(p: { name: string; program: string; year: number }): string | null {
    const parts: string[] = [];
    if (p.program) parts.push(p.program);
    if (p.year >= 1) parts.push(`Year ${p.year}`);
    return parts.length ? parts.join(' · ') : null;
  }
}
