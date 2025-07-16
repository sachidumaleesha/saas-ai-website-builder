"use client";

import Image from "next/image";

import { PricingTable } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useCurrentTheme } from "@/hooks/use-current-theme";

const Page = () => {
  const currentTheme = useCurrentTheme();
  return (
    <div className="flex flex-col max-w-5xl mx-auto w-full">
      <section className="space-y-6 pt-[16vh] 2xl:pt-48">
        <div className="flex flex-col items-center space-y-2">
          <Image
            src="/logo.svg"
            alt="Vibe Coding"
            width={50}
            height={50}
            className="hidden md:block"
          />
          <h1 className="text-xl md:text-3xl font-bold text-center">Pricing</h1>
          <p className="text-sm md:text-base text-muted-foreground text-center">
            Choose the plan that best fits your needs
          </p>
        </div>
        <PricingTable
          appearance={{
            baseTheme: currentTheme === "dark" ? dark : undefined,
            elements: { pricingTableCard: "border! shadow-none! rounded-lg!" },
          }}
        />
      </section>
    </div>
  );
};

export default Page;
