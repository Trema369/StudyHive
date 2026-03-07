'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { getAuthUser } from '@/lib/auth'

import { Separator } from '@/components/ui/separator'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Home,
    MessageCircleQuestion,
    Globe,
    Layers,
    BookOpen,
    ChevronsLeft,
    ChevronsRight,
    MessageCircle,
    Zap,
    CircleQuestionMark,
} from 'lucide-react'

const navItems = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Q&A', href: '/qna', icon: MessageCircleQuestion },
    { label: 'Colonies', href: '/classes', icon: Globe },
    { label: 'Material', href: '/materials', icon: Layers },
    { label: 'Resources', href: '/resources', icon: BookOpen },
    { label: 'Messages', href: '/chats', icon: MessageCircle },
    { label: 'Flashcards', href: '/flashcards', icon: Zap },
    { label: 'Quizzes', href: '/quiz', icon: CircleQuestionMark },
]

export function Sidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [accountName, setAccountName] = useState('Guest')

    useEffect(() => {
        const syncAuth = () => {
            const user = getAuthUser()
            setAccountName(user?.username?.trim() || user?.email?.trim() || 'Guest')
        }
        syncAuth()
        window.addEventListener('auth-changed', syncAuth)
        window.addEventListener('storage', syncAuth)
        return () => {
            window.removeEventListener('auth-changed', syncAuth)
            window.removeEventListener('storage', syncAuth)
        }
    }, [])

    const initials = useMemo(() => {
        const parts = accountName
            .split(/\s+/)
            .map((x) => x.trim())
            .filter(Boolean)
        if (parts.length === 0) return 'GU'
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }, [accountName])

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    'relative flex h-screen flex-col',
                    'bg-background/80 backdrop-blur-md',
                    'border-r border-border',
                    'shadow-xl transition-all duration-300 ease-in-out',
                    collapsed ? 'w-[68px]' : 'w-[220px]',
                )}
            >
                <div className="flex h-[64px] items-center gap-3 overflow-hidden px-4 flex-shrink-0">
                    <Image
                        src="/icon.png"
                        alt="StudyHive icon"
                        width={502}
                        height={72}
                        className="h-8 w-8 flex-shrink-0 rounded-md"
                        priority
                    />
                    <h1
                        className={cn(
                            'text-2xl font-extrabold tracking-tight transition-all duration-200 whitespace-nowrap',
                            collapsed ? 'opacity-0 w-0' : 'opacity-100',
                        )}
                    >
                        <span className="text-yellow-400">Study</span>
                        <span className="text-black dark:text-white">Hive</span>
                    </h1>
                </div>

                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-2 pt-3">
                    {!collapsed && (
                        <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                            Navigation
                        </p>
                    )}

                    {navItems.map(({ label, href, icon: Icon }) => {
                        const isActive = pathname === href

                        const btn = (
                            <Button
                                key={label}
                                variant={isActive ? 'secondary' : 'ghost'}
                                asChild
                                className={cn(
                                    'w-full justify-start gap-3 px-3 mb-4 h-13',
                                    collapsed && 'justify-center px-0',
                                    isActive && 'font-semibold text-primary',
                                )}
                            >
                                <Link href={href}>
                                    <Icon
                                        className={cn(
                                            'h-[18px] w-[18px] flex-shrink-0',
                                            isActive ? 'text-primary' : 'text-muted-foreground',
                                        )}
                                    />
                                    {!collapsed && <span>{label}</span>}
                                </Link>
                            </Button>
                        )

                        return collapsed ? (
                            <Tooltip key={label}>
                                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                                <TooltipContent side="right">{label}</TooltipContent>
                            </Tooltip>
                        ) : (
                            btn
                        )
                    })}
                </nav>

                <Separator />

                <div className="flex-shrink-0 p-2 pb-4">
                    <div
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2',
                            'border border-border bg-muted/40',
                            'transition-all duration-200 overflow-hidden',
                            collapsed &&
                            'justify-center px-0 border-transparent bg-transparent',
                        )}
                    >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-sky-500 text-white font-bold text-xs">
                            {initials}
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden">
                                <p className="truncate text-sm font-medium leading-tight">
                                    {accountName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    Signed in
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3.5 top-1/2 z-20 h-7 w-7 -translate-y-1/2 rounded-full shadow-md"
                    aria-label="Toggle sidebar"
                >
                    {collapsed ? (
                        <ChevronsRight className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronsLeft className="h-3.5 w-3.5" />
                    )}
                </Button>
            </aside>
        </TooltipProvider>
    )
}
