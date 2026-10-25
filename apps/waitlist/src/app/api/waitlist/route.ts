import { createJoinWaitlistHandler, waitlistStore } from "@/waitlist";

export const POST = createJoinWaitlistHandler(waitlistStore);
