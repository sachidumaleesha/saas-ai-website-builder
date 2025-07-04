"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const Home = () => {
  const [text, setText] = useState("");

  const trpc = useTRPC();
  const invoke = useMutation(
    trpc.invoke.mutationOptions({
      onSuccess: () => {
        toast.success("Background job started");
      },
    })
  );
  return (
    <div>
      <Input value={text} onChange={(e) => setText(e.target.value)} />
      <Button disabled={invoke.isPending} onClick={() => {invoke.mutate({ value: text })}}>Invoke</Button>
    </div>
  );
};

export default Home;
