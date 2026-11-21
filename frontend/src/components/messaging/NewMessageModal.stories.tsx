/**
 * NewMessageModal Component Stories
 *
 * Demonstrates the new message modal:
 * - Default: a non-clinical conversation, with no patient fields
 * - Clinical: the patient selector and the patient as participant switch
 * - Clinical with a pre-filled patient, and the patient's own view
 *
 * The people and the patients are made up.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import type { FormSubmitResult } from "@/components/form/Form";
import NewMessageModal from "./NewMessageModal";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const mockSubmit = async (): Promise<FormSubmitResult> => {
  await delay(1000);
  return {
    state: "success",
    message: { title: "Conversation started" },
  };
};

const meta: Meta<typeof NewMessageModal> = {
  title: "Messaging/New message modal",
  component: NewMessageModal,
  parameters: { layout: "fullscreen" },
  args: {
    opened: true,
    onClose: () => {},
    onSubmit: mockSubmit,
    users: [
      { value: "1", label: "Sam Patel" },
      { value: "2", label: "Alex Morgan" },
      { value: "3", label: "Priya Shah" },
    ],
  },
};

const patients = [
  { value: "p-1", label: "James Green" },
  { value: "p-2", label: "Ruth Okafor" },
];

export default meta;

type Story = StoryObj<typeof NewMessageModal>;

/** A non-clinical conversation, the default: no patient fields at all */
export const Default: Story = {};

/** A clinical conversation: the patient selector and switch show */
export const Clinical: Story = {
  args: { clinical: true, patients },
};

/** Clinical, patient pre-selected - shows patient name, selector hidden */
export const WithLockedPatient: Story = {
  args: {
    clinical: true,
    patientId: "p-1",
    patientName: "James Green",
  },
};

/** Clinical, the patient's own view - patient field and toggle hidden */
export const PatientView: Story = {
  args: {
    clinical: true,
    isPatientView: true,
    patientId: "p-1",
    patientName: "James Green",
  },
};

/** Error state - submits and shows inline error via FormStatusNarrow */
export const WithError: Story = {
  args: {
    onSubmit: async () => {
      await delay(500);
      return {
        state: "error",
        message: { title: "Failed to create conversation. Please try again." },
      } satisfies FormSubmitResult;
    },
  },
  play: async () => {
    // Modal renders in a portal, so query from document.body
    const body = within(document.body);
    // Click into Participants and type to show we tried
    const participantsInput = body.getByPlaceholderText("Add people to this conversation");
    await userEvent.type(participantsInput, "Sam");
    // Close the dropdown by pressing Escape
    await userEvent.keyboard("{Escape}");
    await userEvent.type(body.getByLabelText("Subject *"), "Release notes for Friday");
    await userEvent.type(
      body.getByLabelText("Message *"),
      "Could someone check the release notes before Friday?",
    );
    await userEvent.click(body.getByTestId("submit-button"));
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
