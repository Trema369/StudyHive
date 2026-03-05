'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Attachment } from '@/lib/uploads';

import { FileDropzone } from '@/components/web/Dropzone';
import { useState } from 'react';

export default function Contribute() {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const handleUploadedFiles = async (files: Attachment[]) => {
        setAttachments((prev) => [...prev, ...files]);
    };

    return (
        <div className="">
            <section className="mt-30 mb-25">
                <h1 className="text-center text-4xl font-bold mb-2">
                    Contribute to our large collection
                </h1>
                <p className="text-lg text-center text-muted-foreground ">
                    Someone out there is searching for you document. Share
                    knowledge with everyone.
                </p>
            </section>

            <section>
                <div className="flex flex-col items-start w-full max-w-4xl mx-auto">
                    <FileDropzone onUploadComplete={handleUploadedFiles} />

                    {attachments.length > 0 && (
                        <div className="mt-6 text-sm">
                            <p className="font-medium mb-2">Uploaded Files:</p>
                            <ul className="space-y-1 text-muted-foreground">
                                {attachments.map((file, i) => (
                                    <li key={i}>{file.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </section>
            <section className="mt-15 mb-10">
                <p className="text-lg text-center text-muted-foreground mb-2">
                    Supported file types: pdf,txt,doc,ppt,xls,docx,md and many
                    more
                </p>

                <p className="text-lg text-center text-muted-foreground mb-10">
                    By uploading to us, you help out thousands of less fortunate
                    students
                </p>
            </section>
            <Separator className="max-w-4xl mx-auto mb-20 " />
            <section className="mb-30">
                <div>
                    <Card
                        style={{ backgroundColor: '#111111' }}
                        className=" max-w-4xl mx-auto p-6"
                    >
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col justify-center">
                                <h2 className="text-2xl font-semibold mb-3">
                                    What happens to uploaded files
                                </h2>
                                <p className="text-muted-foreground">
                                    Our plartform is designed to make learning
                                    resources accessible to any and every
                                    students around the world, hence making
                                    resources available for studends in all
                                    parts of the world
                                </p>
                            </div>
                            <div className="flex flex-col gap-4">
                                <Card
                                    style={{ backgroundColor: '#0e0e0e' }}
                                    className="p-4"
                                >
                                    <CardHeader>
                                        <CardTitle>Notes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>
                                            Notes are saved in and can be
                                            accessed in our Notes. Students are
                                            able to to donate to the uploader of
                                            the notes in the library as a form
                                            of thank u if they can.
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card
                                    style={{ backgroundColor: '#0e0e0e' }}
                                    className="p-4"
                                >
                                    <CardHeader>
                                        <CardTitle>Books</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>
                                            Books are saved in and can be
                                            accessed in our library. Students
                                            are able to to donate to the
                                            uploader of the book in the library
                                            as a form of thank u if they can.
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card
                                    style={{ backgroundColor: '#0e0e0e' }}
                                    className="p-4"
                                >
                                    <CardHeader>
                                        <CardTitle>Vedio Courses</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>
                                            Vedios are saved in and can be
                                            accessed in our Courses section.
                                            Students are able to to donate to
                                            the uploader of the video in the
                                            Courses section as a form of thank u
                                            if they can.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </Card>
                </div>
            </section>
            <section></section>
        </div>
    );
}
