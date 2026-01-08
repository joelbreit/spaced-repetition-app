import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const polly = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (event) => {
  try {
    // Parse request body
    const {
      text,
      OutputFormat = 'mp3',
      VoiceId = 'Joanna', // US female voice - can be customized
      Engine = 'neural', // Higher quality voice
      TextType = 'text'
    } = JSON.parse(event.body);

    if (!text) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    // Call Polly to synthesize speech
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat,
      VoiceId,
      Engine,
      TextType
    });

    const response = await polly.send(command);
    const audioStream = response.AudioStream;

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Return audio as base64-encoded MP3
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: audioBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error synthesizing speech:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to synthesize speech',
        message: error.message
      })
    };
  }
};
