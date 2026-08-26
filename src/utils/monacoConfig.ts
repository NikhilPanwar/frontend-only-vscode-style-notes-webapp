import { loader } from '@monaco-editor/react';

// Pin Monaco Editor loader to a stable, tested version (0.45.0)
// This prevents jsdelivr 0.55.x worker chunk hash mismatch / importScripts network failures
loader.config({
  paths: {
    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs',
  },
});
