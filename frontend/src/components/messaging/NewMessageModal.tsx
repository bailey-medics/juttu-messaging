/**
 * New Conversation Modal
 *
 * Modal dialog for starting a conversation: who is in it, a subject, and
 * the first message. Uses the Form wrapper for submission lifecycle
 * management.
 *
 * Ported from Quill Medical's, with a `clinical` prop, false by default.
 * A non-clinical conversation, the usual kind in Juttu, has no patient:
 * the modal shows no patient picker and no "patient as participant"
 * switch. A clinical one shows both, as Quill's does. The modal takes its
 * patients and its users as props instead of fetching them, because
 * Juttu has no API for either yet; the page that opens it fetches them.
 */

import { Modal, Stack } from "@mantine/core";
import { Controller } from "react-hook-form";

import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "@/components/form/Form";
import type { FormSubmitResult } from "@/components/form/Form";
import MultiSelectField from "@/components/form/MultiSelectField";
import SelectField from "@/components/form/SelectField";
import SolidSwitch from "@/components/form/SolidSwitch";
import TextAreaField from "@/components/form/TextAreaField";
import TextField from "@/components/form/TextField";
import BodyTextBold from "@/components/typography/BodyTextBold";
import Heading from "@/components/typography/Heading";

/** One person, or one patient, to choose: an id and the name shown. */
export interface PersonOption {
  value: string;
  label: string;
}

export interface NewConversationData {
  /** The patient it is about, in a clinical conversation; otherwise null. */
  patient_id: string | null;
  subject: string;
  participant_ids: number[];
  initial_message: string;
  /** Whether the patient may reply; always false when not clinical. */
  include_patient_as_participant: boolean;
}

interface NewConversationFormValues {
  patientId: string | null;
  participantIds: string[];
  subject: string;
  initialMessage: string;
  includePatient: boolean;
}

interface NewMessageModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Called when the modal is closed */
  onClose: () => void;
  /** Called when the user submits the form - should return a FormSubmitResult */
  onSubmit: (data: NewConversationData) => Promise<FormSubmitResult>;
  /** The people who can be added to the conversation */
  users: PersonOption[];
  /** Whether the people are still loading */
  loadingUsers?: boolean;
  /**
   * Whether the conversation is about a patient. False by default: the
   * patient picker and the "patient as participant" switch show only when
   * it is true.
   */
  clinical?: boolean;
  /** The patients to choose from, in a clinical conversation */
  patients?: PersonOption[];
  /** Whether the patients are still loading */
  loadingPatients?: boolean;
  /** Pre-selected patient ID (locks the patient selector), when clinical */
  patientId?: string;
  /** Patient name to display when patientId is locked */
  patientName?: string;
  /** The person signed in is the patient, when clinical: hides the patient field and switch */
  isPatientView?: boolean;
}

/** A form value read as text, or null when it is anything else. */
function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** A form value read as a list of text, empty when it is anything else. */
function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Inner form fields - uses Form context to wire to RHF */
function NewMessageFields({
  showPatientFields,
  patients,
  users,
  loadingPatients,
  loadingUsers,
  lockedPatientId,
  lockedPatientName,
  onClose,
}: {
  showPatientFields: boolean;
  patients: PersonOption[];
  users: PersonOption[];
  loadingPatients: boolean;
  loadingUsers: boolean;
  lockedPatientId?: string;
  lockedPatientName?: string;
  onClose: () => void;
}) {
  const { methods } = useFormContext();
  const { watch, setValue, register, control } = methods;

  const includePatient = watch("includePatient") === true;

  return (
    <Stack gap="md">
      {!showPatientFields ? null : lockedPatientId ? (
        <BodyTextBold>Patient: {lockedPatientName ?? lockedPatientId}</BodyTextBold>
      ) : (
        <Controller
          name="patientId"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <SelectField
              label="Patient"
              placeholder="Select a patient"
              data={patients}
              value={stringOrNull(field.value)}
              onChange={field.onChange}
              searchable
              required
              disabled={loadingPatients}
              nothingFoundMessage={
                loadingPatients ? "Loading patients\u2026" : "No patients found"
              }
            />
          )}
        />
      )}

      {showPatientFields && (
        <div>
          <SolidSwitch
            label="Patient as participant"
            description="Allow the patient to reply to this conversation"
            checked={includePatient}
            onChange={(e) =>
              setValue("includePatient", e.currentTarget.checked, {
                shouldDirty: true,
              })
            }
          />
        </div>
      )}

      <Controller
        name="participantIds"
        control={control}
        render={({ field }) => (
          <MultiSelectField
            label="Participants"
            placeholder="Add people to this conversation"
            data={users}
            value={stringArray(field.value)}
            onChange={field.onChange}
            searchable
            disabled={loadingUsers}
            nothingFoundMessage={loadingUsers ? "Loading people\u2026" : "No people found"}
          />
        )}
      />

      <TextField
        label="Subject"
        placeholder="e.g. Release notes for Friday"
        required
        {...register("subject", { required: true })}
      />

      <TextAreaField
        label="Message"
        placeholder={"Type your message\u2026"}
        minRows={3}
        autosize
        maxRows={8}
        required
        {...register("initialMessage", { required: true })}
      />

      <FormStatusNarrow />
      <SubmitButton onCancel={onClose} cancelLabel="Cancel" />
    </Stack>
  );
}

export default function NewMessageModal({
  opened,
  onClose,
  onSubmit,
  users,
  loadingUsers = false,
  clinical = false,
  patients = [],
  loadingPatients = false,
  patientId: lockedPatientId,
  patientName: lockedPatientName,
  isPatientView = false,
}: NewMessageModalProps) {
  // The patient fields show only in a clinical conversation, and not to
  // the patient themselves, who is messaging about their own care.
  const showPatientFields = clinical && !isPatientView;

  const handleSubmit = async (data: NewConversationFormValues): Promise<FormSubmitResult> => {
    const patientId = clinical ? (lockedPatientId ?? data.patientId) : null;

    if (clinical && !patientId) {
      return {
        state: "validation_error",
        message: { title: "Please select a patient" },
      };
    }

    return onSubmit({
      patient_id: patientId,
      subject: data.subject.trim(),
      participant_ids: data.participantIds.map(Number),
      initial_message: data.initialMessage.trim(),
      include_patient_as_participant: clinical && (isPatientView || data.includePatient),
    });
  };

  if (!opened) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Heading>New message</Heading>}
      size="lg"
      centered
    >
      <Form<NewConversationFormValues>
        defaultValues={{
          patientId: lockedPatientId ?? null,
          participantIds: [],
          subject: "",
          initialMessage: "",
          includePatient: false,
        }}
        onSubmit={handleSubmit}
        submitLabel="Start conversation"
        submittingLabel={"Creating\u2026"}
      >
        <NewMessageFields
          showPatientFields={showPatientFields}
          patients={patients}
          users={users}
          loadingPatients={loadingPatients}
          loadingUsers={loadingUsers}
          lockedPatientId={lockedPatientId}
          lockedPatientName={lockedPatientName}
          onClose={onClose}
        />
      </Form>
    </Modal>
  );
}
