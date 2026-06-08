import cron, { type ScheduledTask } from "node-cron";
import { runAllScrapers } from "./runScrapers";
import { prisma } from "./prisma";

const INTERVAL_TO_CRON: Record<string, string> = {
  "1h": "0 * * * *",
  "3h": "0 */3 * * *",
  "6h": "0 */6 * * *",
  "12h": "0 */12 * * *",
  "24h": "0 0 * * *",
};

let task: ScheduledTask | null = null;

async function getInterval(): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!settings) return "6h";
  try {
    const data = JSON.parse(settings.data);
    return typeof data.scrapeInterval === "string" ? data.scrapeInterval : "6h";
  } catch {
    return "6h";
  }
}

export async function startScheduler() {
  if (task) task.stop();
  const interval = await getInterval();
  const expression = INTERVAL_TO_CRON[interval] ?? INTERVAL_TO_CRON["6h"];

  task = cron.schedule(expression, async () => {
    console.log(`[scheduler] running scheduled scrape (interval=${interval})`);
    try {
      const result = await runAllScrapers();
      const totalNew = Object.values(result).reduce((sum, r) => sum + r.newItems, 0);
      if (totalNew > 0) {
        console.log(`[scheduler] found ${totalNew} new project(s)`);
      }
    } catch (err) {
      console.error("[scheduler] scrape run failed", err);
    }
  });

  console.log(`[scheduler] scheduled scrapes every ${interval} (cron: ${expression})`);
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
  }
}
