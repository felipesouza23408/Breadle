import { describe, expect, it } from 'vitest';
import { apiUrl } from './api-url';

describe('apiUrl', () => {
  it('joins API paths with the configured base URL', () => {
    expect(apiUrl('/api/books')).toBe('http://localhost:8080/api/books');
  });

  it('adds a leading slash when the path does not include one', () => {
    expect(apiUrl('api/books')).toBe('http://localhost:8080/api/books');
  });
});
