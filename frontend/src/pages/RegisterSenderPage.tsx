import { Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  listSenderChannels,
  registerSender,
  type RegisteredSender,
  type SenderChannel,
} from "@/api/senders";
import type { FormSubmitResult } from "@/components/form/Form";
import { RegisterSenderForm, SenderSecret } from "@/components/senders";
import { ErrorMessage, PageHeader } from "@/components/typography";

import { sendersFailure } from "./sendersFailure";

/**
 * Register a sender, at `/senders/new`, for an organisation admin. Once
 * registered, the page shows its secret, this once, in place of the form.
 */
export default function RegisterSenderPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<SenderChannel[]>([]);
  const [channelsFailed, setChannelsFailed] = useState<string | null>(null);
  const [registered, setRegistered] = useState<RegisteredSender | null>(null);

  useEffect(() => {
    listSenderChannels()
      .then(setChannels)
      .catch((failure: unknown) => setChannelsFailed(sendersFailure(failure)));
  }, []);

  async function handleSubmit(name: string, channelId: number): Promise<FormSubmitResult> {
    try {
      setRegistered(await registerSender(name, channelId));
    } catch (failure) {
      return { state: "error", message: { title: sendersFailure(failure) } };
    }

    return { state: "success", message: { title: "Registered" } };
  }

  return (
    <Stack gap="lg">
      <PageHeader title="Register sender" />
      {registered === null ? (
        <>
          {channelsFailed !== null && <ErrorMessage>{channelsFailed}</ErrorMessage>}
          <RegisterSenderForm channels={channels} onSubmit={handleSubmit} />
        </>
      ) : (
        <SenderSecret
          name={registered.name}
          secret={registered.secret}
          onDone={() => void navigate("/senders")}
        />
      )}
    </Stack>
  );
}
