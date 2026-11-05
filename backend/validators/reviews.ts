import { z } from "zod";

export const createReviewSchema = z.object({
  productSlug: z.string().min(1, "Product slug is required"),
  userId: z.string().min(1, "User ID is required"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  title: z.string().max(100).nullable().optional(),
  body: z.string().min(5, "Review description must be at least 5 characters"),
  images: z.array(z.string()).nullable().optional(),
  verified: z.boolean().default(false),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(100).nullable().optional(),
  body: z.string().min(5).optional(),
  images: z.array(z.string()).nullable().optional(),
});
