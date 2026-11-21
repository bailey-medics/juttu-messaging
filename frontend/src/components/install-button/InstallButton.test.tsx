import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InstallButton from "@/components/install-button/InstallButton";
import { createInstallPromptCapture } from "@/pwa/installPrompt";
import { renderWithTheme } from "@/test/render";

/** A `beforeinstallprompt` event, as Chrome fires it. */
function installPromptEvent() {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn(async () => {});

  return Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
}

describe("InstallButton", () => {
  it("shows nothing until the browser offers an install", () => {
    const capture = createInstallPromptCapture();

    renderWithTheme(<InstallButton capture={capture} />);

    expect(screen.queryByRole("button", { name: "Install Juttu" })).not.toBeInTheDocument();
  });

  it("appears when the browser offers an install", () => {
    const capture = createInstallPromptCapture();
    const target = new EventTarget();
    capture.wire(target);
    renderWithTheme(<InstallButton capture={capture} />);

    act(() => {
      target.dispatchEvent(installPromptEvent());
    });

    expect(screen.getByRole("button", { name: "Install Juttu" })).toBeInTheDocument();
  });

  it("opens the browser's install dialog once, then goes", async () => {
    const capture = createInstallPromptCapture();
    const target = new EventTarget();
    const event = installPromptEvent();
    capture.wire(target);
    renderWithTheme(<InstallButton capture={capture} />);
    act(() => {
      target.dispatchEvent(event);
    });

    await userEvent.click(screen.getByRole("button", { name: "Install Juttu" }));

    expect(event.prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Install Juttu" })).not.toBeInTheDocument();
  });

  it("goes once Juttu is installed", () => {
    const capture = createInstallPromptCapture();
    const target = new EventTarget();
    capture.wire(target);
    renderWithTheme(<InstallButton capture={capture} />);
    act(() => {
      target.dispatchEvent(installPromptEvent());
    });

    act(() => {
      target.dispatchEvent(new Event("appinstalled"));
    });

    expect(screen.queryByRole("button", { name: "Install Juttu" })).not.toBeInTheDocument();
  });
});
