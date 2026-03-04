"use client";
import { useState } from "react";
import { AuthCard } from "./AuthCard";
import { AIChatPopup } from "./ai-chat-popup";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
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
      {/* Left Section */}
      <div className="flex-1">
        <Link href="/">
          <h1 className="text-3xl font-bold">
            <span className="text-blue-500">Study</span>
            <span className="text-orange-500">Hive</span>
          </h1>
        </Link>
      </div>

      {/* Center Section */}
      <div className="flex-1 flex justify-center gap-8">
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
        <Button variant="ghost" onClick={() => setAiOpen(true)}>
          Hive AI
        </Button>
      </div>

      {/* Right Section */}
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
