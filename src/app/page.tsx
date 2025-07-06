"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const Home = () => {
  const [text, setText] = useState("");

  const trpc = useTRPC();
  const { data: messages } = useQuery(trpc.messages.getMany.queryOptions());
  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        toast.success("Message created");
      },
    })
  );
  return (
    <div>
      <Input value={text} onChange={(e) => setText(e.target.value)} />
      <Button
        disabled={createMessage.isPending}
        onClick={() => {
          createMessage.mutate({ value: text });
        }}
      >
        Invoke
      </Button>

      {JSON.stringify(messages, null, 2)}
    </div>
  );
};

export default Home;
