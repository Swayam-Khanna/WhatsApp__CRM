"use server";

export async function logClientErrorAction(data: {
  message: string;
  stack?: string;
  source: string;
}) {
  console.error(
    `\n[CLIENT EXCEPTION] Source: ${data.source}\nMessage: ${data.message}\nStack: ${data.stack || "No stack trace available"}\n`,
  );
  return { logged: true };
}
export async function logClientError(payload: {
  data: { message: string; stack?: string; source: string };
}) {
  return logClientErrorAction(payload.data);
}
