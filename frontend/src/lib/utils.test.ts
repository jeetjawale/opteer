import { cn } from './utils';
import { describe, it, expect } from 'vitest';

describe('cn utility', () => {
  it('combines class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional class names', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  it('merges tailwind classes correctly (overrides)', () => {
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
  });

  it('handles empty and undefined inputs', () => {
    expect(cn('class1', null, undefined, '')).toBe('class1');
  });
});
