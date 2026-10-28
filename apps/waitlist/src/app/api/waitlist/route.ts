import { after } from "next/server";
import { createJoinWaitlistHandler, emailSender, waitlistStore } from "@/waitlist";

export const POST = createJoinWaitlistHandler({
  store: waitlistStore,
  emailSender,
  // Send after the response has gone back, so a signup never waits on AutoSend.
  defer: (task) => after(task),
});
