interface ImportMetaEnv {
	readonly VITE_COOKIE_DOMAIN: string;
	readonly VITE_REST_DOMAIN: string;
	readonly VITE_SITENAME: string;
	readonly VITE_SITENAME_SHORT: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}