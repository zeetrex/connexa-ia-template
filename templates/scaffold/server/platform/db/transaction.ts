import type { QueryResult, QueryResultRow } from 'pg';

export interface Transaction {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
}
