import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // The app shell should render — look for the header LIFEY text
    expect(screen.getAllByText('LIFEY').length).toBeGreaterThan(0);
  });
});
