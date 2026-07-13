type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

interface NativeConnection {
  readonly state: 'open' | 'reconnecting' | 'failed' | 'closed'
  send(payload: JsonValue): Promise<void>
  onMessage(listener: (payload: JsonValue) => void): () => void
  onStateChange(listener: (state: NativeConnection['state']) => void): () => void
  close(): void
}

interface MyWallpaperLayerApi {
  readonly root: HTMLElement
  readonly settings: {
    get(): Record<string, JsonValue>
    subscribe(listener: (settings: Record<string, JsonValue>) => void): () => void
  }
  readonly lifecycle: { onDispose(listener: () => void): () => void }
  readonly native: {
    readonly companion: {
      readonly available: boolean
      connect(): Promise<NativeConnection>
    }
  }
  setPointerEvents(value: 'none' | 'auto'): void
}

interface Window {
  MyWallpaper: { layer: MyWallpaperLayerApi }
}
