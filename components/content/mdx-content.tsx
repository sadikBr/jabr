import type { ComponentType } from "react";
import * as runtime from "react/jsx-runtime";

import { Callout } from "@/components/blocks/callout";
import { ConnectIt } from "@/components/blocks/connect-it";
import { Figure } from "@/components/blocks/figure";
import { Interactive } from "@/components/blocks/interactive";
import { Layer } from "@/components/blocks/layer";
import { CodeLab, Question } from "@/components/blocks/question";
import { Step } from "@/components/blocks/step";
import { WorkedExample } from "@/components/blocks/worked-example";
import type { mdxComponentNames } from "@/lib/content/vocabulary";

type MdxComponentName = (typeof mdxComponentNames)[number];

// Must stay in step with mdxComponentNames, which the validator checks against.
/* eslint-disable @typescript-eslint/no-explicit-any */
const components: Record<MdxComponentName, ComponentType<any>> = {
  Step,
  Layer,
  Callout,
  WorkedExample,
  ConnectIt,
  Interactive,
  Question,
  CodeLab,
  Figure,
};

/**
 * Renders MDX compiled by Velite (a function body string). The code comes
 * from our own /content at build time, never from users.
 */
export function MdxContent({ code }: { code: string }) {
  const Content = new Function(code)({ ...runtime }).default as ComponentType<{
    components: typeof components;
  }>;
  return <Content components={components} />;
}
