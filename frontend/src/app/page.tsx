import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center">
            <section className="w-full max-w-6xl px-6 py-35 flex items-start gap-10">
                <div className="flex items-start gap-12">
                    <div className="max-w-md">
                        <h1 className="text-3xl font-bold mb-2">
                            Learn and Understand with others through StudyHive.
                        </h1>
                        <p className="text-lg text-muted-foreground mb-10">
                            Create or join colonies to learn, share and teach with
                            others and expand your understanding and education.
                        </p>
                        <Link href="/auth">
                            <Button variant="outline" className="px-6 py-3">
                                Get Started
                            </Button>
                        </Link>
                    </div>

                    <div className="relative w-[300px] h-[300px] flex-shrink-0 mt-8 md:mt-0 px-4 sm:px-6">
                        <div className="absolute w-full h-full bg-white rounded-xl shadow-xl transform translate-x-8 translate-y-8 z-10 transition-all hover:translate-y-0 hover:translate-x-0 hover:z-30"></div>
                        <div className="absolute w-full h-full bg-white rounded-xl shadow-lg transform translate-x-4 translate-y-4 z-20 transition-all hover:translate-y-0 hover:translate-x-0 hover:z-30"></div>
                        <div className="absolute w-full h-full bg-white rounded-xl shadow-md z-30 transition-all hover:translate-y-0 hover:translate-x-0"></div>

                        {/* Content on top card */}
                        <div className="absolute top-6 left-6 z-40 p-6">
                            <h2 className="text-xl font-bold text-purple-800 mb-2">
                                Track Progress
                            </h2>
                            <p className="text-purple-700 text-sm">
                                Visualize your learning milestones and see your
                                improvement over time.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="w-full max-w-6xl px-6 py-20">
                <div>
                    <h3 className="text-center">
                        Find and discusses with student from all boards
                    </h3>
                </div>
            </section>
        </main>
    );
}
