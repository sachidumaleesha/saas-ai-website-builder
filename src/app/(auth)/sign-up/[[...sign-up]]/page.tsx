import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useCurrentTheme } from "@/hooks/use-current-theme";

export default function Page() {
  const currentTheme = useCurrentTheme();
  return (
    <SignUp
      appearance={{
        baseTheme: currentTheme === "dark" ? dark : undefined,
        elements: { cardBox: "border! shadow-none! rounded-lg!" },
      }}
    />
  );
}
