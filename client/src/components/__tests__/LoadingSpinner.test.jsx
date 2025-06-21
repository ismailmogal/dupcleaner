import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render loading spinner', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    const message = 'Custom loading message';
    render(<LoadingSpinner message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('should render with default message when no message provided', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should not render message when message is empty', () => {
    render(<LoadingSpinner message="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('applies custom size class', () => {
    render(<LoadingSpinner size="large" />);
    const containers = screen.getAllByText('Loading...').map(el => el.closest('.loading-container'));
    const largeContainer = containers.find(c => c && c.classList.contains('size-large'));
    expect(largeContainer).toHaveClass('size-large');
  });
}); 