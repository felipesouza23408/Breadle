import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AiResultResponse, AiService, AiUsageResponse } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { Book, BookPage, BookService } from '../../services/book.service';
import { ReadingService } from '../../services/reading.service';
import { Observable, finalize } from 'rxjs';

interface AiChatMessage {
  role: 'reader' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-book-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="reader-shell" *ngIf="book; else loading" [class.focus-mode]="focusMode">
      <header class="topbar" *ngIf="!focusMode">
        <div>
          <span class="brand">Breadle</span>
          <h1>{{ book.titulo }}</h1>
        </div>
        <nav class="nav">
          <a [routerLink]="['/books', book.id]">Detalhes</a>
          <a routerLink="/books">Acervo</a>
        </nav>
      </header>

      <section class="reader-alert" *ngIf="readerError" role="alert">
        <p>{{ readerError }}</p>
        <button type="button" (click)="loadReader()">Tentar novamente</button>
      </section>

      <section class="reader-panel" *ngIf="pages.length; else empty">
        <div class="reader-toolbar">
          <button type="button" (click)="prevPage()" [disabled]="currentPage === 0">Anterior</button>
          <span class="focus-book-title" *ngIf="focusMode">{{ book.titulo }}</span>
          <div class="page-status">
            <span>Página {{ currentPage + 1 }} de {{ pages.length }}</span>
            <progress [value]="currentPage + 1" [max]="pages.length" aria-label="Progresso neste livro"></progress>
          </div>
          <button type="button" (click)="nextPage()" [disabled]="currentPage >= pages.length - 1">Próxima</button>
          <div class="reading-tools" aria-label="Preferências de leitura">
            <button type="button" aria-label="Diminuir tamanho do texto" title="Diminuir texto"
              (click)="adjustFontSize(-0.1)" [disabled]="fontSize <= 0.95">A−</button>
            <button type="button" aria-label="Aumentar tamanho do texto" title="Aumentar texto"
              (click)="adjustFontSize(0.1)" [disabled]="fontSize >= 1.45">A+</button>
            <button type="button" (click)="focusMode = !focusMode" [attr.aria-pressed]="focusMode">
              {{ focusMode ? 'Sair do foco' : 'Modo foco' }}
            </button>
          </div>
          <span class="shortcut-hint" *ngIf="!focusMode">Atalhos: Alt + ← / → navega · Esc sai do foco</span>
        </div>

        <div class="status-row" *ngIf="sessionId">
          <span>{{ isCompleted ? 'Leitura concluída e salva' : 'Progresso salvo: ' + savedPages + ' de ' + pages.length + ' páginas' }}</span>
          <span class="resume-notice" *ngIf="resumedSession">Você retomou de onde parou.</span>
          <span class="sync-state" *ngIf="progressSyncing" role="status">Sincronizando…</span>
        </div>

        <article class="page-card" (mouseup)="captureSelectedPassage()" (touchend)="captureSelectedPassage()"
          [style.fontSize.rem]="fontSize">
          <p>{{ getCurrentPage()?.content || 'Página sem conteúdo.' }}</p>
        </article>

        <section class="ai-panel">
          <div class="ai-header">
            <div>
              <h2>Assistente de leitura</h2>
              <p class="ai-guidance">Uma ajuda para pensar junto com o texto — sem julgamentos e sem spoilers.</p>
            </div>
            <div class="ai-actions">
              <button type="button" (click)="runAiAction('summarize')" [disabled]="aiBusy || quotaExhausted">Resumir esta página</button>
              <button type="button" (click)="runAiAction('explain')" [disabled]="aiBusy || quotaExhausted || !selectedPassage"
                [attr.title]="selectedPassage ? 'Explicar o trecho selecionado' : 'Selecione uma frase no texto primeiro'">
                Explicar seleção
              </button>
              <button type="button" (click)="runAiAction('questions')" [disabled]="aiBusy || quotaExhausted">Perguntas de leitura</button>
              <button type="button" (click)="runAiAction('character-sheet')" [disabled]="aiBusy || quotaExhausted">Ficha de personagem</button>
              <button type="button" (click)="runAiAction('scenario')" [disabled]="aiBusy || quotaExhausted">Imaginar a cena</button>
            </div>
          </div>

