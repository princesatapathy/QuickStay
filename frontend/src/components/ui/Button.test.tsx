import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label and calls onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Reserve</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Reserve' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and ignores clicks while loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Reserve</Button>);

    const button = screen.getByRole('button', { name: 'Reserve' });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
