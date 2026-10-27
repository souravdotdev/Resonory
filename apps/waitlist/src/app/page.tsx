import { WaitlistScreen } from "@/screen/waitlist-screen";
import { waitlistStore } from "@/waitlist";

// The proof line's count is read on the server at most about once a minute,
// never per visit.
export const revalidate = 60;

export default function WaitlistPage() {
  return <WaitlistScreen store={waitlistStore} />;
}
