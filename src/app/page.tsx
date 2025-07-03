import { Button } from "@/components/ui/button";
import { caller } from "@/trpc/server";

const Home = async() => {

  const x = await caller.hello({ text: "Diwan Sachidu" });
  console.log(x);
  return (
    <div>
      <Button>Diwan Sachidu</Button>
    </div>
  );
}

export default Home
