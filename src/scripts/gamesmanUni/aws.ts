import express, { Request, Response } from 'express';
import AWS from 'aws-sdk';

import { getCurrentInstance } from 'vue';

export function useCurrentApp() {
  return getCurrentInstance()?.appContext.app;
}

const app = express();
const s3 = new AWS.S3();

app.use(express.json());

app.post('/api/get-presigned-url', async (req: Request, res: Response) => {
  const { filename, filetype } = req.body;

  const params = {
    Bucket: 'videosgc-bucket',
    Key: filename,
    Expires: 60, // URL expiry time in seconds
    ContentType: filetype,
  };

  try {
    const url = await s3.getSignedUrlPromise('putObject', params);
    res.json({ url });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Error generating pre-signed URL' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
