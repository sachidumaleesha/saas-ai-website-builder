"use client";

import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";

import { useScroll } from "@/hooks/use-scroll";
import { dark } from "@clerk/themes";
import { useCurrentTheme } from "@/hooks/use-current-theme";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const isScrolled = useScroll();
  const currentTheme = useCurrentTheme();
  return (
    <nav className={cn("p-4 bg-transparent fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b border-transparent", isScrolled && "bg-background border-border")}>
      <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Vibe Coding" width={24} height={24} />
          <span className="text-lg font-semibold">Vibe</span>
        </Link>
        <SignedIn>
          <UserControl showName />
        </SignedIn>
        <SignedOut>
          <div className="flex items-center gap-2">
            <SignUpButton
              mode="modal"
              appearance={{
                baseTheme: currentTheme === "dark" ? dark : undefined,
                elements: { cardBox: "border! shadow-none! rounded-lg!" },
              }}
            >
              <Button variant="outline" size="sm">
                Sign Up
              </Button>
            </SignUpButton>
            <SignInButton
              mode="modal"
              appearance={{
                baseTheme: currentTheme === "dark" ? dark : undefined,
                elements: { cardBox: "border! shadow-none! rounded-lg!" },
              }}
            >
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>
    </nav>
  );
};
