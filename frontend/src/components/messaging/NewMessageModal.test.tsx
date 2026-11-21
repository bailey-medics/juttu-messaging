/**
 * NewMessageModal Component Tests
 *
 * Tests for the new conversation modal covering:
 * - Rendering when opened/closed
 * - Form field presence
 * - Cancel behaviour
 * - A non-clinical conversation never shows a patient field
 * - In a clinical one: the pre-filled patient and the patient view
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import type { FormSubmitResult } from "@/components/form/Form";
import NewMessageModal from "./NewMessageModal";

const mockSubmit = vi.fn<() => Promise<FormSubmitResult>>().mockResolvedValue({
  state: "success",
  message: { title: "Created" },
});

describe("NewMessageModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onSubmit: mockSubmit,
    users: [
      { value: "1", label: "Sam Patel" },
      { value: "2", label: "Alex Morgan" },
    ],
  };
  const clinicalProps = { ...defaultProps, clinical: true };

  describe("Rendering", () => {
    it("renders modal with title when opened", async () => {
      renderWithRouter(<NewMessageModal {...defaultProps} />);
      expect(await screen.findByText("New message")).toBeInTheDocument();
    }, 15000);

    it("does not render content when closed", () => {
      renderWithRouter(<NewMessageModal {...defaultProps} opened={false} />);
      expect(screen.queryByText("New message")).not.toBeInTheDocument();
    });

    it("renders all form fields", () => {
      renderWithRouter(<NewMessageModal {...defaultProps} />);
      expect(screen.getByText("Participants")).toBeInTheDocument();
      expect(screen.getByText("Subject")).toBeInTheDocument();
      expect(screen.getByText("Message")).toBeInTheDocument();
    });

    it("renders action buttons", () => {
      renderWithRouter(<NewMessageModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start conversation/i })).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onClose when cancel is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithRouter(<NewMessageModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("allows typing in subject field", async () => {
      const user = userEvent.setup();
      renderWithRouter(<NewMessageModal {...defaultProps} />);

      const subjectInput = screen.getByPlaceholderText("e.g. Release notes for Friday");
      await user.type(subjectInput, "Test subject");
      expect(subjectInput).toHaveValue("Test subject");
    });

    it("allows typing in message field", async () => {
      const user = userEvent.setup();
      renderWithRouter(<NewMessageModal {...defaultProps} />);

      const messageInput = screen.getByPlaceholderText("Type your message\u2026");
      await user.type(messageInput, "Hello there");
      expect(messageInput).toHaveValue("Hello there");
    });
  });

  describe("Not clinical, the default", () => {
    it("shows no patient picker", () => {
      renderWithRouter(<NewMessageModal {...defaultProps} />);
      expect(screen.queryByText("Patient")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Select a patient")).not.toBeInTheDocument();
    });

    it("shows no patient as participant switch", () => {
      renderWithRouter(<NewMessageModal {...defaultProps} />);
      expect(screen.queryByText("Patient as participant")).not.toBeInTheDocument();
    });

    it("shows no patient field even when a patient is passed", () => {
      renderWithRouter(
        <NewMessageModal
          {...defaultProps}
          patients={[{ value: "p-1", label: "James Green" }]}
          patientId="p-1"
          patientName="James Green"
        />,
      );
      expect(screen.queryByText(/patient/i)).not.toBeInTheDocument();
    });

    it("sends no patient with the conversation", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<() => Promise<FormSubmitResult>>().mockResolvedValue({
        state: "success",
        message: { title: "Created" },
      });
      renderWithRouter(<NewMessageModal {...defaultProps} onSubmit={onSubmit} />);

      await user.type(screen.getByPlaceholderText("e.g. Release notes for Friday"), "Friday");
      await user.type(screen.getByPlaceholderText("Type your message\u2026"), "Hello");
      await user.click(screen.getByRole("button", { name: /start conversation/i }));

      expect(onSubmit).toHaveBeenCalledWith({
        patient_id: null,
        subject: "Friday",
        participant_ids: [],
        initial_message: "Hello",
        include_patient_as_participant: false,
      });
    });

    it("offers the people passed in as participants", async () => {
      const user = userEvent.setup();
      renderWithRouter(<NewMessageModal {...defaultProps} />);

      await user.click(screen.getByPlaceholderText("Add people to this conversation"));

      expect(await screen.findByText("Sam Patel")).toBeInTheDocument();
    });
  });

  describe("Clinical: pre-filled patient", () => {
    it("shows patient name when patientId prop is provided", () => {
      renderWithRouter(
        <NewMessageModal
          {...clinicalProps}
          patientId="patient-123"
          patientName="James Green"
        />,
      );
      expect(screen.getByText("Patient: James Green")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Select a patient")).not.toBeInTheDocument();
    });

    it("shows patient selector when no patientId prop", () => {
      renderWithRouter(<NewMessageModal {...clinicalProps} />);
      expect(screen.getByText("Patient")).toBeInTheDocument();
    });
  });

  describe("Clinical: patient as participant toggle", () => {
    it("renders switch for staff users", () => {
      renderWithRouter(<NewMessageModal {...clinicalProps} />);
      expect(screen.getByText("Patient as participant")).toBeInTheDocument();
    });

    it("hides switch in patient view", () => {
      renderWithRouter(<NewMessageModal {...clinicalProps} isPatientView={true} />);
      expect(screen.queryByText("Patient as participant")).not.toBeInTheDocument();
    });

    it("hides patient selector in patient view", () => {
      renderWithRouter(<NewMessageModal {...clinicalProps} isPatientView={true} />);
      expect(screen.queryByText("Patient")).not.toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("disables submit when subject is empty", async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <NewMessageModal {...clinicalProps} isPatientView={true} patientId="p-1" />,
      );

      const messageInput = screen.getByPlaceholderText("Type your message\u2026");
      await user.type(messageInput, "Hello");

      expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");
    });

    it("disables submit when message is empty", async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <NewMessageModal {...clinicalProps} isPatientView={true} patientId="p-1" />,
      );

      const subjectInput = screen.getByPlaceholderText("e.g. Release notes for Friday");
      await user.type(subjectInput, "Test");

      expect(screen.getByTestId("submit-button")).toHaveAttribute("aria-disabled", "true");
    });

    it("enables submit when all required fields are filled", async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <NewMessageModal {...clinicalProps} isPatientView={true} patientId="p-1" />,
      );

      await user.type(
        screen.getByPlaceholderText("e.g. Release notes for Friday"),
        "Test subject",
      );
      await user.type(screen.getByPlaceholderText("Type your message\u2026"), "Hello");

      expect(screen.getByTestId("submit-button")).not.toHaveAttribute("aria-disabled", "true");
    });
  });
});
