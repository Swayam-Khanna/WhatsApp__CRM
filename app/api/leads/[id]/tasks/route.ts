
import { LeadsService } from "../../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/:id/tasks
 * Schedules follow-up or creates a task for the lead.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body || !body.title) {
      return Response.json(
        { success: false, error: "Task title is required" },
        { status: 400 }
      );
    }

    if (!body.dueAt) {
      return Response.json(
        { success: false, error: "Task due date (dueAt) is required" },
        { status: 400 }
      );
    }

    const task = await LeadsService.scheduleTask(id, {
      title: body.title,
      description: body.description,
      taskType: body.taskType || "whatsapp",
      dueAt: body.dueAt,
      assignedToId: body.assignedToId,
      assignedToName: body.assignedToName,
      priority: body.priority,
    });

    return Response.json({
      success: true,
      task,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to schedule task" },
      { status: 400 }
    );
  }
}

/**
 * PATCH /api/leads/:id/tasks
 * Updates an existing task (e.g. status completed/pending or schedule)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body || !body.taskId) {
      return Response.json(
        { success: false, error: "taskId is required" },
        { status: 400 }
      );
    }

    const task = await LeadsService.updateTask(id, body.taskId, {
      status: body.status,
      dueAt: body.dueAt,
      title: body.title,
      actorName: body.actorName,
    });

    return Response.json({
      success: true,
      task,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to update task" },
      { status: 400 }
    );
  }
}
