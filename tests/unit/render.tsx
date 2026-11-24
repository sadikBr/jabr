import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import messages from "@/messages/en.json";

/** Renders a component with the English messages, as the app does. */
export function renderWithIntl(ui: ReactElement): RenderResult {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}
