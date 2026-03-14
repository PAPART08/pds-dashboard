import { google } from 'googleapis';
import { Readable } from 'stream';

// Credentials should be provided via environment variables
// GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: The entire JSON key file content
// GOOGLE_DRIVE_FOLDER_ID: The ID of the folder where files will be uploaded

const getDriveClient = () => {
  const credentialsJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is not defined in environment variables');
  }

  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
};

export async function uploadFileToDrive(
  file: Buffer | Uint8Array,
  fileName: string,
  mimeType: string
) {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not defined in environment variables');
  }

  // Convert Buffer to Readable Stream
  const bufferStream = new Readable();
  bufferStream.push(file);
  bufferStream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType,
      body: bufferStream,
    },
    fields: 'id, name, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  return response.data;
}

export async function deleteFileFromDrive(fileId: string) {
  const drive = getDriveClient();
  await drive.files.delete({
    fileId: fileId,
  });
}

export async function getFileMetadata(fileId: string) {
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, webViewLink, webContentLink, mimeType',
  });
  return response.data;
}
