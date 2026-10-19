import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';

export interface Book {
  id: number;
  titulo: string;
  autor: string;
  sinopse: string;
  origem: string;
  tipo: string;
  dificuldade: number;
  totalPaginas: number;
  pontuacaoBase: number;
  pontosConclusao: number;
  capaUrl: string | null;
}

export interface BookPage {
  number: number;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class BookService {
  constructor(private http: HttpClient) {}

  getBooks(query = ''): Observable<Book[]> {
    const normalizedQuery = query.trim().toLowerCase();
    return this.http.get<Book[]>('http://localhost:8080/api/books', {
      headers: this.getAuthHeaders(),
    }).pipe(
      timeout(4000),
      map((books) => {
        const safeBooks = Array.isArray(books) ? books : [];
        return this.applyQueryFilter(safeBooks, normalizedQuery);
      }),
    );
  }

  getBook(id: number): Observable<Book> {
    return this.http
      .get<Book>(`http://localhost:8080/api/books/${id}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        timeout(4000),
        map((book) => this.normalizeBook(book)),
      );
  }

  getBookPages(id: number): Observable<BookPage[]> {
    return this.http
      .get<BookPage[]>(`http://localhost:8080/api/books/${id}/pages`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        timeout(4000),
        map((pages) => Array.isArray(pages) ? pages : []),
      );
  }

  private applyQueryFilter(books: Book[], query: string): Book[] {
    if (!query) {
      return books;
    }

    return books.filter((book) => {
      const haystack = `${book.titulo} ${book.autor}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  private normalizeBook(book: Book | null | undefined): Book {
    if (!book) {
      throw new Error('A API retornou um livro inválido.');
    }

    return {
      ...book,
      sinopse: book.sinopse ?? '',
      capaUrl: book.capaUrl ?? null,
    };
  }

  private getAuthHeaders(): HttpHeaders {
    const session = localStorage.getItem('breadle.session');
    if (!session) {
      return new HttpHeaders();
    }

    try {
      const parsed = JSON.parse(session) as { token?: string };
      if (!parsed.token) {
        return new HttpHeaders();
      }

      return new HttpHeaders({ Authorization: `Bearer ${parsed.token}` });
    } catch {
      return new HttpHeaders();
    }
  }
}
