"use client";
import { useState } from "react";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const Home = () => {
  const [text, setText] = useState("");

  const router = useRouter()
  const trpc = useTRPC();
  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Project created");
        router.push(`/projects/${data.id}`)
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="max-w-4xl mx-auto flex items-center flex-col gap-y-2 justify-center">
        <Input value={text} onChange={(e) => setText(e.target.value)} />
        <Button
          disabled={createProject.isPending}
          onClick={() => {
            createProject.mutate({ value: text });
          }}
        >
          Submit
        </Button>
      </div>
    </div>
  );
};

export default Home;
