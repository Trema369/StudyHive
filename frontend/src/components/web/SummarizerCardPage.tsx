import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FileDropzone } from './Dropzone';

export function SummarizerCardPage() {
    return (
        <div className="mt-40">
            <section className="mt-12 mb-10 text-center">
                <h1 className="text-4xl font-bold mb-5">AI Summarizer</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Generate quick note summays with ai using notes and images
                </p>
            </section>
            <section>
                <div className=" flex justify-center">
                    <Tabs defaultValue="files" className="w-200">
                        <TabsList>
                            <TabsTrigger value="files">Files</TabsTrigger>
                            <TabsTrigger value="long-text">
                                Long Text
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="files">
                            <FileDropzone></FileDropzone>
                        </TabsContent>
                        <TabsContent value="long-text">
                            <Card className="relative w-200 mx-auto h-80 p-4">
                                {/* Big Textbox */}
                                <CardContent className="h-full pb-16">
                                    <textarea
                                        className="w-full h-full resize-none outline-none focus:outline-none  text-white"
                                        placeholder="Enter your text here..."
                                    />
                                </CardContent>

                                {/* Upload Button */}
                                <div className="absolute bottom-4 right-4">
                                    <Button type="button">Upload</Button>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </section>
        </div>
    );
}
