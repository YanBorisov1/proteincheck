import type { MessageKey } from './locales/en';

export type { MessageKey };
export type Messages = Partial<Record<MessageKey, string>>;
export type Params = Record<string, string | number>;
export type TFunction = (key: MessageKey | (string & {}), params?: Params) => string;
