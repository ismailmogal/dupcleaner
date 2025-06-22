import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render loading spinner', () => {
    render(<LoadingSpinner />);
    const message = screen.getByText('Loading...');
    expect(message).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    const message = 'Custom loading message';
    render(<LoadingSpinner message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('should render with default message when no message provided', () => {
    render(<LoadingSpinner />);
    const message = screen.getByText('Loading...');
    expect(message).toBeInTheDocument();
  });

  it('should not render message when message is empty', () => {
    render(<LoadingSpinner message="" />);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('applies custom size class', () => {
    render(<LoadingSpinner size="large" />);
    const container = screen.getByText('Loading...').closest('.loading-container');
    expect(container).toHaveClass('size-large');
  });
}); 