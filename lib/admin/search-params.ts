export type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function readAdminSearchParams(
  searchParams?: AdminSearchParams
): Promise<Record<string, string | string[] | undefined>> {
  return searchParams ? searchParams : {};
}

export function firstSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}
