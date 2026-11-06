import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { createRoomInterpretationHandler } from './src/server/room-interpretation.ts'
import { createSpeechHandler } from './src/server/speech.ts'
import { createInvestigationNarrationHandler } from './src/server/investigation-narration.ts'
import { createOpenAiPropReferenceImageHandler } from './src/server/prop-reference-image-openai.ts'
import { createPropMeshHandler } from './src/server/prop-mesh.ts'
import { createRoomPaintHandler } from './src/server/room-paint.ts'

function roomInterpretation(): Plugin {
  const handler = (port: number) => {
    const enabled = process.env.EVA_ENABLE_ROOM_INTERPRETATION === '1'
    return createRoomInterpretationHandler({
      origin: `http://127.0.0.1:${port}`,
      enabled,
      apiKey: enabled ? process.env.EVA_ANTHROPIC_API_KEY : undefined,
    })
  }
  return {
    name: 'local-room-interpretation',
    configureServer(server) { server.middlewares.use(handler(5173)) },
    configurePreviewServer(server) { server.middlewares.use(handler(4173)) },
  }
}

function speech(): Plugin {
  const handler = (port: number) => {
    const enabled = process.env.EVA_ENABLE_SPEECH === '1'
    const privacyConfirmed = process.env.EVA_SPEECH_PRIVACY_CONFIRMED === '1'
    const permitted = enabled && privacyConfirmed
    return createSpeechHandler({
      origin: `http://127.0.0.1:${port}`,
      enabled,
      privacyConfirmed,
      apiKey: permitted ? process.env.EVA_ELEVENLABS_API_KEY : undefined,
      voiceId: permitted ? process.env.EVA_ELEVENLABS_VOICE_ID : undefined,
    })
  }
  return {
    name: 'local-speech',
    configureServer(server) { server.middlewares.use(handler(5173)) },
    configurePreviewServer(server) { server.middlewares.use(handler(4173)) },
  }
}

function investigationNarration(): Plugin {
  const handler = (port: number) => {
    const enabled = process.env.EVA_ENABLE_INVESTIGATION_NARRATION === '1'
    return createInvestigationNarrationHandler({
      origin: `http://127.0.0.1:${port}`,
      enabled,
      apiKey: enabled ? process.env.EVA_ANTHROPIC_API_KEY : undefined,
    })
  }
  return {
    name: 'local-investigation-narration',
    configureServer(server) { server.middlewares.use(handler(5173)) },
    configurePreviewServer(server) { server.middlewares.use(handler(4173)) },
  }
}

function propReferenceImage(): Plugin {
  // One reference store per server; the mesh handler reads only that server's local references.
  const handlers = (port: number) => {
    // A BFL spending confirmation must not authorise a different provider's pricing.
    const images = createOpenAiPropReferenceImageHandler({
      origin: `http://127.0.0.1:${port}`,
      enabled: process.env.EVA_ENABLE_PROP_REFERENCE_IMAGE === '1',
      spendingConfirmed: process.env.EVA_OPENAI_IMAGE_SPENDING_CONFIRMED === '1',
      getApiKey: () => process.env.EVA_OPENAI_IMAGE_API_KEY,
    })
    const meshes = createPropMeshHandler({
      origin: `http://127.0.0.1:${port}`,
      enabled: process.env.EVA_ENABLE_PROP_MESH === '1',
      spendingConfirmed: process.env.EVA_PROP_MESH_SPENDING_CONFIRMED === '1',
      getApiKey: () => process.env.EVA_MESHY_API_KEY,
      readReference: id => images.readReference(id),
    })
    return [images, meshes]
  }
  return {
    name: 'local-prop-reference-image',
    configureServer(server) { for (const handler of handlers(5173)) server.middlewares.use(handler) },
    configurePreviewServer(server) { for (const handler of handlers(4173)) server.middlewares.use(handler) },
  }
}

function roomPaint(): Plugin {
  const handler = (port: number) => createRoomPaintHandler({
    origin: `http://127.0.0.1:${port}`,
    enabled: process.env.EVA_ENABLE_ROOM_PAINT === '1',
    spendingConfirmed: process.env.EVA_ROOM_PAINT_SPENDING_CONFIRMED === '1',
    getApiKey: () => process.env.EVA_WORLDLABS_API_KEY,
  })
  return {
    name: 'local-room-paint',
    configureServer(server) { server.middlewares.use(handler(5173)) },
    configurePreviewServer(server) { server.middlewares.use(handler(4173)) },
  }
}

export default defineConfig({
  plugins: [react(), roomInterpretation(), speech(), investigationNarration(), propReferenceImage(), roomPaint()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
})
