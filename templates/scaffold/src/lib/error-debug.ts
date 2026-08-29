import { ApiRequestError } from './api';

export interface ErrorContext {
  action: string;
  source: string;
  timestamp: string;
}

interface ErrorDebugPayload {
  title: string;
  detailText: string;
}

function safeSerialize(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function buildErrorDebugPayload(error: unknown, context: ErrorContext): ErrorDebugPayload {
  const lines: string[] = [];
  lines.push(`Acción: ${context.action}`);
  lines.push(`Origen: ${context.source}`);
  lines.push(`Timestamp: ${context.timestamp}`);
  lines.push('');

  if (error instanceof ApiRequestError) {
    lines.push(`Tipo: ${error.name}`);
    lines.push(`Mensaje: ${error.message}`);
    lines.push(`Método HTTP: ${error.method}`);
    lines.push(`URL: ${error.url}`);
    if (error.status !== undefined) lines.push(`Status: ${error.status}`);
    if (error.statusText) lines.push(`Status text: ${error.statusText}`);
    if (error.isNetworkError) lines.push('Network error: true');
    if (error.requestBody !== undefined) {
      lines.push('');
      lines.push('Request body:');
      lines.push(safeSerialize(error.requestBody));
    }
    if (error.responseBody !== undefined) {
      lines.push('');
      lines.push('Response body:');
      lines.push(safeSerialize(error.responseBody));
    }
    if (error.rawResponseBody) {
      lines.push('');
      lines.push('Raw response body:');
      lines.push(error.rawResponseBody);
    }
    if (error.causeData !== undefined) {
      lines.push('');
      lines.push('Network cause:');
      lines.push(safeSerialize(error.causeData));
    }
    if (error.stack) {
      lines.push('');
      lines.push('Stacktrace:');
      lines.push(error.stack);
    }
    return {
      title: `Error de API: ${error.message}`,
      detailText: lines.join('\n'),
    };
  }

  if (error instanceof Error) {
    lines.push(`Tipo: ${error.name}`);
    lines.push(`Mensaje: ${error.message}`);
    if (error.stack) {
      lines.push('');
      lines.push('Stacktrace:');
      lines.push(error.stack);
    }
    return {
      title: `Error: ${error.message}`,
      detailText: lines.join('\n'),
    };
  }

  lines.push('Tipo: Error desconocido');
  lines.push(`Detalle: ${safeSerialize(error)}`);
  return {
    title: 'Error desconocido',
    detailText: lines.join('\n'),
  };
}
