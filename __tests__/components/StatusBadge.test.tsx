import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../../components/ui/StatusBadge';

describe('StatusBadge', () => {
  const statuses = ['invited', 'active', 'inactive', 'pending', 'approved', 'rejected'] as const;

  it.each(statuses)('renders %s status without crashing', (status) => {
    const { getByText } = render(<StatusBadge status={status} />);
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    expect(getByText(label)).toBeTruthy();
  });
});
