export function createDemoApi(storage: {
  load: () => Promise<string | null>;
  save: (serialized: string) => Promise<void>;
}): (route: string, token?: string, input?: object) => Promise<unknown>;
