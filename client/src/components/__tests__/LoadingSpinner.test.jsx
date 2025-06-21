import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders loading spinner with default text', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders loading spinner with custom text', () => {
    const customText = 'Processing files...';
    render(<LoadingSpinner message={customText} />);
    expect(screen.getByText(customText)).toBeInTheDocument();
  });

  it('applies custom size class', () => {
    render(<LoadingSpinner size="large" />);
    const containers = screen.getAllByText('Loading...').map(el => el.closest('.loading-container'));
    const largeContainer = containers.find(c => c && c.classList.contains('size-large'));
    expect(largeContainer).toHaveClass('size-large');
  });
}); 