'use client'
import { useState } from 'react'
import { AuthCard } from './AuthCard'
import { AIChatPopup } from './ai-chat-popup'
import { Button, buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

export function Navbar() {
    const [authOpen, setAuthOpen] = useState(false)
    const [aiOpen, setAiOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <>
            <nav
                className="fixed top-0 w-full px-4 sm:px-6 py-3 
               flex items-center justify-between
               backdrop-blur-md
               bg-white/60 dark:bg-[#0a0a0a]/40
               border-b border-gray-300 dark:border-[#262626]
               shadow-lg z-50"
            >
                {/* Logo */}
                <div className="flex-1">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <Image
                            src="/icon.png"
                            alt="StudyHive icon"
                            width={500}
                            height={76}
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-md"
                            priority
                        />
                        <h1 className="text-2xl sm:text-3xl font-extrabold">
                            <span className="text-yellow-400">Study</span>
                            <span className="text-black dark:text-white">Hive</span>
                        </h1>
                    </Link>
                </div>

                {/* Desktop center links */}
                <div className="flex-1 hidden justify-center gap-4 lg:flex xl:gap-8">
                    <Link
                        className={buttonVariants({ variant: 'ghost' })}
                        href="/contribute"
                    >
                        Contribute
                    </Link>
                    <Link className={buttonVariants({ variant: 'ghost' })} href="/coaching">
                        Coaching
                    </Link>
                    <Link className={buttonVariants({ variant: 'ghost' })} href="/hive-ai">
                        Hive AI
                    </Link>
                </div>

                {/* Right side */}
                <div className="flex-1 flex justify-end items-center gap-2">
                    {/* Desktop buttons */}
                    <div className="hidden sm:flex items-center gap-2">
                        <Button variant="outline" onClick={() => setAiOpen(true)}>
                            AI
                        </Button>
                        <Button variant="outline" onClick={() => setAuthOpen(true)}>
                            Get started
                        </Button>
                    </div>
                    <ThemeToggle />
                    {/* Mobile hamburger */}
                    <button
                        className="lg:hidden p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                <AuthCard open={authOpen} setOpen={setAuthOpen} />
                <AIChatPopup open={aiOpen} setOpen={setAiOpen} />
            </nav>

            {/* Mobile dropdown menu */}
            {menuOpen && (
                <div
                    className="fixed top-[57px] left-0 w-full z-40
                    bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md
                    border-b border-gray-300 dark:border-[#262626]
                    shadow-lg lg:hidden
                    flex flex-col px-4 py-4 gap-2"
                >
                    <Link
                        className={buttonVariants({ variant: 'ghost' })}
                        href="/contribute"
                        onClick={() => setMenuOpen(false)}
                    >
                        Contribute
                    </Link>
                    <Link
                        className={buttonVariants({ variant: 'ghost' })}
                        href="/coaching"
                        onClick={() => setMenuOpen(false)}
                    >
                        Coaching
                    </Link>
                    <Link
                        className={buttonVariants({ variant: 'ghost' })}
                        href="/hive-ai"
                        onClick={() => setMenuOpen(false)}
                    >
                        Hive AI
                    </Link>
                    <hr className="border-gray-200 dark:border-[#262626] my-1" />
                    <Button
                        variant="outline"
                        onClick={() => {
                            setAiOpen(true)
                            setMenuOpen(false)
                        }}
                    >
                        AI
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setAuthOpen(true)
                            setMenuOpen(false)
                        }}
                    >
                        Get started
                    </Button>
                </div>
            )}
        </>
    )
}
