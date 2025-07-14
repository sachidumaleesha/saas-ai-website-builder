"use client";

import { Suspense, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { MessagesContainer } from "../components/messages-container";
import { ProjectHeader } from "../components/project-header";
import { FragmentWeb } from "../components/fragment-web";

import { Fragment } from "../../../../../prisma/generated/prisma";

interface Props {
  projectId: string;
}

export const ProjectView = ({ projectId }: Props) => {
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          className="flex flex-col min-h-0"
        >
          <Suspense fallback={<div>Loading Project...</div>}>
            <ProjectHeader projectId={projectId}/>
          </Suspense>
          <Suspense fallback={<div>Loading Messages...</div>}>
            <MessagesContainer
              projectId={projectId}
              activeFragment={activeFragment}
              setActiveFragment={setActiveFragment}
            />
          </Suspense>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} minSize={50}>
          {!!activeFragment && <FragmentWeb data={activeFragment}/>}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
