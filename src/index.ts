export interface FlagBridgeConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FlagBridge {
  private config: FlagBridgeConfig;

  constructor(config: FlagBridgeConfig) {
    this.config = {
      baseUrl: "https://api.flagbridge.io",
      ...config,
    };
  }

  async getBooleanValue(flagKey: string, defaultValue: boolean): Promise<boolean> {
    // TODO: implement flag evaluation
    return defaultValue;
  }

  async getStringValue(flagKey: string, defaultValue: string): Promise<string> {
    // TODO: implement flag evaluation
    return defaultValue;
  }

  async getNumberValue(flagKey: string, defaultValue: number): Promise<number> {
    // TODO: implement flag evaluation
    return defaultValue;
  }
}
