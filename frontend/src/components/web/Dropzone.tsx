'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export function FileDropzone() {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        console.log(acceptedFiles);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
    });

    return (
        <Card
            {...getRootProps()}
            className={`relative cursor-pointer border-2 border-dashed transition
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-muted'} w-full max-w-4xl mx-auto h-80`}
        >
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <Upload className="w-10 h-10 mb-4" />
                <input {...getInputProps()} />
                {isDragActive ? (
                    <p>Drop the files here...</p>
                ) : (
                    <p>Drag & drop files here, or click to select</p>
                )}
            </CardContent>

            <div className="absolute bottom-4 right-4">
                <Button type="button">Upload</Button>
            </div>
        </Card>
    );
}
