'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFile, Attachment } from '@/lib/uploads';

type FileDropzoneProps = {
    onUploadComplete: (attachments: Attachment[]) => void;
};

export function FileDropzone({ onUploadComplete }: FileDropzoneProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE!;

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(acceptedFiles);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
    });

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);

        try {
            const results = await Promise.all(
                files.map((file) => uploadFile(apiBase, file))
            );

            onUploadComplete(results); // 🔥 send to parent
            setFiles([]);
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card
            {...getRootProps()}
            className={cn(
                'relative cursor-pointer border-2 border-dashed transition-colors duration-200',
                'w-full max-w-4xl mx-auto h-80 flex items-center justify-center',
                isDragActive ? 'border-primary bg-secondary/50' : 'border-muted'
            )}
        >
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mb-4 text-muted-foreground" />

                {files.length > 0 ? (
                    <div>
                        <p className="font-medium">
                            {files.length} file(s) selected
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2">
                            {files.map((file, i) => (
                                <li key={i}>{file.name}</li>
                            ))}
                        </ul>
                    </div>
                ) : isDragActive ? (
                    <p className="text-lg font-medium text-primary">
                        Drop the files here...
                    </p>
                ) : (
                    <div className="space-y-1">
                        <p className="text-lg font-medium">
                            Drag & drop files here, or click to select
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Supports images, PDFs, and spreadsheets
                        </p>
                    </div>
                )}
            </CardContent>

            <div className="absolute bottom-4 right-4">
                <Button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUpload();
                    }}
                    disabled={isUploading || files.length === 0}
                >
                    {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
            </div>
        </Card>
    );
}
