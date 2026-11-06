import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AiResultResponse,
  AiService,
  AiUsageResponse,
} from '../../services/ai.service';
import type {
  AssessmentAnswer,
  AssessmentQuestion,
  ReadingAssessment,
} from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { Book, BookPage, BookService } from '../../services/book.service';
import { ReadingService } from '../../services/reading.service';
import { Observable, concatMap, finalize, from } from 'rxjs';

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
          <button type="button" (click)="prevPage()" [disabled]="currentPage === 0 || pageOpening">Anterior</button>
          <span class="focus-book-title" *ngIf="focusMode">{{ book.titulo }}</span>
          <div class="page-status">
            <span>Página {{ currentPage + 1 }} de {{ pages.length }}</span>
            <progress [value]="currentPage + 1" [max]="pages.length" aria-label="Progresso neste livro"></progress>
          </div>
          <button type="button" (click)="nextPage()" [disabled]="currentPage >= pages.length - 1 || pageOpening">Próxima</button>
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
          <button type="button" *ngIf="hasPendingProgress" (click)="retryPendingProgress()">Tentar sincronizar novamente</button>
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
            <label class="visually-hidden" for="reader-question">Pergunta sobre a leitura</label>
            <textarea
              id="reader-question"
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

          <section class="assessment-panel" aria-labelledby="assessment-title">
            <div class="assessment-heading">
              <div>
                <h3 id="assessment-title">Quiz da sessão</h3>
                <p>Três perguntas com base somente nas páginas que você abriu nesta sessão.</p>
              </div>
              <button type="button" (click)="generateSessionAssessment()"
                [disabled]="quizLoading || !sessionId || pageOpening">
                {{ assessment ? 'Reabrir quiz' : 'Gerar quiz' }}
              </button>
            </div>
            <p *ngIf="quizLoading" role="status" aria-live="polite">Preparando as perguntas das páginas registradas…</p>
            <p *ngIf="quizError" class="assessment-error" role="alert">{{ quizError }}</p>
            <p *ngIf="!assessment && !quizLoading && !quizError" class="assessment-empty">
              Abra pelo menos uma página da sessão para criar uma avaliação.
            </p>
            <div *ngIf="assessment" class="assessment-content">
              <p class="assessment-pages">Base da avaliação: páginas {{ assessment.pages.join(', ') }}.</p>
              <ng-container *ngIf="currentAssessmentQuestion as question; else assessmentFinished">
                <div class="assessment-progress" aria-live="polite">
                  Pergunta {{ currentAssessmentIndex + 1 }} de {{ assessment.questions.length }}
                  · {{ assessmentDifficultyLabel(question.difficulty) }}
                </div>
                <h4>{{ question.prompt }}</h4>
                <fieldset *ngIf="question.type === 'MULTIPLE_CHOICE'" class="assessment-options"
                  [disabled]="!!currentAssessmentResult || quizAnswerLoading">
                  <legend class="visually-hidden">Escolha uma alternativa</legend>
                  <label *ngFor="let option of question.options; let optionIndex = index">
                    <input type="radio" name="assessment-option" [value]="optionIndex"
                      [(ngModel)]="selectedAssessmentOption" />
                    <span>{{ option }}</span>
                  </label>
                </fieldset>
                <label *ngIf="question.type !== 'MULTIPLE_CHOICE'" class="assessment-answer">
                  <span>Sua resposta</span>
                  <textarea [(ngModel)]="assessmentAnswer" [name]="'assessment-answer-' + question.id"
                    rows="3" maxlength="2000" placeholder="Escreva com suas palavras e, na inferência, indique uma pista do texto."
                    [disabled]="!!currentAssessmentResult || quizAnswerLoading"></textarea>
                </label>
                <button *ngIf="!currentAssessmentResult" type="button" class="assessment-submit"
                  (click)="submitAssessmentAnswer()"
                  [disabled]="quizAnswerLoading || !canSubmitAssessmentAnswer(question)">
                  {{ quizAnswerLoading ? 'Conferindo…' : 'Enviar resposta' }}
                </button>
                <div *ngIf="currentAssessmentResult" class="assessment-feedback" aria-live="polite" role="status">
                  <strong>{{ currentAssessmentResult.correct ? 'Boa leitura!' : 'Vamos observar outra pista.' }}</strong>
                  <p>{{ currentAssessmentResult.feedback }}</p>
                  <button type="button" (click)="nextAssessmentQuestion()">
                    {{ currentAssessmentIndex + 1 < assessment.questions.length ? 'Próxima pergunta' : 'Ver revisão' }}
                  </button>
                </div>
              </ng-container>
              <ng-template #assessmentFinished>
                <p class="assessment-finished" role="status">Você concluiu as perguntas. O quiz não altera seus pontos de leitura.</p>
                <section *ngIf="incorrectAssessmentResults.length" class="assessment-review" aria-label="Revisão das respostas">
                  <h4>Revisão para continuar aprendendo</h4>
                  <article *ngFor="let result of incorrectAssessmentResults">
                    <strong>{{ assessmentQuestionFor(result.questionId)?.prompt }}</strong>
                    <p>{{ result.feedback }}</p>
                  </article>
                </section>
              </ng-template>
            </div>
          </section>
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
  private retryingPendingProgress = false;
  private sessionResolutionStarted = false;
  bookLoading = true;
  pagesLoading = true;
  readerError = '';
  pageOpening = false;
  aiBusy = false;
  customPrompt = '';
  aiUsage: AiUsageResponse | null = null;
  aiUsageError = '';
  aiMessages: AiChatMessage[] = [];
  assessment: ReadingAssessment | null = null;
  currentAssessmentIndex = 0;
  assessmentAnswer = '';
  selectedAssessmentOption: number | null = null;
  currentAssessmentResult: AssessmentAnswer | null = null;
  assessmentResults: AssessmentAnswer[] = [];
  quizLoading = false;
  quizAnswerLoading = false;
  quizError = '';
  selectedPassage = '';
  characterName = '';
  focusMode = false;
  fontSize = 1.08;

  get quotaExhausted(): boolean {
    return this.aiUsage !== null && this.aiUsage.remainingToday <= 0;
  }

  get currentAssessmentQuestion(): AssessmentQuestion | null {
    return this.assessment?.questions[this.currentAssessmentIndex] ?? null;
  }

  get incorrectAssessmentResults(): AssessmentAnswer[] {
    return this.assessmentResults.filter((result) => !result.correct);
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
        this.pages = pages.map((page) => ({ number: page.number, content: '' }));
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

  @HostListener('window:online')
  onConnectionRestored(): void {
    this.retryPendingProgress();
  }

  getCurrentPage(): BookPage | undefined {
    return this.pages[this.currentPage];
  }

  prevPage(): void {
    if (this.currentPage > 0 && !this.pageOpening) {
      this.openPageAt(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.pages.length - 1 && !this.pageOpening) {
      this.openPageAt(this.currentPage + 1);
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
        const pendingSessionIds = new Set(
          this.readingService.getPendingProgress(this.userId!).map((progress) => progress.sessionId),
        );
        const activeSession = sessions.find((session) =>
          session.bookId === bookId
          && session.status === 'ACTIVE'
          && session.pagesDefined === this.pages.length,
        );
        const queuedCompletedSession = sessions.find((session) =>
          session.bookId === bookId
          && session.status === 'COMPLETED'
          && session.pagesDefined === this.pages.length
          && pendingSessionIds.has(session.id),
        );
        const sessionToResume = activeSession ?? queuedCompletedSession;
        if (sessionToResume) {
          this.sessionId = sessionToResume.id;
          this.savedPages = sessionToResume.pagesRead;
          this.isCompleted = sessionToResume.status === 'COMPLETED';
          const queuedProgress = this.readingService.getPendingProgress(this.userId!)
            .find((progress) => progress.sessionId === sessionToResume.id);
          const resumePages = Math.max(sessionToResume.pagesRead, queuedProgress?.pagesRead ?? 0);
          this.currentPage = Math.min(
            Math.max(resumePages - 1, 0),
            this.pages.length - 1,
          );
          this.resumedSession = resumePages > 0;
          const firstPageToOpen = resumePages > sessionToResume.pagesRead
            ? Math.max(sessionToResume.pagesRead + 1, 1)
            : Math.max(Math.min(sessionToResume.pagesRead, this.pages.length), 1);
          this.openPagesForResume(
            sessionToResume.id,
            firstPageToOpen,
            Math.max(1, Math.min(resumePages, this.pages.length)),
            () => {
              if (activeSession && activeSession.pagesRead >= this.pages.length && !queuedProgress) {
                this.syncProgress();
              } else {
                this.retryPendingProgress();
              }
            },
          );
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
        this.currentPage = 0;
        this.openPagesForResume(session.id, 1, 1, () => this.syncProgress());
      },
      error: () => {
        this.sessionId = null;
        this.sessionResolutionStarted = false;
        this.readerError = 'A leitura foi carregada, mas não foi possível sincronizar seu progresso.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private openPagesForResume(
    sessionId: number,
    firstPage: number,
    throughPage: number,
    onComplete: () => void,
  ): void {
    if (!this.userId || firstPage < 1 || throughPage < firstPage) {
      return;
    }

    this.pageOpening = true;
    this.readerError = '';
    const userId = this.userId;
    from(Array.from({ length: throughPage - firstPage + 1 }, (_, index) => firstPage + index)).pipe(
      concatMap((pageNumber) => this.readingService.openPage(sessionId, pageNumber)),
    ).subscribe({
      next: (page) => {
        const index = page.number - 1;
        if (index >= 0 && index < this.pages.length) {
          this.pages[index] = page;
        }
      },
      error: () => {
        this.pageOpening = false;
        this.readerError = 'Não foi possível abrir esta página na sessão de leitura. Tente novamente.';
        this.changeDetector.markForCheck();
      },
      complete: () => {
        this.pageOpening = false;
        if (this.userId === userId && this.sessionId === sessionId) {
          onComplete();
        }
        this.changeDetector.markForCheck();
      },
    });
  }

  private openPageAt(targetPage: number): void {
    if (!this.sessionId || targetPage < 0 || targetPage >= this.pages.length) {
      return;
    }

    const previousPage = this.currentPage;
    const sessionId = this.sessionId;
    this.currentPage = targetPage;
    this.selectedPassage = '';
    this.pageOpening = true;
    this.readerError = '';
    this.readingService.openPage(sessionId, targetPage + 1).subscribe({
      next: (page) => {
        this.pages[targetPage] = page;
        this.pageOpening = false;
        this.syncProgress();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.currentPage = previousPage;
        this.pageOpening = false;
        this.readerError = 'Não foi possível abrir esta página na sessão de leitura. Tente novamente.';
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

  generateSessionAssessment(): void {
    if (!this.sessionId || this.quizLoading || this.pageOpening) {
      return;
    }
    this.quizLoading = true;
    this.quizError = '';
    this.changeDetector.markForCheck();
    this.readingService.createAssessment(this.sessionId).pipe(
      finalize(() => {
        this.quizLoading = false;
        this.changeDetector.markForCheck();
      }),
    ).subscribe({
      next: (assessment) => {
        this.assessment = assessment;
        this.currentAssessmentIndex = 0;
        this.assessmentAnswer = '';
        this.selectedAssessmentOption = null;
        this.currentAssessmentResult = null;
        this.assessmentResults = [];
        this.quizError = '';
        this.loadAiUsage();
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.quizError = this.assessmentErrorMessage(error, 'Não foi possível gerar o quiz da sessão.');
        this.changeDetector.markForCheck();
      },
    });
  }

  canSubmitAssessmentAnswer(question: AssessmentQuestion): boolean {
    return question.type === 'MULTIPLE_CHOICE'
      ? this.selectedAssessmentOption !== null
      : !!this.assessmentAnswer.trim();
  }

  submitAssessmentAnswer(): void {
    const question = this.currentAssessmentQuestion;
    if (!this.sessionId || !question || !this.canSubmitAssessmentAnswer(question)
        || this.quizAnswerLoading || this.currentAssessmentResult) {
      return;
    }
    const isMultipleChoice = question.type === 'MULTIPLE_CHOICE';
    const answer = isMultipleChoice ? null : this.assessmentAnswer.trim();
    const selectedOption = isMultipleChoice ? this.selectedAssessmentOption : null;
    this.quizAnswerLoading = true;
    this.quizError = '';
    this.readingService.answerAssessmentQuestion(
      this.sessionId,
      question.id,
      answer,
      selectedOption,
    ).pipe(
      finalize(() => {
        this.quizAnswerLoading = false;
        this.changeDetector.markForCheck();
      }),
    ).subscribe({
      next: (result) => {
        this.currentAssessmentResult = result;
        this.assessmentResults = [
          ...this.assessmentResults.filter((item) => item.questionId !== result.questionId),
          result,
        ];
        if (!isMultipleChoice) {
          this.loadAiUsage();
        }
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.quizError = this.assessmentErrorMessage(error, 'Não foi possível corrigir sua resposta. Tente novamente.');
        this.changeDetector.markForCheck();
      },
    });
  }

  nextAssessmentQuestion(): void {
    if (!this.currentAssessmentResult || !this.assessment) {
      return;
    }
    this.currentAssessmentIndex += 1;
    this.currentAssessmentResult = null;
    this.assessmentAnswer = '';
    this.selectedAssessmentOption = null;
    this.quizError = '';
  }

  assessmentQuestionFor(questionId: number): AssessmentQuestion | undefined {
    return this.assessment?.questions.find((question) => question.id === questionId);
  }

  assessmentDifficultyLabel(difficulty: AssessmentQuestion['difficulty']): string {
    return difficulty === 'EASY' ? 'fácil' : difficulty === 'MEDIUM' ? 'média' : 'desafiadora';
  }

  private assessmentErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return error instanceof Error ? error.message : fallback;
    }
    const serverMessage = typeof error.error?.message === 'string' ? error.error.message : '';
    if (error.status === 429) {
      if (this.aiUsage) {
        this.aiUsage = { ...this.aiUsage, remainingToday: 0 };
      }
      return serverMessage || 'Sua cota diária de IA foi usada. Tente novamente após a renovação.';
    }
    if (error.status === 0) {
      return 'Não foi possível conectar ao serviço. Verifique a conexão e tente novamente.';
    }
    return serverMessage || fallback;
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
    if (!this.sessionId || !this.userId || !this.pages.length) {
      return;
    }

    const pagesRead = Math.min(this.currentPage + 1, this.pages.length);
    this.readingService.queueProgress(this.userId, this.sessionId, pagesRead);
    this.pendingProgressUpdates += 1;
    this.progressSyncing = true;
    const userId = this.userId;
    const sessionId = this.sessionId;
    this.authService.me().subscribe({
      next: (profile) => {
        if (profile.id !== userId) {
          this.finishProgressRequest();
          return;
        }
        this.sendProgress(userId, sessionId, pagesRead);
      },
      error: () => {
        this.finishProgressRequest();
        this.showProgressSyncError();
      },
    });
  }

  get hasPendingProgress(): boolean {
    if (!this.userId || !this.sessionId) {
      return false;
    }
    return this.readingService.getPendingProgress(this.userId)
      .some((progress) => progress.sessionId === this.sessionId);
  }

  private retryPendingProgress(): void {
    if (!this.userId || !this.sessionId || this.retryingPendingProgress) {
      return;
    }
    const pending = this.readingService.getPendingProgress(this.userId)
      .find((progress) => progress.sessionId === this.sessionId);
    if (!pending) {
      return;
    }
    if (pending.pagesRead <= this.savedPages) {
      this.readingService.confirmProgress(this.userId, this.sessionId, this.savedPages);
      this.clearProgressSyncError();
      this.changeDetector.markForCheck();
      return;
    }
    if (pending.pagesRead > this.pages.length) {
      return;
    }

    this.retryingPendingProgress = true;
    const userId = this.userId;
    const sessionId = this.sessionId;
    this.progressSyncing = true;
    this.authService.me().subscribe({
      next: (profile) => {
        if (profile.id !== userId) {
          this.retryingPendingProgress = false;
          this.progressSyncing = this.pendingProgressUpdates > 0;
          this.changeDetector.markForCheck();
          return;
        }
        this.sendProgress(userId, sessionId, pending.pagesRead, () => {
          this.retryingPendingProgress = false;
          this.progressSyncing = this.pendingProgressUpdates > 0;
          this.changeDetector.markForCheck();
        });
      },
      error: () => {
        this.retryingPendingProgress = false;
        this.progressSyncing = this.pendingProgressUpdates > 0;
        this.showProgressSyncError();
      },
    });
  }

  private sendProgress(
    userId: number,
    sessionId: number,
    pagesRead: number,
    onFinished?: () => void,
  ): void {
    this.readingService.updateProgress(sessionId, {
      pagesRead,
      excerptHash: this.book?.titulo ?? null,
    }).subscribe({
      next: (session) => {
        this.isCompleted = session.status === 'COMPLETED';
        this.savedPages = Math.max(this.savedPages, session.pagesRead);
        this.readingService.confirmProgress(userId, sessionId, session.pagesRead);
        this.clearProgressSyncError();
        this.finishProgressRequest();
        onFinished?.();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.finishProgressRequest();
        onFinished?.();
        this.showProgressSyncError();
      },
    });
  }

  private finishProgressRequest(): void {
    this.pendingProgressUpdates = Math.max(0, this.pendingProgressUpdates - 1);
    this.progressSyncing = this.pendingProgressUpdates > 0 || this.retryingPendingProgress;
  }

  private showProgressSyncError(): void {
    this.readerError = 'Não foi possível sincronizar o progresso desta página.';
    this.changeDetector.markForCheck();
  }

  private clearProgressSyncError(): void {
    if (this.readerError === 'Não foi possível sincronizar o progresso desta página.') {
      this.readerError = '';
    }
  }
}
