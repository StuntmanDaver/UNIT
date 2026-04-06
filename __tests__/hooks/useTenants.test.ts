import { renderHook } from '@testing-library/react-native';
import { useTenants } from '../../hooks/useTenants';

jest.mock('../../hooks/useTenants', () => ({
  useTenants: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  })
}));

describe('useTenants', () => {
  it('returns data structure for tenants', () => {
    const { result } = renderHook(() => useTenants('prop1'));
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
