import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WaitlistForm } from "./waitlist-form";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WaitlistForm", () => {
  it("shows an inline error for a malformed email and sends nothing", async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText("Email"), "ada@");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(await screen.findByText("Enter a valid email address")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the inline error once the visitor types again, bringing back the note", async () => {
    const user = userEvent.setup();
    render(<WaitlistForm note="Join the waitlist. Be among the first to use Resonory." />);
    const field = screen.getByLabelText("Email");

    await user.type(field, "ada@");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");

    await user.type(field, "e");

    expect(screen.queryByRole("alert")).toBeNull();
    expect(field.getAttribute("aria-invalid")).toBeNull();
    expect(screen.getByText("Join the waitlist. Be among the first to use Resonory.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the email as JSON, shows the joining state, then the confirmation", async () => {
    let answer!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    window.history.replaceState(null, "", "/?utm_source=hn");
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText("Email"), "  Ada@Example.com ");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    const button = screen.getByRole("button", { name: "Joining…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/waitlist");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "ada@example.com",
      source: "hn",
      company: "",
    });

    answer(Response.json({ ok: true }));

    expect((await screen.findByRole("status")).textContent).toBe(
      "You’re on the list. Check your inbox for a confirmation. We’ll email you again when early access opens.",
    );
    expect(screen.queryByLabelText("Email")).toBeNull();
    window.history.replaceState(null, "", "/");
  });

  it("shows the server's error inline and stays usable", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "internal",
            message: "We could not add you right now. Please try again.",
          },
        },
        { status: 500 },
      ),
    );
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(
      await screen.findByText("We could not add you right now. Please try again."),
    ).toBeTruthy();
    const button = screen.getByRole("button", { name: "Join the waitlist" });
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    await user.click(button);

    expect((await screen.findByRole("status")).textContent).toBe(
      "You’re on the list. Check your inbox for a confirmation. We’ll email you again when early access opens.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
