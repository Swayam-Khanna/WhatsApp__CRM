import { auth } from "@backend/lib/neon-auth";

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();

