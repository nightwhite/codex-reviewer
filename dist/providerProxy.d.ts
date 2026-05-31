export type ProxyRequestInput = {
    upstreamBaseUrl: string;
    apiKey: string;
    path: string;
};
export type ProxyRequestOptions = {
    url: string;
    headers: Record<string, string>;
};
export type ProviderProxy = {
    baseUrl: string;
    close: () => Promise<void>;
};
export declare function createProxyRequestOptions(input: ProxyRequestInput): ProxyRequestOptions;
export declare function startProviderProxy(input: {
    upstreamBaseUrl: string;
    apiKey: string;
}): Promise<ProviderProxy>;