          <label class="passage-input">
            Trecho para explicar
            <textarea [(ngModel)]="selectedPassage" name="selectedPassage" rows="2" maxlength="12000"
              placeholder="Selecione uma frase no livro ou cole aqui uma passagem que já leu."
              [disabled]="aiBusy"></textarea>
          </label>
          <p class="selection-guidance">A explicação considera apenas o trecho informado e a página aberta.</p>

          <label class="character-input">
            Nome do personagem (opcional)
            <input [(ngModel)]="characterName" name="characterName" maxlength="100"
              placeholder="Digite o nome que aparece no trecho" [disabled]="aiBusy" />
          </label>

          <div class="ai-messages" aria-live="polite" aria-relevant="additions">
            <p class="ai-empty" *ngIf="!aiMessages.length">
              Experimente uma das ajudas acima ou pergunte sobre esta página. A IA usa só o trecho aberto e as mensagens recentes.
            </p>
            <article *ngFor="let message of aiMessages" class="ai-message" [class.from-reader]="message.role === 'reader'">
              <strong>{{ message.role === 'reader' ? 'Você' : 'Assistente de leitura' }}</strong>
              <p>{{ message.content }}</p>
            </article>
            <div class="ai-output" *ngIf="aiBusy" role="status">
              <span class="ai-spinner" aria-hidden="true"></span>
              Preparando uma resposta com base no trecho lido…
            </div>
          </div>

          <div class="ai-chat">
            <textarea
              rows="3"
              [(ngModel)]="customPrompt"
              maxlength="1000"
              (keydown.control.enter)="askCustomQuestion()"
              (keydown.meta.enter)="askCustomQuestion()"
              placeholder="O que ficou confuso? Ex.: por que essa palavra chama atenção?"
              [disabled]="aiBusy"
            ></textarea>
            <button type="button" class="chat-button" (click)="askCustomQuestion()"
              [disabled]="aiBusy || quotaExhausted || !customPrompt.trim()">Perguntar</button>
          </div>
          <div class="ai-usage" *ngIf="aiUsage">
            <span>{{ aiUsage.remainingToday }} de {{ aiUsage.dailyLimit }} ajudas restantes hoje</span>
            <button type="button" class="text-button" (click)="clearAiConversation()" *ngIf="aiMessages.length">Limpar conversa</button>
          </div>
          <p class="ai-usage-error" *ngIf="aiUsageError" role="status">{{ aiUsageError }}</p>
          <p class="quota-message" *ngIf="quotaExhausted" role="status">
            Sua cota diária foi usada. Ela será renovada {{ resetLabel }}; sua leitura continua normalmente.
          </p>
        </section>
      </section>

      <ng-template #empty>
        <section class="empty-state" *ngIf="pagesLoading" role="status">Carregando as páginas...</section>
        <section class="empty-state" *ngIf="!pagesLoading && !readerError">Este livro ainda não possui conteúdo disponível para leitura.</section>
      </ng-template>
    </main>

