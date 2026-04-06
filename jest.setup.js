// Eagerly resolve all lazy globals installed by expo/src/winter/runtime.native.ts
// so they don't get triggered after Jest's test-code scope window has closed.
// See: https://github.com/expo/expo/issues/xxxxx
const lazyGlobals = [
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
  '__ExpoImportMetaRegistry',
  'structuredClone',
];
for (const name of lazyGlobals) {
  // Accessing the property triggers the lazy getter, resolving it synchronously
  // while we are still inside Jest's setup scope.
  void globalThis[name];
}
