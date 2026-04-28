-- Improve common list, dashboard, calendar, and notification queries.
CREATE INDEX "User_role_partnerId_createdAt_idx" ON "User"("role", "partnerId", "createdAt");

CREATE INDEX "Partner_createdAt_idx" ON "Partner"("createdAt");

CREATE INDEX "Task_assignedToId_taskDate_createdAt_idx" ON "Task"("assignedToId", "taskDate", "createdAt");
CREATE INDEX "Task_status_createdAt_idx" ON "Task"("status", "createdAt");
CREATE INDEX "Task_shiftScheduleId_createdAt_idx" ON "Task"("shiftScheduleId", "createdAt");
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

CREATE INDEX "TaskTemplate_createdAt_type_idx" ON "TaskTemplate"("createdAt", "type");
CREATE INDEX "MasterArea_createdAt_idx" ON "MasterArea"("createdAt");
CREATE INDEX "TaskPackage_createdAt_idx" ON "TaskPackage"("createdAt");

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "ShiftSchedule_createdAt_idx" ON "ShiftSchedule"("createdAt");
