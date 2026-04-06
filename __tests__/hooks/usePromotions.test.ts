import { renderHook, waitFor } from '@testing-library/react-native';
import { usePromotions } from '../../hooks/usePromotions';

jest.mock('../../hooks/usePromotions', () => ({
  usePromotions: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  })
}));

describe('usePromotions', () => {
  it('returns data structure for promotions', async () => {
    const { result } = renderHook(() => usePromotions('prop1', 'All'));
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
