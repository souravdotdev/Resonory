import { LandingPage } from "@/landing/landing-page";
import { waitlistStore } from "@/waitlist";

// The proof line's count is read on the server at most about once a minute,
// never per visit.
export const revalidate = 60;

export default function WaitlistPage() {
  return <LandingPage store={waitlistStore} />;
}
