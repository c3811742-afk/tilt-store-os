// Same keys as the source object, every value a string. Used to type a translation against English.
export type TextShape<T> = { [K in keyof T]: T[K] extends string ? string : TextShape<T[K]> };
