"use client";
import { useState } from "react";
import { AuthCard } from "./AuthCard";
import { AIChatPopup } from "./ai-chat-popup";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";
export function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  return (
    <nav
      className="fixed top-0 w-full px-6 py-3 
           flex items-center justify-between
           backdrop-blur-md
           bg-white/60 dark:bg-[#0a0a0a]/40
           border-b border-gray-300 dark:border-[#262626]
           shadow-lg z-50"
    >
      <div className="flex-1">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/light.png"
            alt="StudyHive"
            width={500}
            height={76}
            className="h-12 w-auto dark:hidden"
            priority
          />
          <Image
            src="/dark.png"
            alt="StudyHive"
            width={500}
            height={76}
            className="hidden h-12 w-auto dark:block"
            priority
          />
        </Link>
      </div>

      <div className="flex-1 hidden justify-center gap-4 lg:flex xl:gap-8">
        <Link
          className={buttonVariants({ variant: "ghost" })}
          href="/contribute"
        >
          Contribute
        </Link>
        <Link className={buttonVariants({ variant: "ghost" })} href="/coaching">
          Coaching
        </Link>
        <Link
          className={buttonVariants({ variant: "ghost" })}
          href="/leaderboard"
        >
          Leaderboard
        </Link>
        <Link className={buttonVariants({ variant: "ghost" })} href="/classes">
          Colonies
        </Link>
        {/* TODO Create an actual dedicated page for the AI stuff but fo rn it can just bring up the popup */}
        <Link className={buttonVariants({ variant: "ghost" })} href="/chats">
          Chats
        </Link>
        <Button variant="ghost" onClick={() => setAiOpen(true)}>
          Hive AI
        </Button>
      </div>

      <div className="flex-1 flex justify-end items-center gap-2">
        <Button variant="outline" onClick={() => setAiOpen(true)}>
          AI
        </Button>
        <Button variant="outline" onClick={() => setAuthOpen(true)}>
          Get started
        </Button>
        <AuthCard open={authOpen} setOpen={setAuthOpen} />
        <AIChatPopup open={aiOpen} setOpen={setAiOpen} />
        <ThemeToggle />
      </div>
    </nav>
  );
}