    <ng-template #loading>
      <main class="reader-shell">
        <p class="loading-state" *ngIf="bookLoading" role="status">Carregando o livro...</p>
        <section class="empty-state" *ngIf="!bookLoading && readerError" role="alert">
          <p>{{ readerError }}</p>
          <button type="button" (click)="loadReader()">Tentar novamente</button>
        </section>
      </main>
    </ng-template>
  `,
  styles: [
    `
      :host { display: block; }
      .reader-shell {
        min-height: 100vh;
        background: radial-gradient(ellipse at 100% 0%, rgba(38, 43, 218, .17), transparent 28rem), #08080b;
        padding: clamp(1rem, 3vw, 2.5rem);
        color: #f3f0f8;
      }
      .topbar, .nav { display: flex; align-items: center; justify-content: space-between; }
      .nav { gap: 1rem; }
      .nav a { color: #d6d1de; text-decoration: none; font-weight: 700; }
      .brand { display: inline-block; background: rgba(217,173,57,.12); color: #f1d779; padding: 0.4rem 0.75rem; border-radius: 0.5rem; font-weight: 800; }
      h1 { margin: 0.8rem 0 0; }
      .reader-panel { margin-top: 2rem; }
      .reader-toolbar, .status-row {
        display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: #17171c; color: #f3f0f8; border: 1px solid rgba(255,255,255,.08); border-radius: .8rem; padding: 1rem 1.25rem; box-shadow: 0 12px 24px rgba(0,0,0,.25);
      }
      .status-row { margin-top: 1rem; }
      .reader-toolbar button, .finish-button, .ai-actions button, .chat-button {
        border: 1px solid rgba(255,255,255,.14); background: #1717cb; color: white; padding: 0.7rem 1rem; border-radius: 0.55rem; font-weight: 700; cursor: pointer;
      }
      .ai-actions button { background: #25252d; color: #e8d587; }
      .reader-toolbar button[disabled], .finish-button[disabled] { opacity: 0.45; cursor: not-allowed; }
      .page-card {
        max-width: 1000px; margin: 1.25rem auto; background: #f7f2e7; color: #25231f; border: 1px solid #d4b963; border-radius: .35rem; box-shadow: 0 14px 42px rgba(0,0,0,.4); padding: clamp(1.25rem, 4vw, 3rem); line-height: 1.95; white-space: pre-wrap; font: 1.05rem/1.95 Georgia, 'Times New Roman', serif;
      }
      .ai-panel {
        margin-top: 1.5rem; background: #141418; color: #f3f0f8; border: 1px solid rgba(255,255,255,.09); border-radius: .9rem; padding: 1.25rem; box-shadow: 0 12px 24px rgba(0,0,0,.25);
      }
      .ai-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
      .ai-header h2 { margin: 0; }
      .ai-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .ai-chat { display: grid; grid-template-columns: 1fr auto; gap: 0.75rem; margin-top: 1rem; }
      .ai-chat textarea {
        width: 100%; resize: vertical; border: 1px solid rgba(255,255,255,.14); border-radius: 0.65rem; padding: 0.8rem 1rem; color: #fff; background: #202027; font: inherit;
      }
      .ai-output {
        margin-top: 1rem; background: #202027; border: 1px solid rgba(255,255,255,.1); border-radius: 0.7rem; padding: 1rem; white-space: pre-wrap;
      }
      .ai-spinner {
        display: inline-block; width: 0.9rem; height: 0.9rem; margin-right: 0.5rem;
        border: 2px solid #b7b3c0; border-top-color: #d9ad39; border-radius: 50%;
        vertical-align: -0.15rem; animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .ai-empty {
        margin-top: 1rem; color: #aaa8b3; padding: 0.75rem 0.5rem;
      }
      .empty-state, .loading-state { background: #17171c; color: #f3f0f8; border: 1px solid rgba(255,255,255,.08); border-radius: .8rem; padding: 1.5rem; box-shadow: 0 12px 24px rgba(0,0,0,.25); }
      .reader-alert { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1rem; padding: 1rem; border: 1px solid rgba(255,190,180,.28); border-radius: .8rem; color: #ffc2bc; background: rgba(105,35,35,.18); }
      .reader-alert p { margin: 0; }
      .reader-alert button, .empty-state button { border: 1px solid rgba(217,173,57,.28); border-radius: 999px; padding: .65rem .9rem; color: #f1d779; background: rgba(217,173,57,.1); font: inherit; font-weight: 700; cursor: pointer; }
      @media (max-width: 640px) { .reader-toolbar, .status-row, .ai-header, .ai-chat { flex-direction: column; } .ai-chat { display: flex; } }
    `,
  ],
})
export class BookReaderComponent implements OnInit {
  book: Book | null = null;
  pages: BookPage[] = [];
  currentPage = 0;
  private userId: number | null = null;
  sessionId: number | null = null;
  isCompleted = false;
  savedPages = 0;
  resumedSession = false;
  progressSyncing = false;
  private pendingProgressUpdates = 0;
  private sessionResolutionStarted = false;
  bookLoading = true;
  pagesLoading = true;
  readerError = '';
  aiBusy = false;
  customPrompt = '';
  aiUsage: AiUsageResponse | null = null;
  aiUsageError = '';
  aiMessages: AiChatMessage[] = [];
  selectedPassage = '';
  characterName = '';
  focusMode = false;
  fontSize = 1.08;

  get quotaExhausted(): boolean {
    return this.aiUsage !== null && this.aiUsage.remainingToday <= 0;
  }

  get resetLabel(): string {
    if (!this.aiUsage?.resetsAt) {
      return 'amanhã';
    }
    const reset = new Date(this.aiUsage.resetsAt);
    const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(reset);
    const today = new Date();
    const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const localResetDay = new Date(reset.getFullYear(), reset.getMonth(), reset.getDate()).getTime();
    const daysUntilReset = Math.round((localResetDay - localToday) / 86_400_000);
    const dayLabel = daysUntilReset <= 0 ? 'hoje' : daysUntilReset === 1 ? 'amanhã' : 'em breve';
    return `${dayLabel} às ${time}`;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private authService: AuthService,
    private readingService: ReadingService,
    private aiService: AiService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadAiUsage();
    this.loadReader();
  }

  @HostListener('document:keydown', ['$event'])
  handleReaderShortcuts(event: KeyboardEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, textarea, button, select, [contenteditable="true"]')) {
      return;
    }
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prevPage();
    } else if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextPage();
    } else if (event.key === 'Escape' && this.focusMode) {
      this.focusMode = false;
    }
  }

  adjustFontSize(change: number): void {
    this.fontSize = Math.min(1.45, Math.max(0.95, Number((this.fontSize + change).toFixed(2))));
  }

  captureSelectedPassage(): void {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length >= 3 && selection.length <= 12_000) {
      this.selectedPassage = selection;
    }
  }

  loadReader(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bookLoading = true;
    this.pagesLoading = true;
    this.readerError = '';
    this.sessionResolutionStarted = false;
    this.sessionId = null;
    this.savedPages = 0;
    this.resumedSession = false;
    this.pendingProgressUpdates = 0;
    this.progressSyncing = false;
    this.authService.me().subscribe({
      next: (profile) => {
        this.userId = profile.id;
        this.startSessionIfReady(id);
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.userId = null;
        this.readerError = 'Não foi possível verificar sua conta para salvar o progresso.';
        this.changeDetector.markForCheck();
      },
    });

    this.bookService.getBook(id).subscribe({
      next: (book) => {
        this.book = book;
        this.bookLoading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.book = null;
        this.bookLoading = false;
        this.readerError = 'Não foi possível carregar este livro do acervo.';
        this.changeDetector.markForCheck();
      },
    });

    this.bookService.getBookPages(id).subscribe({
      next: (pages) => {
        this.pages = pages;
        this.currentPage = 0;
        this.pagesLoading = false;
        if (!pages.length) {
          this.readerError = 'O conteúdo deste livro ainda não está disponível no servidor.';
        }
        this.startSessionIfReady(id);
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.pages = [];
        this.currentPage = 0;
        this.pagesLoading = false;
        this.readerError = 'Não foi possível carregar as páginas deste livro.';
        this.changeDetector.markForCheck();
      },
    });
  }

  getCurrentPage(): BookPage | undefined {
    return this.pages[this.currentPage];
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage -= 1;
      this.selectedPassage = '';
      this.syncProgress();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.pages.length - 1) {
      this.currentPage += 1;
      this.selectedPassage = '';
      this.syncProgress();
    }
  }

  private startSessionIfReady(bookId: number): void {
    if (
      !this.book
      || !this.pages.length
      || !this.userId
      || this.sessionId
      || this.sessionResolutionStarted
    ) {
      return;
    }

    this.sessionResolutionStarted = true;
    this.readingService.listMySessions().subscribe({
      next: (sessions) => {
        const activeSession = sessions.find((session) =>
          session.bookId === bookId
          && session.status === 'ACTIVE'
          && session.pagesDefined === this.pages.length,
        );
        if (activeSession) {
          this.sessionId = activeSession.id;
          this.savedPages = activeSession.pagesRead;
          this.currentPage = Math.min(
            Math.max(activeSession.pagesRead - 1, 0),
            this.pages.length - 1,
          );
          this.resumedSession = activeSession.pagesRead > 0;
          if (activeSession.pagesRead >= this.pages.length) {
            this.syncProgress();
          }
          this.changeDetector.markForCheck();
          return;
        }

        this.createReadingSession(bookId);
      },
      error: () => {
        this.sessionResolutionStarted = false;
        this.readerError = 'Não foi possível verificar seu progresso anterior. Tente novamente para retomar a leitura com segurança.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private createReadingSession(bookId: number): void {
    if (!this.userId) {
      return;
    }

    this.readingService.createSession({
        userId: this.userId,
        bookId: bookId,
        pagesDefined: this.pages.length,
    }).subscribe({
      next: (session) => {
        this.sessionId = session.id;
        this.savedPages = session.pagesRead;
        this.isCompleted = session.status === 'COMPLETED';
        this.resumedSession = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.sessionId = null;
        this.sessionResolutionStarted = false;
        this.readerError = 'A leitura foi carregada, mas não foi possível sincronizar seu progresso.';
        this.changeDetector.markForCheck();
      },
    });
  }

  runAiAction(action: 'summarize' | 'explain' | 'questions' | 'character-sheet' | 'scenario'): void {
    if (this.aiBusy || this.quotaExhausted) {
      return;
    }

    const currentPageText = this.getCurrentPage()?.content ?? '';
    const context = JSON.stringify({
      livro: this.book?.titulo ?? 'Leitura em andamento',
      pagina: this.currentPage + 1,
      trechoAberto: currentPageText,
    });
    let request: Observable<AiResultResponse>;
    let errorMessage: string;
    let readerPrompt: string;

    switch (action) {
      case 'summarize':
        request = this.aiService.summarize(currentPageText);
        errorMessage = 'Não foi possível gerar o resumo no momento.';
        readerPrompt = `Faça uma síntese da página ${this.currentPage + 1}.`;
        break;
      case 'explain':
        if (!this.selectedPassage) {
          return;
        }
        request = this.aiService.explainPassage(this.selectedPassage, context);
        errorMessage = 'Não foi possível explicar o trecho no momento.';
        readerPrompt = 'Ajude-me a compreender o trecho que selecionei.';
        break;
      case 'questions':
        request = this.aiService.generateQuestions(this.book?.titulo ?? 'Leitura em andamento', currentPageText);
        errorMessage = 'Não foi possível gerar perguntas de compreensão.';
        readerPrompt = `Crie perguntas apenas sobre o trecho da página ${this.currentPage + 1}.`;
        break;
      case 'character-sheet':
        request = this.aiService.generateCharacterSheet(this.characterName, currentPageText);
        errorMessage = 'Não foi possível gerar a ficha do personagem.';
        readerPrompt = this.characterName.trim()
          ? `Ajude-me a observar o personagem ${this.characterName.trim()} neste trecho.`
          : 'Ajude-me a observar os personagens que aparecem neste trecho.';
        break;
      case 'scenario':
        request = this.aiService.simulateScenario(currentPageText, context);
        errorMessage = 'Não foi possível simular o cenário.';
        readerPrompt = 'Ajude-me a imaginar possibilidades para esta cena, sem tratar hipóteses como fatos.';
        break;
      default:
        return;
    }

    this.requestAiResponse(request, errorMessage, readerPrompt);
  }

  askCustomQuestion(): void {
    if (this.aiBusy || this.quotaExhausted) {
      return;
    }

    const prompt = this.customPrompt.trim();
    if (!prompt) {
      return;
    }

    const recentConversation = this.aiMessages.slice(-6);
    const context = JSON.stringify({
      livro: this.book?.titulo ?? 'Leitura em andamento',
      paginaAtual: this.currentPage + 1,
      trechoAtual: this.getCurrentPage()?.content.slice(0, 5_000) ?? '',
      conversaRecente: recentConversation,
    });
    this.customPrompt = '';
    this.aiMessages = [...this.aiMessages, { role: 'reader', content: prompt }];
    this.aiBusy = true;
    this.changeDetector.markForCheck();
    this.aiService.chat(prompt, context).pipe(
      finalize(() => {
        this.aiBusy = false;
        this.changeDetector.markForCheck();
      }),
    ).subscribe({
      next: (response) => this.appendAiResponse(response),
      error: (error: unknown) => {
        this.customPrompt = prompt;
        this.appendAiError(error, 'Não foi possível responder agora.');
      },
    });
  }

  private requestAiResponse(
    request: Observable<AiResultResponse>,
    errorMessage: string,
    readerPrompt: string,
  ): void {
    this.aiBusy = true;
    this.aiMessages = [...this.aiMessages, { role: 'reader', content: readerPrompt }];
    request.pipe(finalize(() => {
      this.aiBusy = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: (response) => this.appendAiResponse(response),
      error: (error: unknown) => this.appendAiError(error, errorMessage),
    });
  }

  clearAiConversation(): void {
    this.aiMessages = [];
  }

  private loadAiUsage(): void {
    this.aiService.getUsage().subscribe({
      next: (usage) => {
        this.updateAiUsage(usage);
        this.aiUsageError = '';
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.aiUsageError = error instanceof HttpErrorResponse && error.status === 404
          ? 'O backend está desatualizado. Reinicie o backend para aplicar as melhorias e a cota diária da IA.'
          : error instanceof Error
          ? error.message
          : 'Não foi possível consultar sua cota agora; o servidor ainda a verificará ao enviar uma pergunta.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private appendAiResponse(response: AiResultResponse): void {
    this.updateAiUsage(response);
    this.aiUsageError = '';
    this.aiMessages = [...this.aiMessages, { role: 'assistant', content: response.result }];
    this.changeDetector.markForCheck();
  }

  private appendAiError(error: unknown, fallbackMessage: string): void {
    const httpError = error instanceof HttpErrorResponse ? error : null;
    const message = error instanceof Error && !httpError
      ? error.message
      : httpError?.status === 429
        ? httpError.error?.message ?? 'Sua cota diária do assistente foi usada. Tente novamente amanhã.'
        : httpError?.status === 0
        ? 'Não consegui conectar ao assistente. Confira sua conexão e tente de novo.'
        : httpError?.status === 404
          ? 'O backend está desatualizado. Reinicie o backend para aplicar as melhorias e a cota diária da IA.'
          : httpError?.status === 400 && httpError.error?.message
            ? httpError.error.message
            : fallbackMessage;
    if (httpError?.status === 429 && this.aiUsage) {
        this.aiUsage = { ...this.aiUsage, remainingToday: 0 };
    }
    this.aiMessages = [...this.aiMessages, { role: 'assistant', content: message }];
    this.changeDetector.markForCheck();
  }

  private updateAiUsage(usage: AiUsageResponse): void {
    if (!this.aiUsage || usage.usedToday >= this.aiUsage.usedToday) {
      this.aiUsage = usage;
    }
  }

  private syncProgress(): void {
    if (!this.sessionId) {
      return;
    }

    const pagesRead = Math.min(this.currentPage + 1, this.pages.length);
    this.pendingProgressUpdates += 1;
    this.progressSyncing = true;
    this.readingService.updateProgress(this.sessionId, {
      pagesRead,
      excerptHash: this.book?.titulo ?? null,
    }).subscribe({
      next: (session) => {
        this.isCompleted = session.status === 'COMPLETED';
        this.savedPages = session.pagesRead;
        this.pendingProgressUpdates = Math.max(0, this.pendingProgressUpdates - 1);
        this.progressSyncing = this.pendingProgressUpdates > 0;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.pendingProgressUpdates = Math.max(0, this.pendingProgressUpdates - 1);
        this.progressSyncing = this.pendingProgressUpdates > 0;
        this.readerError = 'Não foi possível sincronizar o progresso desta página.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
