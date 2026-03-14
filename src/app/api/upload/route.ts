import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to Google Drive
    const driveFile = await uploadFileToDrive(
      buffer,
      file.name,
      file.type
    );

    return NextResponse.json({
      success: true,
      fileId: driveFile.id,
      fileName: driveFile.name,
      webViewLink: driveFile.webViewLink,
      webContentLink: driveFile.webContentLink,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
