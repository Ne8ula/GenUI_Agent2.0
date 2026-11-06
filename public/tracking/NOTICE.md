# Local tracking assets

Owner-approved acquisition for increment 2B on 2026-10-30. These are third-party inference assets, not generated room assets. They are served from this application's origin; the application must not fetch them from a CDN or upload camera frames.

## MediaPipe Tasks Vision 0.10.32

- Package: `@mediapipe/tasks-vision@0.10.32`, Apache-2.0; Copyright The MediaPipe Authors.
- Official package: https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-0.10.32.tgz
- npm integrity: `sha512-3tiAZnmKloYnRXYoO3dKltTUGnqeCwzC4lV03uY0vCsE+aveJTyEVQyZHOlQGQNsjK+gRHzkf9q08C99Qm2K0Q==`
- Package size: 23,601,614 bytes unpacked. Four runtime files copied unchanged from its `wasm/` directory to `mediapipe/0.10.32/`:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| vision_wasm_internal.js | 204816 | 6f6b86509cf9e163ea1cfec7edc8cf53732699c04781e4c21c557c1ba402310e |
| vision_wasm_internal.wasm | 11453626 | cb3ec20026a9aecc2a81a93c25630ceb5389297ddb7a5f0bd61dd09cde606b9b |
| vision_wasm_nosimd_internal.js | 204669 | 9f8fc960e363f0fb2f42f7937b97ae9cf9a5630490f71031fa90caa9bb121938 |
| vision_wasm_nosimd_internal.wasm | 10647962 | 924274fcd5ac8985f6570a8573e7971b7bd2d580ba1b8f3beb0ba8f95db6347c |

## Face Landmarker float16 v1

- Local path: `models/face_landmarker-float16-v1.task`.
- Official immutable-version source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- Size: 3,758,596 bytes. SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
- Download size and Google object's MD5 (`b0e7274907a1644404fef66b28dd6d85`) were checked during acquisition.
- Component model cards identify Apache License 2.0:
  - https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf
  - https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf
  - https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf
- Official overview: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/index

The Apache-2.0 license text is included in `licenses/apache-2.0/LICENSE.txt`. Original runtime license notices are retained. No asset modification is intended.
